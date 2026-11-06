import { test, expect } from './fixture.js';

test('translates controls, stable options, history and the complete tour', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Language').selectOption('es');
  await expect(page.getByRole('region', { name: 'Instrumento de acordes' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Metrónomo' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Modo del visualizador' })).toBeVisible();
  await expect(page.getByLabel('Modulación de tono')).toHaveAttribute('aria-valuetext', '0 SEMITONOS');
  await expect(page.getByRole('button', { name: 'SOSTENER ACORDE I', exact: true })).toBeVisible();
  await expect(page.getByLabel('Tempo del metrónomo')).toHaveValue('120');
  await expect(page.getByRole('button', { name: 'Forma de onda' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('VOZ').selectOption('Bright');
  await expect(page.getByLabel('VOZ').locator('option:checked')).toHaveText('BRILLANTE');
  await page.getByLabel('Reverberación').selectOption('hall');
  await page.getByLabel('COLOR DEL ACORDE').selectOption('seventh');
  await page.getByRole('button', { name: 'TOCAR ACORDE I', exact: true }).click();
  await page.getByRole('button', { name: 'Historial de acordes' }).click();
  const history = page.getByRole('region', { name: 'Historial de acordes' });
  await expect(history).toContainText('BRILLANTE');
  await expect(history).toContainText('SALA DE CONCIERTOS');
  await expect(history).toContainText('SÉPTIMA');
  await page.getByRole('button', { name: 'TOCAR ACORDE I', exact: true }).click({ button: 'right' });
  await expect(page.getByRole('dialog', { name: 'Asignar acorde I' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Iniciar recorrido guiado' }).click();
  const tour = page.getByRole('dialog', { name: 'Recorrido guiado' });
  for (const [title, description] of [
    ['Visualizador de audio', 'LA PANTALLA MUESTRA'],
    ['Controles de sonido', 'ELIGE LA TONALIDAD MAYOR'],
    ['Joystick de acordes', 'ARRASTRA EL JOYSTICK'],
    ['Modulación de tono', 'MUEVE EL CONTROL'],
    ['Metrónomo', 'INICIA O DETÉN EL METRÓNOMO'],
    ['Detener y restablecer', 'APAGAR TODO DETIENE'],
    ['Asignaciones de teclado', 'HAZ CLIC DERECHO'],
    ['Tocar acordes', 'MANTÉN PULSADO UN PAD'],
    ['Sostener acordes', 'ACTIVA SOSTENER'],
  ]) {
    await expect(tour.getByRole('heading', { name: title })).toBeVisible();
    await expect(tour.locator('#tour-description')).toContainText(description);
    if (title !== 'Sostener acordes') await tour.getByRole('button', { name: 'Siguiente' }).click();
  }
  await tour.getByRole('button', { name: 'Finalizar' }).click();
  await page.getByLabel('Idioma').selectOption('en');
  await expect(page.getByLabel('VOICE')).toHaveValue('Bright');
  await expect(page.getByLabel('Reverb')).toHaveValue('hall');
  await expect(page.getByLabel('CHORD COLOR')).toHaveValue('seventh');
  await expect(page.getByLabel('Pitch bend')).toHaveAttribute('aria-valuetext', '0 SEMITONES');
  await expect(page.getByRole('button', { name: 'Waveform' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Chord history' })).toContainText('BRIGHT');
});

test('defaults to English for an unsupported browser language', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'language', { value: 'fr-FR' }));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Chord history' })).toBeVisible();
});

test('keeps the selection for the session when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { value: 'en-US' });
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('unavailable'); } });
  });
  await page.goto('/');
  await page.getByLabel('Language').selectOption('es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('button', { name: 'Historial de acordes' })).toBeVisible();
});

test('detects Spanish and translates the interface and tour', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'language', { value: 'es-MX' }));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('button', { name: 'Iniciar recorrido guiado' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar recorrido guiado' }).click();
  await expect(page.getByRole('dialog', { name: 'Recorrido guiado' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 9')).toBeVisible();
});

test('switching language preserves live metronome and visualizer settings', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Metronome tempo').fill('135');
  await page.getByLabel('Beats per measure').selectOption('3');
  await page.getByRole('button', { name: 'Spectrum' }).click();
  await page.getByLabel('Language').selectOption('es');
  await expect(page.getByLabel('Tempo del metrónomo')).toHaveValue('135');
  await expect(page.getByLabel('Pulsos por compás')).toHaveValue('3');
  await expect(page.getByRole('button', { name: 'Espectro' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Idioma').selectOption('en');
  await expect(page.getByLabel('Metronome tempo')).toHaveValue('135');
  await expect(page.getByLabel('Beats per measure')).toHaveValue('3');
  await expect(page.getByRole('button', { name: 'Spectrum' })).toHaveAttribute('aria-pressed', 'true');
});

test('switches language immediately and remembers the choice', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Language').selectOption('es');
  await expect(page.getByRole('button', { name: 'Historial de acordes' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.getByLabel('Idioma').selectOption('en');
  await expect(page.getByRole('button', { name: 'Chord history' })).toBeVisible();
});

test('translates named keyboard bindings without changing playback binding', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY CHORD I', exact: true }).click({ button: 'right' });
  await page.keyboard.press('ArrowUp');
  await page.getByLabel('Language').selectOption('es');
  await expect(page.locator('.pad[data-degree="0"] small')).toHaveText('FLECHA ARRIBA');
  await page.getByLabel('Idioma').selectOption('en');
  await expect(page.locator('.pad[data-degree="0"] small')).toHaveText('ARROWUP');
});
