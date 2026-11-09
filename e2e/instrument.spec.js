import { test, expect } from './fixture.js';

test('joystick changes the sounding oscillator notes and restores them', async ({ page }) => {
  await page.addInitScript(() => {
    window.playedFrequencies = [];
    window.AudioContext = class {
      currentTime = 0; sampleRate = 100; destination = {};
      resume() {} close() {}
      createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
      createConvolver() { return { connect() {} }; }
      createAnalyser() { return { connect() {}, fftSize: 2048, frequencyBinCount: 1024, getByteTimeDomainData(data) { data.fill(128); }, getByteFrequencyData(data) { data.fill(0); } }; }
      createOscillator() { const osc = { frequency: {}, connect: gain => gain, start: () => window.playedFrequencies.push(osc.frequency.value), stop() {} }; return osc; }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
    };
  });
  await page.goto('/');
  await page.keyboard.down('1');
  await page.keyboard.down('ArrowUp');
  await page.keyboard.up('ArrowUp');
  const notes = await page.evaluate(() => window.playedFrequencies.map(f => Math.round(69 + 12 * Math.log2(f / 440))));
  expect(notes).toEqual([60, 64, 67, 60, 63, 67, 60, 64, 67]);
  await page.keyboard.up('1');
});

test('joystick arrows update and restore a sustained chord', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.down('1');
  await page.keyboard.down('ArrowUp');
  await expect(page.locator('.screen strong')).toHaveText('Cm');
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('.screen strong')).toHaveText('C maj7');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('pointer joystick changes a held chord and centers on release', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.down('1');
  const joystick = page.getByLabel('CHORD JOYSTICK', { exact: true });
  await joystick.scrollIntoViewIfNeeded();
  const box = await joystick.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
  await expect(page.locator('.screen strong')).toHaveText('C maj7');
  await page.mouse.up();
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('1');
});

test('opposing keyboard arrows cancel on each axis and restore the remaining direction', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.down('1');
  for (const [first, second, firstChord, secondChord] of [
    ['ArrowUp', 'ArrowDown', 'Cm', 'C 6'],
    ['ArrowDown', 'ArrowUp', 'C 6', 'Cm'],
    ['ArrowLeft', 'ArrowRight', 'C sus4', 'C maj7'],
    ['ArrowRight', 'ArrowLeft', 'C maj7', 'C sus4'],
  ]) {
    await page.keyboard.down(first);
    await expect(page.locator('.screen strong')).toHaveText(firstChord);
    await page.keyboard.down(second);
    await expect(page.locator('.screen strong')).toHaveText('C');
    await page.keyboard.up(first);
    await expect(page.locator('.screen strong')).toHaveText(secondChord);
    await page.keyboard.up(second);
    await expect(page.locator('.screen strong')).toHaveText('C');
  }
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowDown');
  await page.keyboard.down('ArrowRight');
  await expect(page.locator('.screen strong')).toHaveText('C maj7');
  await page.keyboard.down('ArrowLeft');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('.screen strong')).toHaveText('Cm');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('1');
});

test('diagonal keyboard directions combine and release to remaining arrow', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.down('1');
  for (const [vertical, horizontal, name, remaining] of [
    ['ArrowUp', 'ArrowRight', 'Cm maj7', 'Cm'], ['ArrowUp', 'ArrowLeft', 'C sus2', 'Cm'],
    ['ArrowDown', 'ArrowLeft', 'C sus4 6', 'C 6'], ['ArrowDown', 'ArrowRight', 'C maj7 6', 'C 6'],
  ]) {
    await page.keyboard.down(vertical);
    await page.keyboard.down(horizontal);
    await expect(page.locator('.screen strong')).toHaveText(name);
    await page.keyboard.up(horizontal);
    await expect(page.locator('.screen strong')).toHaveText(remaining);
    await page.keyboard.up(vertical);
    await expect(page.locator('.screen strong')).toHaveText('C');
  }
  await page.keyboard.up('1');
});

test('diagonal pointer and touch directions update and return to center', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.down('1');
  const joystick = page.getByLabel('CHORD JOYSTICK', { exact: true });
  await joystick.scrollIntoViewIfNeeded();
  let box = await joystick.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (const [x, y, name] of [[0.2, 0.2, 'C sus2'], [0.8, 0.2, 'Cm maj7'], [0.2, 0.8, 'C sus4 6'], [0.8, 0.8, 'C maj7 6']]) {
    box = await joystick.boundingBox();
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
    await expect(page.locator('.screen strong')).toHaveText(name);
  }
  await page.mouse.up();
  await expect(page.locator('.screen strong')).toHaveText('C');
  await joystick.scrollIntoViewIfNeeded();
  box = await joystick.boundingBox();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * 0.2, y: box.y + box.height * 0.2 }] });
  await expect(page.locator('.screen strong')).toHaveText('C sus2');
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * 0.8, y: box.y + box.height * 0.8 }] });
  await expect(page.locator('.screen strong')).toHaveText('C maj7 6');
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('1');
});

test('assigned arrow remains a chord binding instead of a joystick direction', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY CHORD ii', exact: true }).click({ button: 'right' });
  await expect(page.getByRole('dialog', { name: 'BIND CHORD ii' })).toBeVisible();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', { name: 'PLAY CHORD ii', exact: true }).locator('small')).toHaveText('ARROWUP');
  await page.reload();
  await expect(page.getByRole('button', { name: 'PLAY CHORD ii', exact: true }).locator('small')).toHaveText('ARROWUP');
  await page.keyboard.down('ArrowUp');
  await expect(page.locator('.screen strong')).toHaveText('Dm');
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('plays and releases a chord with the keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Ready to play')).toBeVisible();
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('C');
  expect(await page.evaluate(() => document.querySelector('.pad.active') !== null)).toBe(true);
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('right-click assigns a key and persists it after reload', async ({ page }) => {
  await page.goto('/');
  const pad = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  await pad.click({ button: 'right' });
  await expect(page.getByRole('dialog', { name: 'BIND CHORD I' })).toBeVisible();
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await page.keyboard.press('a');
  await expect(pad.locator('small')).toHaveText('A');
  await page.reload();
  await expect(pad.locator('small')).toHaveText('A');
  await page.keyboard.down('a');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('a');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await page.keyboard.up('1');
});

test('supports binding Space as a keyboard key', async ({ page }) => {
  await page.goto('/');
  const pad = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  await pad.click({ button: 'right' });
  await page.keyboard.press('Space');
  await expect(pad.locator('small')).toHaveText('SPACE');
  await page.keyboard.down('Space');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('Space');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('a duplicate key unbinds the previous chord', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  const second = page.getByRole('button', { name: 'PLAY CHORD ii', exact: true });
  await second.click({ button: 'right' });
  await page.keyboard.press('1');
  await expect(first.locator('small')).toHaveText('—');
  await expect(second.locator('small')).toHaveText('1');
  await page.reload();
  await expect(first.locator('small')).toHaveText('—');
  await expect(second.locator('small')).toHaveText('1');
  await page.keyboard.down('1');
  await expect(page.locator('.screen strong')).toHaveText('Dm');
  await page.keyboard.up('1');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('changes the key and chord color for pointer play', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'KEY', exact: true }).selectOption('2');
  await page.getByRole('combobox', { name: 'Chord color' }).selectOption('seventh');
  const pad = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.locator('.screen strong')).toHaveText('D maj7');
  await page.mouse.up();
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});
