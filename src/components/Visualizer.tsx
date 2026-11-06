import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Visualizer({ analyser, active, theme, children }: { analyser: React.RefObject<AnalyserNode | null>; active: boolean; theme: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState('waveform');
  useEffect(() => {
    // Redraw even when inactive so a theme change updates the canvas colors.
    void theme;
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame: number;
    const draw = () => {
      const width = element.clientWidth, height = element.clientHeight;
      const scale = window.devicePixelRatio || 1;
      if (element.width !== Math.round(width * scale) || element.height !== Math.round(height * scale)) {
        element.width = Math.round(width * scale); element.height = Math.round(height * scale);
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = ctx.fillStyle = getComputedStyle(element).color;
      ctx.lineWidth = 2;
      if (!active || !analyser.current) {
        ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
      } else if (mode === 'waveform') {
        const data = new Uint8Array(analyser.current.fftSize);
        analyser.current.getByteTimeDomainData(data);
        ctx.beginPath();
        data.forEach((value, i) => { const x = i * width / (data.length - 1), y = value * height / 256; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.stroke();
      } else {
        const data = new Uint8Array(analyser.current.frequencyBinCount);
        analyser.current.getByteFrequencyData(data);
        const count = 48;
        for (let i = 0; i < count; i++) {
          const start = Math.floor(i * data.length / count), end = Math.floor((i + 1) * data.length / count);
          let peak = 0; for (let j = start; j < end; j++) peak = Math.max(peak, data[j]);
          const bar = peak * height / 255;
          ctx.fillRect(i * width / count, height - bar, Math.max(1, width / count - 2), bar);
        }
      }
    };
    const tick = () => { draw(); frame = requestAnimationFrame(tick); };
    const update = () => {
      cancelAnimationFrame(frame);
      if (document.hidden) return;
      if (active && !motion.matches) tick(); else draw();
    };
    const observer = new ResizeObserver(update); observer.observe(element);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    update();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', update); motion.removeEventListener('change', update); };
  }, [mode, active, analyser, theme]);
  return <section className="visualizer" aria-label={t('visualizer.label')}><div className="visualizer-header"><span className="section-label">{t('visualizer.heading')}</span><fieldset className="switches visualizer-modes" aria-label={t('visualizer.mode')}>{['waveform', 'spectrum'].map(value => <button type="button" key={value} className={mode === value ? 'selected' : ''} aria-pressed={mode === value} onClick={() => setMode(value)}>{t(`visualizer.${value}`)}</button>)}</fieldset></div><div className="display-row">{children}<canvas ref={canvas} tabIndex={-1} aria-hidden="true" /></div></section>;
}
