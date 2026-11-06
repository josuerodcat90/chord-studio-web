import { test, expect } from './fixture.js';

test('turning everything off preserves settings and saved choices', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  await page.getByLabel('Theme').selectOption('sky');
  await page.getByRole('button', { name: 'PLAY CHORD I', exact: true }).click({ button: 'right' });
  await page.keyboard.press('q');
  for (const [label, value] of [['KEY','2'], ['VOICE','Bright'], ['CHORD COLOR','seventh'], ['VOLUME','0.2'], ['Reverb','hall']]) {
    if (label === 'VOLUME') await page.getByLabel(label).fill(value);
    else await page.getByLabel(label).selectOption(value);
  }
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.press('q');
  await page.keyboard.down('2');
  await page.getByRole('button', { name: 'Sustain joystick' }).click();
  await page.keyboard.down('ArrowUp');
  await page.getByRole('button', { name: 'Turn Everything Off' }).click();
  await expect(page.getByLabel('Theme')).toHaveValue('sky');
  for (const [label, value] of [['KEY','2'], ['VOICE','Bright'], ['CHORD COLOR','seventh'], ['VOLUME','0.2'], ['Reverb','hall']]) await expect(page.getByLabel(label)).toHaveValue(value);
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await expect(page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Sustain joystick' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#joystick-status')).toHaveText('CENTER');
  await page.keyboard.up('2'); await page.keyboard.up('ArrowUp');
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await page.reload();
  await expect(page.getByLabel('Theme')).toHaveValue('sky');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
  await page.keyboard.down('q');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.keyboard.up('q');
});
