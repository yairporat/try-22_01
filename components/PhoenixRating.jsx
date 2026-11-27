'use client';

// דירוג בחמישה פניקסים + שדה הערות. משמש אחרי כל תחנה ובסוף ההרפתקה.

import { useState } from 'react';

const LABELS = ['', 'לא נהניתי', 'היה בסדר', 'טוב', 'מאוד טוב', 'מושלם!'];

export default function PhoenixRating({ title, placeholder = 'מה אהבתם? מה היה כדאי לשפר?', submitLabel = 'שמירה', skipLabel = 'דלג', onSubmit, onSkip, busy = false }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const shown = hover || rating;
  return (
    <div style={s.box}>
      {title ? <h2 style={s.title}>{title}</h2> : null}
      <div style={s.row} role="radiogroup" aria-label="דירוג" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} מתוך 5`} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} style={s.bird}>
            <img
              src="/phoenix-pin.png"
              alt=""
              style={{ width: 44, height: 44, objectFit: 'contain', display: 'block', filter: n <= shown ? 'none' : 'grayscale(1)', opacity: n <= shown ? 1 : 0.3, transform: n <= shown ? 'scale(1.08)' : 'scale(.92)', transition: 'transform .15s, opacity .15s' }}
            />
          </button>
        ))}
      </div>
      <p style={s.label}>{LABELS[shown] || 'בחרו דירוג'}</p>
      <label style={s.cl}>
        הערות וביקורת (לא חובה)
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} placeholder={placeholder} style={s.ta} />
      </label>
      <div style={s.actions}>
        <button type="button" style={{ ...s.save, opacity: rating && !busy ? 1 : 0.45 }} disabled={!rating || busy} onClick={() => onSubmit({ rating, review: text.trim() })}>
          {busy ? 'שומרים...' : submitLabel}
        </button>
        {onSkip ? (
          <button type="button" style={s.skip} disabled={busy} onClick={onSkip}>
            {skipLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const s = {
  box: { display: 'grid', gap: 8 },
  title: { margin: 0, fontSize: 19, fontWeight: 700, textAlign: 'center' },
  row: { display: 'flex', justifyContent: 'center', gap: 2 },
  bird: { background: 'none', border: 0, padding: 2, cursor: 'pointer', borderRadius: 12 },
  label: { margin: 0, textAlign: 'center', color: '#5B6677', fontSize: 14, minHeight: 20 },
  cl: { display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, color: '#3A4658' },
  ta: { font: 'inherit', fontSize: 15, fontWeight: 400, padding: 12, borderRadius: 12, border: '1px solid #D5DFEB', resize: 'vertical', width: '100%', boxSizing: 'border-box', color: '#14213D' },
  actions: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 4 },
  save: { border: 0, borderRadius: 999, padding: '12px 0', fontSize: 16, fontWeight: 700, background: '#F26B1D', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 0 #C2520F', fontFamily: 'inherit' },
  skip: { border: '1px solid #D5DFEB', borderRadius: 999, background: '#fff', color: '#3A4658', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
