import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 800 }, { width: 320, height: 568 }]) {
  test(`dedicated pitch tour highlights the control and supports navigation at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const tour = page.getByRole('dialog', { name: 'Guided tour' });
    const next = tour.getByRole('button', { name: 'Next' });
    const observed = [];
    while (await next.isVisible()) {
      const title = await tour.getByRole('heading').textContent();
      observed.push({ title, target: await page.evaluate(() => {
        const spot = document.querySelector('.tour-spotlight').getBoundingClientRect();
        return [...document.querySelectorAll('.controls, .pads, .pad-group .sustain, .chord-header, .joystick-control, .pitch-bend, .visualizer, .reset-actions')].filter(el => {
          const r = el.getBoundingClientRect();
          return Math.abs(Math.max(0, r.left) - spot.left) < 2 && Math.abs(Math.max(0, r.top) - spot.top) < 2 && Math.abs(Math.min(innerWidth, r.right) - spot.right) < 2 && Math.abs(Math.min(innerHeight, r.bottom) - spot.bottom) < 2;
        }).map(el => el.className);
      }) });
      if (title === 'PITCH BEND') break;
      await next.click();
    }
    console.log('Visible tour steps and targets:', JSON.stringify(observed));
    await expect(tour.getByRole('heading')).toHaveText('PITCH BEND');
    await expect(tour).toContainText('2 SEMITONES');
    await expect(tour).toContainText('CENTER');
    await expect(tour).toContainText('RESET PITCH BEND');
    await expect(tour).toContainText('SOUNDING CHORDS');
    await expect.poll(async () => page.evaluate(() => {
      const target = document.querySelector('.pitch-bend').getBoundingClientRect();
      const spot = document.querySelector('.tour-spotlight').getBoundingClientRect();
      const card = document.querySelector('.tour-panel').getBoundingClientRect();
      const slider = document.querySelector('.pitch-bend input').getBoundingClientRect();
      const reset = document.querySelector('.pitch-bend button').getBoundingClientRect();
      const contains = (outer, inner) => outer.left <= inner.left + 1 && outer.top <= inner.top + 1 && outer.right >= inner.right - 1 && outer.bottom >= inner.bottom - 1;
      const separate = card.right <= target.left || card.left >= target.right || card.bottom <= target.top || card.top >= target.bottom;
      return contains(spot, slider) && contains(spot, reset) && separate && card.left >= 0 && card.top >= 0 && card.right <= innerWidth && card.bottom <= innerHeight;
    })).toBe(true);
    await tour.getByRole('button', { name: 'Back' }).focus();
    await page.keyboard.press('Enter');
    await expect(tour.getByRole('heading')).toHaveText('CHORD JOYSTICK');
    await tour.getByRole('button', { name: 'Next' }).focus();
    await page.keyboard.press('Enter');
    await expect(tour.getByRole('heading')).toHaveText('PITCH BEND');
    await page.keyboard.press('Enter');
    await expect(tour.getByRole('heading')).toHaveText('METRONOME');
  });
}
