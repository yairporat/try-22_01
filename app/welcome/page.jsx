'use client';

// מסך הפתיחה: מופיע למשתמשים חדשים לפני המסך הראשי.
// "בואו נתחיל" → הרשמה. "כבר יש לי חשבון" → התחברות לפי אימייל.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadProfile } from '../../lib/profile';

export default function WelcomePage() {
  const router = useRouter();

  // מי שכבר רשום – ישר למסך הראשי
  useEffect(() => {
    if (loadProfile()) router.replace('/');
  }, [router]);

  return (
    <main dir="rtl" style={st.page}>
      <div style={st.brand}>
        <img src="/phoenix-pin.png" alt="" style={st.bird} />
        <span style={st.thv}>THV</span>
      </div>

      <h1 style={st.title}>
        ברוכים הבאים ל-
        <span style={st.name} dir="ltr">THE HIDDEN VALLEY</span>
      </h1>
      <p style={st.sub}>גלו הרפתקאות נסתרות בטבע של ישראל</p>

      <Landscape />

      <div style={st.actions}>
        <button type="button" style={st.primary} onClick={() => router.push('/profile?mode=signup&next=/')}>
          בואו נתחיל
        </button>
        <button type="button" style={st.link} onClick={() => router.push('/profile?mode=login&next=/')}>
          כבר יש לי חשבון
        </button>
      </div>
    </main>
  );
}

// איור: עמק עם הרים, נחל ועצים, ומטייל בכחול וכתום
function Landscape() {
  return (
    <svg viewBox="0 0 360 250" style={st.art} role="img" aria-label="מטייל משקיף על עמק ירוק עם נחל">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFE8FB" />
          <stop offset="1" stopColor="#F1F8FE" />
        </linearGradient>
        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7CC0F2" />
          <stop offset="1" stopColor="#1E6FD9" />
        </linearGradient>
        <clipPath id="frame">
          <rect width="360" height="250" rx="28" />
        </clipPath>
      </defs>
      <g clipPath="url(#frame)">
        <rect width="360" height="250" fill="url(#sky)" />
        <circle cx="282" cy="58" r="24" fill="#FFC56B" />
        <circle cx="282" cy="58" r="36" fill="#FFC56B" opacity=".22" />
        <path d="M60 50c8-10 26-10 32 0 10-2 18 4 16 12H48c-4-6 2-12 12-12z" fill="#fff" opacity=".9" />
        <path d="M178 34c6-8 20-8 25 0 8-1 13 3 12 9h-45c-3-5 1-9 8-9z" fill="#fff" opacity=".8" />
        {/* הרים רחוקים */}
        <path d="M0 140 L58 82 L104 122 L160 66 L222 118 L270 88 L360 138 V250 H0Z" fill="#9CC3E6" />
        <path d="M160 66 L176 82 L168 84 L160 76 L150 86 L144 82Z" fill="#fff" opacity=".85" />
        {/* גבעות */}
        <path d="M0 158 C60 126 120 150 180 138 C240 126 300 146 360 132 V250 H0Z" fill="#7FC28B" />
        <path d="M0 188 C70 160 130 186 200 172 C260 160 310 176 360 166 V250 H0Z" fill="#4FA868" />
        {/* נחל */}
        <path d="M168 150 C150 172 214 182 184 204 C160 222 214 236 196 250 H238 C254 232 206 220 228 200 C252 180 192 170 204 150Z" fill="url(#river)" opacity=".9" />
        {/* עצים */}
        {[
          [40, 176, 1],
          [70, 186, 0.8],
          [292, 168, 1],
          [322, 176, 0.85],
          [120, 170, 0.7],
        ].map(([x, y, k]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
            <rect x="-3" y="0" width="6" height="16" rx="2" fill="#7A5534" />
            <path d="M0 -34 L18 4 H-18Z" fill="#2F7D4C" />
            <path d="M0 -46 L14 -12 H-14Z" fill="#3B9259" />
          </g>
        ))}
        {/* סלע ומטייל */}
        <path d="M232 234 C240 214 292 208 318 224 L330 250 H226Z" fill="#8A7A6A" />
        <path d="M244 226 C258 216 290 214 306 224" stroke="#A3968A" strokeWidth="4" fill="none" strokeLinecap="round" />
        <g transform="translate(270 150)">
          {/* מקל הליכה */}
          <path d="M22 26 L32 68" stroke="#7A5534" strokeWidth="3" strokeLinecap="round" />
          {/* רגליים */}
          <path d="M-2 40 L-8 66" stroke="#14213D" strokeWidth="7" strokeLinecap="round" />
          <path d="M6 40 L14 64" stroke="#14213D" strokeWidth="7" strokeLinecap="round" />
          <path d="M-12 68 h9" stroke="#3A2A1E" strokeWidth="5" strokeLinecap="round" />
          <path d="M12 66 h9" stroke="#3A2A1E" strokeWidth="5" strokeLinecap="round" />
          {/* תרמיל כתום */}
          <rect x="-16" y="8" width="16" height="26" rx="6" fill="#F26B1D" />
          <rect x="-14" y="22" width="12" height="7" rx="3" fill="#C2520F" />
          {/* גוף כחול */}
          <path d="M-4 6 C-4 0 12 0 14 6 L16 42 H-6Z" fill="#1E6FD9" />
          {/* זרוע */}
          <path d="M10 12 L22 28" stroke="#1557AD" strokeWidth="6" strokeLinecap="round" />
          {/* ראש וכובע */}
          <circle cx="5" cy="-6" r="8" fill="#F1C7A0" />
          <path d="M-5 -9 C-4 -18 14 -18 15 -9Z" fill="#F26B1D" />
          <path d="M12 -10 h7" stroke="#F26B1D" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

const st = {
  page: {
    minHeight: '100dvh',
    boxSizing: 'border-box',
    maxWidth: 480,
    margin: '0 auto',
    padding: '28px 20px calc(24px + env(safe-area-inset-bottom))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
    background: 'linear-gradient(180deg,#EAF4FD 0%,#F6F9FC 55%)',
    color: '#14213D',
    fontFamily: '"Rubik", system-ui, sans-serif',
  },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 },
  bird: { width: 84, height: 84, objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(242,107,29,.25))' },
  thv: { fontSize: 13, fontWeight: 800, letterSpacing: '0.3em', color: '#1E6FD9', marginTop: -4 },
  title: { margin: '8px 0 0', fontSize: 26, lineHeight: 1.25, fontWeight: 700 },
  name: { display: 'block', fontSize: 30, fontWeight: 800, color: '#1E6FD9', letterSpacing: '0.02em' },
  sub: { margin: 0, color: '#5B6677', fontSize: 16 },
  art: { width: '100%', height: 'auto', margin: '10px 0 4px', filter: 'drop-shadow(0 12px 24px rgba(20,33,61,.12))' },
  actions: { width: '100%', display: 'grid', gap: 6, marginTop: 'auto', paddingTop: 12 },
  primary: {
    border: 0,
    borderRadius: 999,
    padding: '16px 0',
    fontSize: 18,
    fontWeight: 700,
    background: '#F26B1D',
    color: '#fff',
    boxShadow: '0 5px 0 #C2520F',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  link: { background: 'none', border: 0, padding: 12, color: '#1E6FD9', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
};
