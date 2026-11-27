'use client';

// בחירת נקודת היציאה: המיקום שלי עכשיו, עיר מהרשימה, או כל מקום אחר בחיפוש (כתובת, יישוב, מקום).
// compact: מציג שורה אחת עם כפתור "שינוי"; בלחיצה נפתח חלון בחירה.

import { useEffect, useRef, useState } from 'react';
import { CITIES, CUSTOM, MY_LOCATION, loadCustomOrigin, loadOriginChoice, originLabel, saveCustomOrigin, saveOriginChoice } from '../lib/origin';

export default function OriginPicker({ onChange, startOpen = false, compact = true, label = 'יוצאים מ:' }) {
  const [choice, setChoice] = useState(MY_LOCATION);
  const [open, setOpen] = useState(startOpen);

  useEffect(() => setChoice(loadOriginChoice()), []);

  function pick(next) {
    setChoice(next);
    setOpen(false);
    onChange && onChange(next);
  }

  return (
    <>
      <button type="button" style={s.row} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true">📍</span>
        <span style={s.muted}>{label}</span>
        <b style={s.value}>{originLabel(choice)}</b>
        {compact && <span style={s.change}>שינוי</span>}
      </button>
      {open && <OriginSheet current={choice} onPick={pick} onClose={() => setOpen(false)} />}
    </>
  );
}

export function OriginSheet({ current, onPick, onClose }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const custom = typeof window !== 'undefined' ? loadCustomOrigin() : null;
  const timer = useRef(null);

  // חיפוש מקום (חצי שנייה אחרי שמפסיקים להקליד)
  useEffect(() => {
    clearTimeout(timer.current);
    const text = q.trim();
    if (text.length < 2) {
      setResults([]);
      setStatus('');
      return;
    }
    // קודם ערים מהרשימה
    const local = CITIES.filter((c) => c.name.includes(text)).map((c) => ({ name: c.name, detail: 'עיר', lat: c.lat, lng: c.lng, city: true }));
    setResults(local);
    setStatus('מחפשים...');
    timer.current = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(text)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) return setStatus(data.error);
          const more = (Array.isArray(data) ? data : []).filter((r) => !local.some((l) => l.name === r.name));
          setResults([...local, ...more]);
          setStatus(local.length + more.length ? '' : 'לא מצאנו. נסו שם של יישוב או כתובת.');
        })
        .catch(() => setStatus('החיפוש לא זמין כרגע'));
    }, 500);
    return () => clearTimeout(timer.current);
  }, [q]);

  function pickResult(r) {
    if (r.city) {
      saveOriginChoice(r.name);
      onPick(r.name);
    } else {
      saveCustomOrigin(r);
      onPick(CUSTOM);
    }
  }

  const option = (value, text, sub) => (
    <button key={value} type="button" style={{ ...s.opt, ...(current === value ? s.optOn : null) }} onClick={() => { saveOriginChoice(value); onPick(value); }}>
      <span>{text}</span>
      {sub ? <small style={s.sub}>{sub}</small> : null}
    </button>
  );

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="מאיפה יוצאים" dir="rtl" onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.handle} aria-hidden="true" />
        <h2 style={s.h2}>מאיפה יוצאים להרפתקה?</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש יישוב, כתובת או מקום"
          style={s.input}
          autoFocus
          aria-label="חיפוש נקודת יציאה"
        />
        {q.trim().length >= 2 ? (
          <div style={s.list}>
            {results.map((r) => (
              <button key={`${r.name}-${r.lat}`} type="button" style={s.opt} onClick={() => pickResult(r)}>
                <span>{r.name}</span>
                {r.detail ? <small style={s.sub}>{r.detail}</small> : null}
              </button>
            ))}
            {status && <p style={s.status}>{status}</p>}
          </div>
        ) : (
          <div style={s.list}>
            {option(MY_LOCATION, '📡 המיקום שלי עכשיו', 'לפי ה-GPS של הטלפון')}
            {custom && option(CUSTOM, `⭐ ${custom.name}`, 'המקום האחרון שחיפשתם')}
            <p style={s.groupLabel}>ערים</p>
            <div style={s.cities}>
              {CITIES.map((c) => (
                <button key={c.name} type="button" style={{ ...s.city, ...(current === c.name ? s.cityOn : null) }} onClick={() => { saveOriginChoice(c.name); onPick(c.name); }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const font = '"Rubik", system-ui, sans-serif';
const s = {
  row: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', background: '#fff', border: '1px solid #D5DFEB', borderRadius: 999, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontFamily: font, color: '#14213D', width: 'fit-content', margin: '0 auto' },
  muted: { color: '#5B6677' },
  value: { color: '#1E6FD9' },
  change: { color: '#C2520F', fontWeight: 600, fontSize: 13, marginInlineStart: 4 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,33,61,.45)', zIndex: 3500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: font },
  sheet: { background: '#fff', width: '100%', maxWidth: 480, maxHeight: '85dvh', overflowY: 'auto', borderRadius: '26px 26px 0 0', padding: '10px 18px calc(18px + env(safe-area-inset-bottom))', display: 'grid', gap: 12, boxSizing: 'border-box', color: '#14213D' },
  handle: { width: 44, height: 5, borderRadius: 3, background: '#D5DFEB', justifySelf: 'center' },
  h2: { margin: 0, fontSize: 19, fontWeight: 700, textAlign: 'center' },
  input: { font: 'inherit', fontSize: 16, padding: '12px 14px', borderRadius: 14, border: '1px solid #D5DFEB', width: '100%', boxSizing: 'border-box' },
  list: { display: 'grid', gap: 8 },
  opt: { display: 'grid', gap: 2, textAlign: 'start', background: '#F6F9FC', border: '2px solid transparent', borderRadius: 14, padding: '10px 12px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font, color: '#14213D' },
  optOn: { borderColor: '#1E6FD9', background: '#EAF2FE' },
  sub: { fontSize: 12, color: '#5B6677', fontWeight: 400 },
  status: { margin: 0, fontSize: 14, color: '#5B6677', textAlign: 'center' },
  groupLabel: { margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: '#3A4658' },
  cities: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  city: { border: '1px solid #D5DFEB', background: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 13, cursor: 'pointer', fontFamily: font, color: '#14213D' },
  cityOn: { background: '#1E6FD9', borderColor: '#1E6FD9', color: '#fff' },
};
