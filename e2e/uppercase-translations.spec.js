import { test, expect } from './fixture.js';

test('renders translated text in uppercase in both languages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'CHORD HISTORY', exact: true })).toHaveText('CHORD HISTORY');
  await page.getByLabel('LANGUAGE').selectOption('es');
  await expect(page.getByRole('button', { name: 'HISTORIAL DE ACORDES', exact: true })).toHaveText('HISTORIAL DE ACORDES');
  await expect(page.getByLabel('MODULACIÓN DE TONO')).toHaveAttribute('aria-valuetext', '0 SEMITONOS');
});
