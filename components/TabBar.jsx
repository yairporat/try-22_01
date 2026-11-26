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

const s = {
  tabs: {
    position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: 'min(440px, calc(100% - 28px))',
    display: 'flex', justifyContent: 'space-around', gap: 4, padding: '6px 6px calc(6px + env(safe-area-inset-bottom))',
    background: '#fff', border: '2px solid #e3e9ef', borderRadius: 30, boxShadow: '0 6px 22px rgba(20, 33, 43, 0.08)',
    boxSizing: 'border-box', zIndex: 1000,
  },
  tab: {
    flex: 1, display: 'grid', justifyItems: 'center', gap: 2, padding: '8px 0', background: 'transparent', border: 0,
    borderRadius: 22, fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', color: '#14212b', fontFamily: 'inherit',
  },
  on: { background: '#eef2f6', color: '#1f78a8' },
};
