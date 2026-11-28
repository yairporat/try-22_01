'use client';

// עמוד "המפה שלי": המפה מופיעה תמיד, עם פניקס על כל מקום שהגעתי אליו.
// מתחת: רשימת המקומות שביקרתי בהם (לחיצה פותחת את כל הפרטים והניווט) והרפתקאות שסיימתי.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import VisitedMap from '../../components/VisitedMap';
import TabBar from '../../components/TabBar';
import { formatDate, lastVisit, loadVisited, visitedList } from '../../lib/visited';
import { loadDoneAdventures } from '../../lib/history';
import { loadWallet } from '../../lib/profile';
import PlaceSheet from '../../components/PlaceSheet';

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [visited, setVisited] = useState(null);
  const [total, setTotal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(null); // המקום שהפרטים שלו פתוחים
  const [done, setDone] = useState([]);
  const [ratings, setRatings] = useState({ places: {} });

  useEffect(() => {
    setVisited(visitedList(loadVisited()));
    // הרפתקאות שסיימתי; הרפתקאות ישנות (לפני שהתחלנו לשמור) – מתוך היסטוריית המטבעות
    const list = loadDoneAdventures();
    const old = (loadWallet().history || [])
      .filter((h) => h.tripId && !list.some((a) => a.key === String(h.tripId)))
      .map((h) => ({ key: String(h.tripId), title: h.reason, date: h.date, status: 'completed', stops: [] }));
    setDone([...list, ...old].sort((a, b) => b.date - a.date));
    fetch('/api/ratings').then((r) => r.json()).then(setRatings).catch(() => {});
    fetch('/api/places?all=1')
      .then((r) => r.json())
      .then((all) => setTotal(all.length))
      .catch(() => {});
  }, []);

  if (visited === null) return <main dir="rtl" style={st.page} />;

  const regions = new Set(visited.map((p) => p.region)).size;
  const visits = visited.reduce((n, p) => n + p.visits.length, 0);

  return (
    <div dir="rtl" style={st.app}>
      <main style={st.page}>
        <header>
          <p style={st.hi}>המפה שלי</p>
          <h1 style={st.title}>המקומות שהייתי בהם</h1>
        </header>

        {visited.length > 0 && (
          <>
            <div style={st.stats}>
              <div style={st.stat}>
                <b style={st.statBig}>
                  {visited.length}
                  {total ? <span style={st.statOf}>/{total}</span> : null}
                </b>
                <span style={st.statLabel}>מקומות</span>
              </div>
              <div style={st.stat}>
                <b style={st.statBig}>{regions}/7</b>
                <span style={st.statLabel}>אזורים</span>
              </div>
              <div style={st.stat}>
                <b style={st.statBig}>{done.length}</b>
                <span style={st.statLabel}>הרפתקאות</span>
              </div>
            </div>
            {total ? (
              <div style={st.bar} aria-label={`ביקרת ב-${visited.length} מתוך ${total} מקומות`}>
                <span style={{ ...st.barFill, width: `${Math.min(100, (visited.length / total) * 100)}%` }} />
              </div>
            ) : null}
          </>
        )}

        <VisitedMap
          ref={mapRef}
          places={visited}
          onSelect={(id) => {
            setSelected(id);
            setOpen(id);
          }}
        />

        <h2 style={st.listTitle}>✓ מקומות שביקרתי בהם ({visited.length})</h2>
        {visited.length === 0 ? (
          <section style={st.empty}>
            <p style={st.emptyText}>עוד אין. בכל פעם שתגיעו לתחנה בהרפתקה, יופיע עליה פניקס במפה והיא תיכנס לרשימה הזו.</p>
            <button type="button" style={st.go} onClick={() => router.push('/new')}>
              יוצאים להרפתקה
            </button>
          </section>
        ) : (
          <ul style={st.list}>
            {visited.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  style={{ ...st.item, ...(selected === p.id ? st.itemOn : null) }}
                  onClick={() => {
                    setSelected(p.id);
                    mapRef.current?.focus(p.id);
                    setOpen(p.id);
                  }}
                >
                  <span style={st.check} aria-hidden="true">✓</span>
                  <img src="/phoenix-pin.png" alt="" style={st.itemBird} />
                  <span style={st.itemText}>
                    <b style={st.itemName}>{p.name}</b>
                    <span style={st.itemMeta}>
                      {p.region} · {p.type} · {formatDate(lastVisit(p))}
                      {p.visits.length > 1 ? ` · ${p.visits.length} ביקורים` : ''}
                    </span>
                  </span>
                  <span style={st.chev} aria-hidden="true">‹</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <h2 style={st.listTitle}>🏁 ההרפתקאות שלי ({done.length})</h2>
        {done.length === 0 ? (
          <p style={st.emptyText}>עוד לא סיימתם הרפתקה.</p>
        ) : (
          <ul style={st.list}>
            {done.map((a) => (
              <li key={a.key} style={st.advItem}>
                <span style={{ ...st.advIcon, background: a.status === 'completed' ? '#22A06B' : '#B9C3CF' }} aria-hidden="true">
                  {a.status === 'completed' ? '🏆' : '🏁'}
                </span>
                <span style={st.itemText}>
                  <b style={st.itemName}>{a.title}</b>
                  <span style={st.itemMeta}>
                    {formatDate(a.date)}
                    {a.stops?.length ? ` · ${a.stops.filter((x) => x.done).length}/${a.stops.length} תחנות` : ''}
                    {a.status === 'completed' ? ' · הושלמה' : ''}
                  </span>
                  {a.stops?.length ? <span style={st.itemMeta}>{a.stops.map((x) => x.name).join(' ← ')}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>

      {open && (
        <PlaceSheet
          id={open}
          visit={visited.find((p) => p.id === open)}
          rating={ratings.places?.[open]}
          onClose={() => setOpen(null)}
        />
      )}

      <TabBar active="map" />
    </div>
  );
}

// אותם צבעים כמו מסך הבית
const BLUE = '#1f78a8';
const INK = '#14212b';
const MUTED = '#6b7b88';
const LINE = '#e3e9ef';

const st = {
  app: { minHeight: '100dvh', background: '#f7f9fc', color: INK, fontFamily: '"Rubik", "Heebo", "Assistant", system-ui, -apple-system, sans-serif' },
  page: { maxWidth: 480, margin: '0 auto', padding: '22px 18px 120px', boxSizing: 'border-box', display: 'grid', gap: 14 },
  hi: { margin: 0, color: MUTED, fontSize: '0.95rem' },
  title: { margin: 0, fontSize: '1.7rem', fontWeight: 800, lineHeight: 1.15 },
  stats: { display: 'flex', gap: 10 },
  stat: { flex: 1, background: '#fff', border: `2px solid ${LINE}`, borderBottomWidth: 5, borderRadius: 18, padding: '10px 6px', display: 'grid', justifyItems: 'center', gap: 2 },
  statBig: { fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' },
  statOf: { fontSize: '0.95rem', color: MUTED, fontWeight: 700 },
  statLabel: { fontSize: '0.8rem', color: MUTED },
  bar: { height: 10, borderRadius: 5, background: LINE, overflow: 'hidden' },
  barFill: { display: 'block', height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #ee6a1f, #f6b93b)', marginInlineStart: 0 },
  listTitle: { margin: '8px 0 0', fontSize: '1.05rem', fontWeight: 800, color: INK },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 },
  item: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start', background: '#fff', border: `2px solid ${LINE}`, borderBottomWidth: 5, borderRadius: 18, padding: '10px 12px', cursor: 'pointer', font: 'inherit', color: 'inherit' },
  itemOn: { borderColor: BLUE },
  itemBird: { width: 40, height: 40, objectFit: 'contain', flex: '0 0 auto' },
  check: { width: 24, height: 24, borderRadius: '50%', background: '#22A06B', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' },
  chev: { marginInlineStart: 'auto', color: '#9AA8B8', fontSize: 20 },
  advItem: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `2px solid ${LINE}`, borderBottomWidth: 5, borderRadius: 18, padding: '10px 12px' },
  advIcon: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flex: '0 0 auto' },
  itemText: { display: 'grid', gap: 2, minWidth: 0 },
  itemName: { fontSize: '1.05rem', fontWeight: 800 },
  itemMeta: { fontSize: '0.82rem', color: MUTED },
  empty: { background: '#fff', border: `2px solid ${LINE}`, borderBottomWidth: 5, borderRadius: 22, padding: '28px 20px', display: 'grid', justifyItems: 'center', gap: 8, textAlign: 'center' },
  emptyBird: { width: 110, height: 110, objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.4 },
  emptyTitle: { margin: 0, fontSize: '1.3rem', fontWeight: 800 },
  emptyText: { margin: 0, color: MUTED, lineHeight: 1.5 },
  go: { marginTop: 8, width: '100%', padding: 16, fontSize: '1.1rem', fontWeight: 800, color: '#fff', background: '#ee6a1f', border: 0, borderBottom: '5px solid #c24f12', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' },
};
