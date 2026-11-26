'use client';

// פירוט של תחנה שנבחרה במפה: זמני נסיעה, זמן ביקור, שעות פתיחה וקישורי ניווט.

import { useEffect, useState } from 'react';
import { driveTime, formatKm, formatMinutes, hasCoords, wazeLink } from '../lib/travel';

export default function StopDetails({ stop, index, prevStop, userPos, onClose }) {
  const [fromMe, setFromMe] = useState(null);
  const [fromPrev, setFromPrev] = useState(null);

  useEffect(() => {
    let alive = true;
    setFromMe(null);
    setFromPrev(null);
    if (hasCoords(stop) && userPos) driveTime(userPos, stop).then((r) => alive && setFromMe(r));
    if (hasCoords(stop) && hasCoords(prevStop)) driveTime(prevStop, stop).then((r) => alive && setFromPrev(r));
    return () => {
      alive = false;
    };
  }, [stop, prevStop, userPos]);

  const drive = (r) =>
    r ? `${r.estimated ? 'כ-' : ''}${formatMinutes(r.minutes)} · ${formatKm(r.km)}` : 'מחשב...';

  const rows = [
    ['זמן ביקור', stop.visitTime],
    userPos && hasCoords(stop) && ['נסיעה מהמיקום שלך', drive(fromMe)],
    prevStop && hasCoords(stop) && hasCoords(prevStop) && [`נסיעה מתחנה ${index} (${prevStop.name})`, drive(fromPrev)],
    stop.hours && ['שעות פתיחה', stop.hours],
  ].filter(Boolean);

  return (
    <section style={s.panel} aria-live="polite">
      <div style={s.head}>
        <span style={s.num}>{index + 1}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={s.name}>{stop.name}</h3>
          <div style={s.tags}>
            <span style={s.tag}>{stop.type}</span>
            <span style={s.tag}>{stop.difficulty}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} style={s.close} aria-label="סגירה">
          ✕
        </button>
      </div>

      <dl style={s.rows}>
        {rows.map(([k, v]) => (
          <div key={k} style={s.row}>
            <dt style={s.dt}>{k}</dt>
            <dd style={s.dd}>{v}</dd>
          </div>
        ))}
      </dl>

      {stop.tips && (
        <p style={s.tips}>
          <b>חשוב לדעת: </b>
          {stop.tips}
        </p>
      )}
      {stop.description && <p style={s.desc}>{stop.description}</p>}
      {!hasCoords(stop) && <p style={s.note}>למקום הזה אין מיקום מדויק, ולכן הוא לא מופיע במפה.</p>}

      <div style={s.actions}>
        <a href={stop.mapsLink} target="_blank" rel="noreferrer" style={s.btn}>
          Google Maps
        </a>
        {hasCoords(stop) && (
          <a href={wazeLink(stop)} target="_blank" rel="noreferrer" style={{ ...s.btn, ...s.waze }}>
            Waze
          </a>
        )}
      </div>
    </section>
  );
}

const s = {
  panel: {
    marginTop: 12,
    textAlign: 'start',
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    padding: 16,
  },
  head: { display: 'flex', alignItems: 'center', gap: 12 },
  num: {
    flex: '0 0 auto',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#1c5fb8',
    color: '#fff',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { margin: 0, fontSize: 19, color: '#1a1a1a' },
  tags: { display: 'flex', gap: 6, marginTop: 4 },
  tag: { background: '#eaf2fe', color: '#1c5fb8', borderRadius: 999, padding: '2px 10px', fontSize: 13, fontWeight: 600 },
  close: {
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    fontSize: 14,
    color: '#64748b',
    cursor: 'pointer',
  },
  rows: { margin: '14px 0 0', display: 'grid', gap: 8 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #eef2f6', paddingBottom: 8 },
  dt: { color: '#64748b', fontSize: 14 },
  dd: { margin: 0, fontWeight: 700, fontSize: 14, color: '#1a1a1a', textAlign: 'end', fontVariantNumeric: 'tabular-nums' },
  tips: { margin: '12px 0 0', background: '#fff4e5', borderRadius: 12, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, color: '#7a3f00' },
  desc: { margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: '#333' },
  note: { margin: '10px 0 0', fontSize: 13, color: '#64748b' },
  actions: { display: 'flex', gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    textAlign: 'center',
    background: '#2f80ed',
    color: '#fff',
    borderBottom: '4px solid #1c5fb8',
    borderRadius: 14,
    padding: '10px 0',
    fontWeight: 700,
    textDecoration: 'none',
  },
  waze: { background: '#33ccff', borderBottomColor: '#1a9fd1', color: '#0b2a3a' },
};
