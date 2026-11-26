'use client';

// סרגל הלשוניות התחתון (בית / מפה / פרופיל) לעמודים שאינם מסך הבית.

import { useRouter } from 'next/navigation';

const TABS = [
  { id: 'home', label: 'בית', href: '/', icon: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" /> },
  { id: 'map', label: 'מפה', href: '/map', icon: <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /> },
  {
    id: 'profile',
    label: 'פרופיל',
    href: '/profile',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </>
    ),
  },
];

export default function TabBar({ active }) {
  const router = useRouter();
  return (
    <nav style={s.tabs} aria-label="ניווט ראשי">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          style={{ ...s.tab, ...(t.id === active ? s.on : null) }}
          aria-current={t.id === active ? 'page' : undefined}
          onClick={() => t.id !== active && router.push(t.href)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {t.icon}
          </svg>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// לפי העיצוב החדש: סרגל לבן שטוח בתחתית המסך
const s = {
  tabs: {
    position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, paddingBottom: 'env(safe-area-inset-bottom)',
    background: '#fff', borderTop: '1px solid #E3EAF3', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    alignItems: 'center', zIndex: 1000, boxSizing: 'content-box',
  },
  tab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', background: 'none', border: 0,
    fontSize: 11, cursor: 'pointer', color: '#5B6677', fontFamily: '"Rubik", system-ui, sans-serif',
  },
  on: { color: '#1E6FD9', fontWeight: 600 },
};
