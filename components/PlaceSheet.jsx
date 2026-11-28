'use client';

// חלון עם כל הפרטים של מקום (תמונות, תיאור, הגעה, ניווט), למשל כשחוזרים למקום שביקרתי בו.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, lastVisit } from '../lib/visited';
import Birds from './Birds';
import Reviews from './Reviews';
import TypeIcon from './TypeIcon';
import PlaceInfo from './PlaceInfo';

export default function PlaceSheet({ id, visit, rating, onClose }) {
  const router = useRouter();
  const [place, setPlace] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setPlace(null);
    setError('');
    fetch(`/api/places?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => alive && (d.error ? setError(d.error) : setPlace(d)))
      .catch(() => alive && setError('לא הצלחנו לטעון את הפרטים'));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = place || visit || {};
  const images = place ? [place.image, ...(place.gallery || [])].filter(Boolean) : [];

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label={p.name || 'פרטי מקום'} dir="rtl" onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.handle} aria-hidden="true" />
        <button type="button" style={s.x} onClick={onClose} aria-label="סגירה">✕</button>

        {images.length ? (
          <div style={s.gallery}>
            {images.map((src, i) => (
              <img key={src + i} src={src} alt={i === 0 ? p.name : ''} style={s.img} />
            ))}
          </div>
        ) : null}

        <div style={{ display: 'grid', gap: 6 }}>
          <h2 style={s.h2}>{p.name}</h2>
          <div style={s.chips}>
            {p.type ? (
              <span style={s.tag}>
                <TypeIcon type={p.type} /> {p.type}
              </span>
            ) : null}
            {p.region ? <span style={s.chip}>{p.region}</span> : null}
            {place?.difficulty ? <span style={s.chip}>{place.difficulty}</span> : null}
            {place?.visitMinutes ? <span style={s.chip}>⏱ {place.visitMinutes} דקות</span> : null}
          </div>
          {rating ? <Birds value={rating.avg} size={18} /> : null}
          {visit?.visits?.length ? (
            <p style={s.visited}>
              ✓ ביקרת כאן {visit.visits.length > 1 ? `${visit.visits.length} פעמים, לאחרונה ` : ''}ב-{formatDate(lastVisit(visit))}
            </p>
          ) : null}
        </div>

        {error && <p style={s.muted}>{error}</p>}
        {!place && !error && <p style={s.muted}>טוען פרטים...</p>}
        {place && <PlaceInfo place={place} />}
        {place && (
          <button type="button" style={s.again} onClick={() => router.push(`/adventure?id=${encodeURIComponent(place.id)}`)}>
            הרפתקה חדשה סביב המקום הזה
          </button>
        )}
        {place && <Reviews placeIds={[place.id]} limit={3} />}
      </div>
    </div>
  );
}

const font = '"Rubik", system-ui, sans-serif';
const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,33,61,.45)', zIndex: 2500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: font },
  sheet: { position: 'relative', background: '#F6F9FC', width: '100%', maxWidth: 480, maxHeight: '88dvh', overflowY: 'auto', borderRadius: '26px 26px 0 0', padding: '10px 18px calc(22px + env(safe-area-inset-bottom))', display: 'grid', gap: 12, boxSizing: 'border-box', color: '#14213D' },
  handle: { width: 44, height: 5, borderRadius: 3, background: '#D5DFEB', justifySelf: 'center' },
  x: { position: 'absolute', top: 10, left: 12, width: 34, height: 34, borderRadius: '50%', border: 0, background: '#fff', boxShadow: '0 2px 8px rgba(20,33,61,.12)', cursor: 'pointer', fontSize: 14, zIndex: 2 },
  gallery: { display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' },
  img: { flex: '0 0 86%', height: 200, objectFit: 'cover', borderRadius: 18, scrollSnapAlign: 'center' },
  h2: { margin: 0, fontSize: 22, fontWeight: 800 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { background: '#fff', border: '1px solid #E3EAF3', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EAF2FE', color: '#1557AD', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 },
  visited: { margin: 0, background: '#E6F6EE', color: '#17784F', borderRadius: 12, padding: '6px 10px', fontSize: 13, fontWeight: 700, justifySelf: 'start' },
  muted: { margin: 0, color: '#5B6677', fontSize: 14 },
  desc: { margin: 0, fontSize: 15, lineHeight: 1.6 },
  box: { background: '#fff', borderRadius: 16, padding: 12, border: '1px solid #E3EAF3', display: 'grid', gap: 6 },
  line: { margin: 0, fontSize: 14, lineHeight: 1.5 },
  navRow: { display: 'flex', gap: 10 },
  nav: { flex: 1, textAlign: 'center', background: '#1E6FD9', color: '#fff', borderRadius: 999, padding: '11px 0', fontWeight: 700, textDecoration: 'none', fontSize: 15, boxShadow: '0 4px 0 #1557AD' },
  waze: { flex: '0 0 30%', background: '#33ccff', color: '#0b2a3a', boxShadow: '0 4px 0 #1a9fd1' },
  again: { border: '2px solid #F26B1D', background: '#fff', color: '#C2520F', borderRadius: 999, padding: '11px 0', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: font },
};
