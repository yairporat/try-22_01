'use client';

// עמוד "המפה שלי": כל המקומות שהגעתי אליהם בהרפתקאות, עם פניקס על המפה ורשימה.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import VisitedMap from '../../components/VisitedMap';
import { formatDate, lastVisit, loadVisited, visitedList } from '../../lib/visited';

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [visited, setVisited] = useState(null);
  const [total, setTotal] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setVisited(visitedList(loadVisited()));
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

        {visited.length === 0 ? (
          <section style={st.empty}>
            <img src="/phoenix.webp" alt="" style={st.emptyBird} />
            <h2 style={st.emptyTitle}>המפה עוד ריקה</h2>
            <p style={st.emptyText}>
              בכל פעם שתגיעו לתחנה בהרפתקה, יופיע עליה פניקס כאן במפה.
            </p>
            <button type="button" style={st.go} onClick={() => router.push('/')}>
              יוצאים להרפתקה
            </button>
          </section>
        ) : (
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
                <b style={st.statBig}>{visits}</b>
                <span style={st.statLabel}>ביקורים</span>
              </div>
            </div>
            {total ? (
              <div style={st.bar} aria-label={`ביקרת ב-${visited.length} מתוך ${total} מקומות`}>
                <span style={{ ...st.barFill, width: `${Math.min(100, (visited.length / total) * 100)}%` }} />
              </div>
            ) : null}

            <VisitedMap ref={mapRef} places={visited} onSelect={setSelected} />

            <h2 style={st.listTitle}>כל המקומות ({visited.length})</h2>
            <ul style={st.list}>
              {visited.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    style={{ ...st.item, ...(selected === p.id ? st.itemOn : null) }}
                    onClick={() => {
                      setSelected(p.id);
                      mapRef.current?.focus(p.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <img src="/phoenix.webp" alt="" style={st.itemBird} />
                    <span style={st.itemText}>
                      <b style={st.itemName}>{p.name}</b>
                      <span style={st.itemMeta}>
                        {p.region} · {p.type} · {formatDate(lastVisit(p))}
                      </span>
                      <span style={st.itemMeta}>
                        {p.visits.length > 1 ? `${p.visits.length} ביקורים · ` : ''}
                        {p.visits[p.visits.length - 1].adventure}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <nav style={st.tabs} aria-label="ניווט ראשי">
        <button type="button" style={st.tab} onClick={() => router.push('/')}>
          <Icon d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" />
          <span>בית</span>
        </button>
        <button type="button" style={{ ...st.tab, ...st.tabOn }} aria-current="page">
          <Icon d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
          <span>מפה</span>
        </button>
        <button type="button" style={st.tab}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
          <span>פרופיל</span>
        </button>
      </nav>
    </div>
  );
}

function Icon({ d }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
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
  listTitle: { margin: '6px 0 0', fontSize: '0.85rem', fontWeight: 700, color: MUTED },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 },
  item: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start', background: '#fff', border: `2px solid ${LINE}`, borderBottomWidth: 5, borderRadius: 18, padding: '10px 12px', cursor: 'pointer', font: 'inherit', color: 'inherit' },
  itemOn: { borderColor: BLUE },
  itemBird: { width: 44, height: 44, objectFit: 'contain', flex: '0 0 auto' },
  itemText: { display: 'grid', gap: 2, minWidth: 0 },
  itemName: { fontSize: '1.05rem', fontWeight: 800 },
  itemMeta: { fontSize: '0.82rem', color: MUTED },
  empty: { background: '#fff', border: `2px solid ${LINE}`, borderBottomWidth: 5, borderRadius: 22, padding: '28px 20px', display: 'grid', justifyItems: 'center', gap: 8, textAlign: 'center' },
  emptyBird: { width: 110, height: 110, objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.4 },
  emptyTitle: { margin: 0, fontSize: '1.3rem', fontWeight: 800 },
  emptyText: { margin: 0, color: MUTED, lineHeight: 1.5 },
  go: { marginTop: 8, width: '100%', padding: 16, fontSize: '1.1rem', fontWeight: 800, color: '#fff', background: '#ee6a1f', border: 0, borderBottom: '5px solid #c24f12', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' },
  tabs: {
    position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: 'min(440px, calc(100% - 28px))',
    display: 'flex', justifyContent: 'space-around', gap: 4, padding: '6px 6px calc(6px + env(safe-area-inset-bottom))',
    background: '#fff', border: `2px solid ${LINE}`, borderRadius: 30, boxShadow: '0 6px 22px rgba(20, 33, 43, 0.08)', boxSizing: 'border-box', zIndex: 1000,
  },
  tab: { flex: 1, display: 'grid', justifyItems: 'center', gap: 2, padding: '8px 0', background: 'transparent', border: 0, borderRadius: 22, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', color: INK, fontFamily: 'inherit' },
  tabOn: { background: '#eef2f6', color: BLUE },
};
