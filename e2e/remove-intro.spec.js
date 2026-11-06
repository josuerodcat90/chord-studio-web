import { test, expect } from './fixture.js';

for (const [name, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 320, height: 568 }]]) {
  test(`intro and footer are absent and instrument remains visible on ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    for (const text of [
      'YOUR BROWSER INSTRUMENT', 'Find your', 'sound.',
      'A little instrument for big ideas. Pick a key, hold a chord, and see where it takes you.',
      'NO EXPERIENCE NEEDED', 'Just press', 'and play',
      'AN INSTRUMENT FOR EVERYONE.', 'TAKE A MOMENT. MAKE A SOUND. ♫',
    ]) {
      await expect(page.getByText(text, { exact: false })).toHaveCount(0);
    }
    await expect(page.getByRole('region', { name: 'Chord instrument' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PLAY CHORD I', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start guided tour' })).toBeVisible();
  });
}
