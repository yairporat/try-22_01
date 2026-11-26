'use client';

// לוח הזמנים של ההרפתקה: נסיעה אל התחנה הראשונה, ביקורים, נסיעות בין התחנות וחזרה.
// הזמנים מגיעים מההערכה של השרת, ומתעדכנים לזמני נסיעה לפי הכבישים כשיש חיבור.

import { useEffect, useState } from 'react';
import { driveTime, formatKm, formatMinutes, hasCoords } from '../lib/travel';

const PARK_MINUTES = 5;

export default function Timeline({ adventure }) {
  const { stops, plan } = adventure;
  const origin = plan?.origin;
  const [legs, setLegs] = useState(() => initialLegs(adventure));

  // זמני נסיעה לפי הכבישים (אם אין חיבור – נשארת ההערכה)
  useEffect(() => {
    let alive = true;
    const pairs = legPairs(adventure);
    setLegs(initialLegs(adventure));
    Promise.all(
      pairs.map(([a, b], i) =>
        hasCoords(a) && hasCoords(b)
          ? driveTime(a, b).then((r) => (r.estimated ? null : { minutes: r.minutes + PARK_MINUTES, km: r.km, estimated: false }))
          : Promise.resolve(null),
      ),
    ).then((better) => {
      if (!alive) return;
      setLegs((cur) => cur.map((l, i) => better[i] || l));
    });
    return () => {
      alive = false;
    };
  }, [adventure]);

  const visit = stops.reduce((n, s) => n + (parseInt(s.visitTime, 10) || 0), 0);
  const between = legs.filter((l) => l.kind === 'between').reduce((n, l) => n + l.minutes, 0);
  const outside = legs.filter((l) => l.kind !== 'between').reduce((n, l) => n + l.minutes, 0);
  const total = visit + between + outside;
  const back = new Date(Date.now() + total * 60000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const rows = [];
  const legFor = (kind, i) => legs.find((l) => l.kind === kind && l.i === i);
  const toStart = legFor('toStart', 0);
  if (toStart) rows.push(<Leg key="to" leg={toStart} text={`מ${origin.label === 'המיקום שלך' ? 'המיקום שלך' : origin.label} לתחנה 1`} />);
  stops.forEach((s, i) => {
    if (i > 0) {
      const l = legFor('between', i - 1);
      if (l) rows.push(<Leg key={`b${i}`} leg={l} text={`לתחנה ${i + 1}`} />);
    }
    rows.push(
      <li key={`s${i}`} style={st.stop}>
        <span style={st.num}>{i + 1}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b>{s.name}</b>
        </span>
        <span style={st.visit}>ביקור {s.visitTime}</span>
      </li>,
    );
  });
  const backLeg = legFor('back', 0);
  if (backLeg) rows.push(<Leg key="back" leg={backLeg} text={`חזרה ל${origin.label === 'המיקום שלך' ? 'נקודת היציאה' : origin.label}`} icon="🏠" />);

  return (
    <section style={st.box} aria-label="לוח זמנים">
      <h2 style={st.title}>לוח זמנים</h2>
      {!origin && (
        <p style={st.note}>
          כדי לחשב גם את הנסיעה הלוך וחזור, אפשרו גישה למיקום או בחרו במסך הבית מאיפה יוצאים.
        </p>
      )}
      <ol style={st.list}>{rows}</ol>
      <div style={st.totals}>
        <Total label="בשטח" value={formatMinutes(visit + between)} />
        {origin ? <Total label="הלוך וחזור" value={formatMinutes(outside)} /> : null}
        <Total label="סה״כ" value={formatMinutes(total)} strong />
      </div>
      {origin ? <p style={st.note}>אם יוצאים עכשיו, חוזרים בערך ב-{back}.</p> : null}
      {legs.some((l) => l.estimated) ? <p style={st.small}>זמני נסיעה שמסומנים ב"כ-" הם הערכה.</p> : null}
    </section>
  );
}

function Leg({ leg, text, icon = '🚗' }) {
  return (
    <li style={st.leg}>
      <span style={st.legIcon} aria-hidden="true">{icon}</span>
      <span style={{ flex: 1 }}>{text}</span>
      <span style={st.legTime}>
        {leg.estimated ? 'כ-' : ''}
        {formatMinutes(leg.minutes)}
        {leg.km ? ` · ${formatKm(leg.km)}` : ''}
      </span>
    </li>
  );
}

function Total({ label, value, strong }) {
  return (
    <div style={{ ...st.total, ...(strong ? st.totalStrong : null) }}>
      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</b>
      <span style={st.totalLabel}>{label}</span>
    </div>
  );
}

function legPairs(adv) {
  const { stops, plan } = adv;
  const o = plan?.origin;
  const pairs = [];
  if (o && plan.toStart) pairs.push([o, stops[0]]);
  stops.slice(1).forEach((s, i) => pairs.push([stops[i], s]));
  if (o && plan.back) pairs.push([stops[stops.length - 1], o]);
  return pairs;
}

function initialLegs(adv) {
  const { plan } = adv;
  const legs = [];
  if (!plan) return legs;
  if (plan.origin && plan.toStart) legs.push({ kind: 'toStart', i: 0, ...plan.toStart });
  plan.between.forEach((l, i) => legs.push({ kind: 'between', i, ...l }));
  if (plan.origin && plan.back) legs.push({ kind: 'back', i: 0, ...plan.back });
  return legs;
}

const MUTED = '#64748b';
const st = {
  box: { background: '#fff', borderRadius: 20, boxShadow: '0 6px 20px rgba(0,0,0,0.08)', padding: 16, textAlign: 'start', display: 'grid', gap: 10, margin: '0 0 20px' },
  title: { margin: 0, fontSize: 18 },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 },
  leg: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: MUTED, padding: '2px 4px', borderInlineStart: '3px dotted #cbd5e1', marginInlineStart: 14 },
  legIcon: { fontSize: 15 },
  legTime: { fontWeight: 700, color: '#334155', fontVariantNumeric: 'tabular-nums' },
  stop: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 },
  num: { width: 28, height: 28, borderRadius: '50%', background: '#f2653a', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', fontSize: 14 },
  visit: { fontSize: 13, color: MUTED, flex: '0 0 auto' },
  totals: { display: 'flex', gap: 8, marginTop: 4 },
  total: { flex: 1, background: '#f1f5f9', borderRadius: 12, padding: '8px 4px', display: 'grid', justifyItems: 'center', gap: 2, fontSize: 16 },
  totalStrong: { background: '#eaf2fe', color: '#1c5fb8' },
  totalLabel: { fontSize: 12, color: MUTED },
  note: { margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 },
  small: { margin: 0, fontSize: 12, color: MUTED },
};
