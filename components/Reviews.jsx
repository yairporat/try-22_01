'use client';

// "מה מטיילים אומרים": ההמלצות שמטיילים כתבו על המקומות, גלויות לכולם.
// placeIds: המקומות שמציגים עליהם המלצות. names: { id: שם } כדי לכתוב על איזה מקום ההמלצה.

import { useEffect, useState } from 'react';
import { T } from './Site';

export default function Reviews({ placeIds, names = {}, limit = 6, title = true }) {
  const [reviews, setReviews] = useState(null);
  const [all, setAll] = useState(false);
  const key = placeIds.join(',');

  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetch(`/api/reviews?places=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => alive && setReviews(d.reviews || []))
      .catch(() => alive && setReviews([]));
    return () => {
      alive = false;
    };
  }, [key]);

  if (!reviews || !reviews.length) return null;
  const shown = all ? reviews : reviews.slice(0, limit);
  const showPlace = placeIds.length > 1;

  return (
    <section style={s.box} aria-label="המלצות של מטיילים">
      {title && <T k="adventure.reviewsTitle" as="h2" style={s.h2} />}
      <ul style={s.list}>
        {shown.map((r) => (
          <li key={r.id} style={s.item}>
            <div style={s.top}>
              <span style={s.avatar} aria-hidden="true">{r.name[0]}</span>
              <b>{r.name}</b>
              {showPlace && names[r.placeId] ? <span style={s.place}>על {names[r.placeId]}</span> : <span style={{ flex: 1 }} />}
              {r.rating ? (
                <span style={s.rate} aria-label={`${r.rating} מתוך 5`}>
                  <img src="/phoenix-pin.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                  {r.rating}/5
                </span>
              ) : null}
            </div>
            <p style={s.text}>{r.text}</p>
            {r.date ? <small style={s.date}>{new Date(r.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</small> : null}
          </li>
        ))}
      </ul>
      {reviews.length > limit && !all && (
        <button type="button" style={s.more} onClick={() => setAll(true)}>
          עוד {reviews.length - limit} המלצות
        </button>
      )}
    </section>
  );
}

const s = {
  box: { display: 'grid', gap: 10 },
  h2: { margin: 0, fontSize: 18, fontWeight: 700 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 },
  item: { background: '#fff', borderRadius: 18, padding: '12px 14px', boxShadow: '0 4px 14px rgba(20,33,61,.05)', display: 'grid', gap: 6 },
  top: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: '#DCEAFB', color: '#1E6FD9', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flex: '0 0 auto' },
  place: { flex: 1, minWidth: 0, color: '#5B6677', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rate: { display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: '#B4470F', flex: '0 0 auto' },
  text: { margin: 0, fontSize: 14, lineHeight: 1.55, color: '#3A4658' },
  date: { fontSize: 12, color: '#8A96A8' },
  more: { justifySelf: 'start', background: 'none', border: 0, padding: 0, color: '#1E6FD9', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
};
