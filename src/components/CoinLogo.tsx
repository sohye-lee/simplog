// Animated SimplyLog mark: the coin rests at an angle, spins two full turns,
// settles, and repeats. Frames are written straight into the <g> (no React
// re-renders). Honors prefers-reduced-motion and pauses in hidden tabs.
import { useEffect, useRef } from 'react';
import { coinMarkup, COIN_REST } from '../lib/coin';

const SPIN_MS = 1500;   // two turns
const REST_MS = 3800;   // standing still between spins
const FIRST_MS = 1200;  // delay before the first spin
const TURNS = 2;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function CoinLogo({ size = 28, animate = true }: { size?: number; animate?: boolean }) {
  const g = useRef<SVGGElement>(null);

  useEffect(() => {
    const el = g.current;
    if (!el) return;
    el.innerHTML = coinMarkup(COIN_REST);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduce) return;

    let raf = 0;
    let timer = 0;
    let stopped = false;

    const spin = () => {
      if (stopped) return;
      if (document.hidden) { timer = window.setTimeout(spin, REST_MS); return; }
      const start = performance.now();
      const frame = (now: number) => {
        if (stopped) return;
        const t = Math.min(1, (now - start) / SPIN_MS);
        el.innerHTML = coinMarkup(COIN_REST + easeInOut(t) * TURNS * Math.PI * 2);
        if (t < 1) raf = requestAnimationFrame(frame);
        else timer = window.setTimeout(spin, REST_MS);
      };
      raf = requestAnimationFrame(frame);
    };
    timer = window.setTimeout(spin, FIRST_MS);

    return () => { stopped = true; cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [animate]);

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <g ref={g} />
    </svg>
  );
}
