import { test, expect } from './fixture.js';

test('dragging from a chord plays entered pads and releases the physical hold', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  const second = page.getByRole('button', { name: 'PLAY CHORD ii', exact: true });
  await first.scrollIntoViewIfNeeded();
  const a = await first.boundingBox(), b = await second.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await expect(page.locator('.screen strong')).toHaveText('Dm');
  await expect(first).not.toHaveClass(/active/);
  await expect(second).toHaveClass(/active/);
  await page.mouse.up();
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  await expect(second).not.toHaveClass(/active/);
});

test('touch drag switches chords and releases on touch end', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  const second = page.getByRole('button', { name: 'PLAY CHORD ii', exact: true });
  await first.scrollIntoViewIfNeeded();
  const a = await first.boundingBox(), b = await second.boundingBox();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x + a.width / 2, y: a.y + a.height / 2 }] });
  await expect(page.locator('.screen strong')).toHaveText('C');
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
  await expect(page.locator('.screen strong')).toHaveText('Dm');
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});

test('dragging honors sustain and other held inputs, but cannot start outside a pad', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'PLAY CHORD I', exact: true });
  const second = page.getByRole('button', { name: 'PLAY CHORD ii', exact: true });
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await page.keyboard.down('3');
  await first.scrollIntoViewIfNeeded();
  const a = await first.boundingBox(), b = await second.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await expect(first).toHaveClass(/active/);
  await expect(second).toHaveClass(/active/);
  await page.mouse.up();
  await expect(second).not.toHaveClass(/active/);
  await expect(first).toHaveClass(/active/);
  await page.keyboard.up('3');
  await expect(page.locator('.screen strong')).toHaveText('C');
  await page.getByRole('button', { name: 'SUSTAIN CHORD I', exact: true }).click();
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
  const outside = await page.locator('.chord-header').boundingBox();
  await page.mouse.move(outside.x + 2, outside.y + 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.up();
  await expect(page.locator('.screen strong')).toHaveText('READY TO PLAY');
});
