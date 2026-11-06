import { test, expect } from './fixture.js';

test.use({ hasTouch: true });

for (const input of ['mouse', 'touch']) {
  test(`${input} release follows independent joystick sustain`, async ({ page, context }) => {
    await page.goto('/');
    const stick = page.getByRole('application', { name: 'Chord joystick' });
    const toggle = page.getByRole('button', { name: 'Sustain joystick' });
    const status = page.locator('#joystick-status');
    const chordSustain = page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true });
    const cdp = input === 'touch' ? await context.newCDPSession(page) : null;
    const drag = async () => {
      await stick.scrollIntoViewIfNeeded();
      const box = await stick.boundingBox();
      const x = box.x + box.width * 0.85, y = box.y + box.height / 2;
      if (cdp) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
      }
    };
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await drag();
    await expect(status).toHaveText('CENTER');
    await toggle.click();
    await expect(chordSustain).toHaveAttribute('aria-pressed', 'false');
    await drag();
    await expect(status).toHaveText('RIGHT');
    await toggle.click();
    await expect(status).toHaveText('CENTER');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await drag();
    await expect(status).toHaveText('CENTER');
  });
}

test('keyboard arrows still return to center with joystick sustain enabled', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sustain joystick' }).click();
  await page.keyboard.down('ArrowUp');
  await expect(page.locator('#joystick-status')).toHaveText('UP');
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#joystick-status')).toHaveText('CENTER');
});
