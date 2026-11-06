import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const tourSteps = [
  { key: 'visualizer', anchor: '.visualizer' },
  { key: 'controls', anchor: '.controls' },
  { key: 'joystick', anchor: '.joystick-control' },
  { key: 'pitchBend', anchor: '.pitch-bend' },
  { key: 'metronome', anchor: '.metronome' },
  { key: 'reset', anchor: '.reset-actions' },
  { key: 'bindings', anchor: '.chord-header' },
  { key: 'play', anchor: '.pads' },
  { key: 'sustain', anchor: '.pad-group .sustain' },
];

export default function GuidedTour({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const [spotlight, setSpotlight] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const target = document.querySelector(tourSteps[step].anchor);
    target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    if (tourSteps[step].anchor === '.pitch-bend' && target && panel.current) {
      const rect = target.getBoundingClientRect();
      if (rect.bottom + panel.current.offsetHeight + 18 > window.innerHeight && rect.top < panel.current.offsetHeight + 18) {
        window.scrollBy(0, rect.top - 8);
      }
    }
    const place = () => {
      if (!target || !panel.current) return;
      const rect = target.getBoundingClientRect(), box = panel.current.getBoundingClientRect();
      const clampX = (value: number) => Math.max(0, Math.min(window.innerWidth, value));
      const clampY = (value: number) => Math.max(0, Math.min(window.innerHeight, value));
      setSpotlight({ left: clampX(rect.left), top: clampY(rect.top), right: clampX(rect.right), bottom: clampY(rect.bottom) });
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - box.width - 8));
      const below = rect.bottom + 10, above = rect.top - box.height - 10;
      const top = below + box.height <= window.innerHeight - 8 ? below : above >= 8 ? above : Math.max(8, Math.min(below, window.innerHeight - box.height - 8));
      setPosition({ left, top });
    };
    place();
    window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
    const observer = new ResizeObserver(place);
    if (target) observer.observe(target);
    if (panel.current) observer.observe(panel.current);
    return () => { observer.disconnect(); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [step]);
  useEffect(() => { panel.current?.querySelector<HTMLElement>('[data-initial]')?.focus(); }, []);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  return <><div className="tour-backdrop" aria-hidden="true">
    <div className="tour-shade" style={{ left: 0, top: 0, right: 0, height: spotlight.top }} />
    <div className="tour-shade" style={{ left: 0, top: spotlight.top, width: spotlight.left, height: spotlight.bottom - spotlight.top }} />
    <div className="tour-shade" style={{ left: spotlight.right, top: spotlight.top, right: 0, height: spotlight.bottom - spotlight.top }} />
    <div className="tour-shade" style={{ left: 0, top: spotlight.bottom, right: 0, bottom: 0 }} />
    <div className="tour-spotlight" style={{ left: spotlight.left, top: spotlight.top, width: spotlight.right - spotlight.left, height: spotlight.bottom - spotlight.top }} />
  </div><div ref={panel} className="tour-panel" role="dialog" aria-label={t('tour.label')} aria-describedby="tour-description" style={position}>
    <p className="tour-progress">{t('tour.progress', { current: step + 1, total: tourSteps.length })}</p>
    <h2>{t(`tour.steps.${tourSteps[step].key}.title`)}</h2><p id="tour-description">{t(`tour.steps.${tourSteps[step].key}.text`)}</p>
    <div className="tour-actions"><button type="button" onClick={onClose}>{t('tour.close')}</button><button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>{t('tour.back')}</button>{step === tourSteps.length - 1 ? <button type="button" onClick={onClose}>{t('tour.finish')}</button> : <button type="button" data-initial onClick={() => setStep(step + 1)}>{t('tour.next')}</button>}</div>
  </div></>;
}
