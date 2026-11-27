'use client';

// הסרגל התחתון לכל העמודים: בית · מפה · [+ הרפתקאה חדשה] · מועדפים · פרופיל
// הכפתור העגול באמצע פותח את מסך "הרפתקאה חדשה".

import { useRouter } from 'next/navigation';
import { useSite } from './Site';

const ICONS = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" />,
  map: <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />,
  favorites: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
};

const SIDE_A = [
  { id: 'home', href: '/' },
  { id: 'map', href: '/map' },
];
const SIDE_B = [
  { id: 'favorites', href: '/favorites' },
  { id: 'profile', href: '/profile' },
];

export default function TabBar({ active }) {
  const router = useRouter();
  const { t } = useSite();

  const tab = (x) => {
    const on = x.id === active;
    return (
      <button
        key={x.id}
        type="button"
        style={{ ...s.tab, ...(on ? s.on : null) }}
        aria-current={on ? 'page' : undefined}
        onClick={() => !on && router.push(x.href)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill={on && x.id === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {ICONS[x.id]}
        </svg>
        <span>{t(`tabs.${x.id}`)}</span>
      </button>
    );
  };

  return (
    <nav style={s.wrap} aria-label="ניווט ראשי">
      <div style={s.bar}>
        {SIDE_A.map(tab)}
        <div style={s.center}>
          <button type="button" style={{ ...s.fab, ...(active === 'new' ? s.fabOn : null) }} onClick={() => router.push('/new')} aria-label={t('tabs.new')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span style={{ ...s.fabLabel, ...(active === 'new' ? s.on : null) }}>{t('tabs.new')}</span>
        </div>
        {SIDE_B.map(tab)}
      </div>
    </nav>
  );
}

const font = '"Rubik", system-ui, sans-serif';
const s = {
  wrap: { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', pointerEvents: 'none' },
  bar: {
    pointerEvents: 'auto', width: '100%', maxWidth: 520, height: 70, paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'content-box',
    background: '#fff', borderRadius: '26px 26px 0 0', boxShadow: '0 -6px 24px rgba(20,33,61,.08)',
    display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr 1fr 1fr', alignItems: 'center',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', background: 'none', border: 0,
    fontSize: 11, cursor: 'pointer', color: '#8A96A8', fontFamily: font,
  },
  on: { color: '#1E6FD9', fontWeight: 600 },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: -34 },
  fab: {
    width: 62, height: 62, borderRadius: '50%', border: '5px solid #fff', background: 'linear-gradient(160deg,#F7893F,#F26B1D)',
    boxShadow: '0 8px 18px rgba(242,107,29,.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
  },
  fabOn: { background: 'linear-gradient(160deg,#2F80ED,#1E6FD9)', boxShadow: '0 8px 18px rgba(30,111,217,.40)' },
  fabLabel: { fontSize: 11, fontWeight: 700, color: '#C2520F', fontFamily: font, whiteSpace: 'nowrap' },
};
