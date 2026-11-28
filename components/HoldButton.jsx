'use client';

import { useEffect, useRef, useState } from 'react';

// לחיצה ארוכה לסיום: מחזיקים 1.5 שניות, הכפתור מתמלא ואז מאשר
export default function HoldButton({ onConfirm, label = 'החזק כדי לסיים את ההרפתקה', holdingLabel = 'ממשיכים להחזיק...', ms = 1500, style, disabled = false }) {
  const [p, setP] = useState(0);
  const raf = useRef(null);
  const t0 = useRef(0);
  const done = useRef(false);
  function tick(now) {
    const v = Math.min(1, (now - t0.current) / ms);
    setP(v);
    if (v >= 1) {
      if (!done.current) {
        done.current = true;
        try {
          navigator.vibrate && navigator.vibrate(40);
        } catch {}
        onConfirm();
      }
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }
  function start(e) {
    e.preventDefault();
    if (done.current || disabled) return;
    t0.current = performance.now();
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(raf.current);
    if (!done.current) setP(0);
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <button
      type="button"
      style={{ ...st.hold, ...style, ...(disabled ? { opacity: 0.6 } : null) }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && start(e)}
      onKeyUp={stop}
      aria-label={label}
    >
      <span style={{ ...st.holdFill, transform: `scaleX(${p})` }} aria-hidden="true" />
      <span style={{ position: 'relative' }}>{p > 0 && p < 1 ? holdingLabel : label}</span>
    </button>
  );
}

const st = {
  hold: { position: 'relative', overflow: 'hidden', width: '100%', minHeight: 58, border: 0, borderRadius: 999, background: '#C2520F', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none', boxShadow: '0 6px 0 #9E420C' },
  holdFill: { position: 'absolute', inset: 0, background: '#F26B1D', transformOrigin: 'right' },
};
