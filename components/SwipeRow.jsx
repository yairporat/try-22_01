'use client';

// שורה ברשימה שאפשר להחליק הצידה (ימינה או שמאלה) כדי להסיר.
// מאחורי השורה מופיע "הסרה" באדום; החלקה של יותר מ-100 פיקסלים מסירה, פחות מזה – חוזרת למקום.

import { useRef, useState } from 'react';

export default function SwipeRow({ children, onRemove, onClick, selected, label }) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef(null);
  const dir = useRef(null); // 'h' | 'v' | null
  const moved = useRef(false);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    dir.current = null;
    moved.current = false;
  };
  const onTouchMove = (e) => {
    if (!start.current) return;
    const t = e.touches[0];
    const x = t.clientX - start.current.x;
    const y = t.clientY - start.current.y;
    if (!dir.current && (Math.abs(x) > 10 || Math.abs(y) > 10)) dir.current = Math.abs(x) > Math.abs(y) ? 'h' : 'v';
    if (dir.current === 'h') {
      moved.current = true;
      setDx(x);
    }
  };
  const onTouchEnd = () => {
    if (dir.current === 'h' && Math.abs(dx) > 100) {
      setLeaving(true);
      setDx(dx > 0 ? 500 : -500);
      setTimeout(() => {
        onRemove();
        setLeaving(false);
        setDx(0);
      }, 180);
    } else setDx(0);
    start.current = null;
  };

  return (
    <li style={s.wrap}>
      <div style={{ ...s.under, justifyContent: dx > 0 ? 'flex-start' : 'flex-end', opacity: Math.min(1, Math.abs(dx) / 80) }} aria-hidden="true">
        🗑 הסרה
      </div>
      <div
        style={{
          ...s.row,
          ...(selected ? s.on : null),
          transform: `translateX(${dx}px)`,
          transition: start.current && !leaving ? 'none' : 'transform .18s ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClick={() => !moved.current && onClick && onClick()}
        aria-label={label}
      >
        {children}
      </div>
    </li>
  );
}

const s = {
  wrap: { position: 'relative', borderRadius: 18, overflow: 'hidden', listStyle: 'none' },
  under: { position: 'absolute', inset: 0, background: '#E5484D', color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', padding: '0 18px', borderRadius: 18 },
  row: { position: 'relative', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 18, padding: 8, boxShadow: '0 4px 14px rgba(20,33,61,.06)', border: '2px solid transparent', cursor: 'pointer', touchAction: 'pan-y' },
  on: { borderColor: '#1E6FD9' },
};
