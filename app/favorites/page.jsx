'use client';

// ההרפתקאות ששמרתי בלב

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TabBar from '../../components/TabBar';
import { loadFavorites, toggleFavorite } from '../../lib/favorites';

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState(null);

  useEffect(() => setFavorites(loadFavorites()), []);

  return (
    <main dir="rtl" style={st.page}>
      <h1 style={st.title}>המועדפים שלי</h1>
      {favorites === null ? null : favorites.length ? (
        <ul style={st.list}>
          {favorites.map((f) => (
            <li key={f.key} style={st.item}>
              <button type="button" style={st.open} onClick={() => router.push(f.href)}>
                <b style={st.name}>{f.title}</b>
                <span style={st.meta}>
                  {[f.region, f.stops ? `${f.stops} תחנות` : ''].filter(Boolean).join(' · ')}
                </span>
              </button>
              <button
                type="button"
                style={st.heart}
                aria-label={`הסרת ${f.title} מהמועדפים`}
                onClick={() => {
                  toggleFavorite(f);
                  setFavorites(loadFavorites());
                }}
              >
                ♥
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div style={st.empty}>
          <img src="/phoenix-pin.png" alt="" style={{ height: 90 }} />
          <p style={{ margin: 0 }}>עוד לא שמרתם הרפתקאות. לחצו על ♡ בעמוד של הרפתקה כדי לשמור אותה כאן.</p>
          <button type="button" style={st.cta} onClick={() => router.push('/new')}>
            למציאת הרפתקה
          </button>
        </div>
      )}
      <TabBar active="favorites" />
    </main>
  );
}

const st = {
  page: { minHeight: '100dvh', background: '#F6F9FC', color: '#14213D', fontFamily: '"Rubik", system-ui, sans-serif', maxWidth: 480, margin: '0 auto', padding: '28px 20px 130px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 },
  title: { margin: 0, fontSize: 26, fontWeight: 800 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 },
  item: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 20, padding: '6px 8px 6px 6px', boxShadow: '0 4px 14px rgba(20,33,61,.06)' },
  open: { flex: 1, minWidth: 0, display: 'grid', gap: 2, textAlign: 'start', background: 'none', border: 0, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' },
  name: { fontSize: 16 },
  meta: { fontSize: 13, color: '#5B6677' },
  heart: { width: 44, height: 44, borderRadius: '50%', border: 0, background: '#FFF0F0', color: '#E5484D', fontSize: 20, cursor: 'pointer' },
  empty: { display: 'grid', justifyItems: 'center', gap: 14, textAlign: 'center', color: '#5B6677', background: '#fff', borderRadius: 24, padding: 28, lineHeight: 1.5 },
  cta: { border: 0, borderRadius: 999, background: '#F26B1D', color: '#fff', fontWeight: 700, fontSize: 16, padding: '12px 24px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 0 #C2520F' },
};
