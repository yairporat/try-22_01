'use client';

// גלריה במסך מלא: גוללים הצידה בין כל התמונות
import { useEffect, useRef, useState } from 'react';

export default function GalleryModal({ images, start = 0, onClose }) {
  const strip = useRef(null);
  const [index, setIndex] = useState(start);

  useEffect(() => {
    const el = strip.current;
    if (el) el.scrollTo({ left: -start * el.clientWidth, behavior: 'instant' });
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="גלריית תמונות">
      <div style={s.top}>
        <span style={s.count}>{index + 1} / {images.length}</span>
        <button type="button" style={s.close} onClick={onClose} aria-label="סגירה">✕</button>
      </div>
      <div
        ref={strip}
        style={s.strip}
        dir="rtl"
        onScroll={(e) => setIndex(Math.min(images.length - 1, Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth)))}
      >
        {images.map((src, i) => (
          <div key={src + i} style={s.slide}>
            <img src={src} alt="" style={s.img} />
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(10,16,30,.96)', zIndex: 3000, display: 'flex', flexDirection: 'column' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', color: '#fff', direction: 'rtl', fontFamily: '"Rubik", system-ui, sans-serif' },
  count: { fontSize: 15, fontVariantNumeric: 'tabular-nums' },
  close: { width: 40, height: 40, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 18, cursor: 'pointer' },
  strip: { flex: 1, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' },
  slide: { flex: '0 0 100%', scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', boxSizing: 'border-box' },
  img: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 },
};
