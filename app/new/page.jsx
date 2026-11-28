'use client';

// "הרפתקאה חדשה": הכפתור העגול בסרגל התחתון.
// בוחרים "הפתע אותי" או "התאמה אישית" (אזור, משך, סגנון ההרפתקה), מאיפה יוצאים ומתי – ומקבלים הרפתקה.
// אפשר להגיע לכאן עם בחירות מוכנות: /new?region=גולן&duration=חצי יום&style=ברגוע&mode=custom

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { REGIONS, DURATIONS, STYLES, styleFrom } from '../../lib/adventure';
import { restoreProfile } from '../../lib/profile';
import OriginPicker from '../../components/OriginPicker';
import TabBar from '../../components/TabBar';
import { T, useSite } from '../../components/Site';

const TIMES = [];
for (let m = 5 * 60; m <= 18 * 60; m += 30) TIMES.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${m % 60 ? '30' : '00'}`);

export default function NewAdventurePage() {
  return (
    <Suspense>
      <NewAdventure />
    </Suspense>
  );
}

function NewAdventure() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useSite();
  const [mode, setMode] = useState(null);
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('');
  const [style, setStyle] = useState(''); // סגנון ההרפתקה
  const [depart, setDepart] = useState('');
  const [newOnly, setNewOnly] = useState(true); // רק מקומות שעוד לא ביקרתי בהם

  useEffect(() => {
    restoreProfile().then((p) => !p && router.replace('/welcome'));
    // בחירות שהגיעו בקישור (מאזור במסך הבית, או "בחירה אחרת")
    const r = params.get('region');
    const d = params.get('duration');
    const st = styleFrom(params.get('style'), params.get('level'));
    const m = params.get('mode');
    if (REGIONS.includes(r)) setRegion(r);
    if (DURATIONS.includes(d)) setDuration(d);
    if (st) setStyle(st);
    if (m === 'surprise') setMode('surprise');
    else if (m === 'custom' || r) setMode('custom');
    if (/^\d{2}:\d{2}$/.test(params.get('depart') || '')) setDepart(params.get('depart'));
    if (params.get('newOnly') === '0') setNewOnly(false);
  }, [params, router]);

  const ready = mode === 'surprise' || (mode === 'custom' && region && duration && style);

  function find() {
    if (!ready) return;
    const q = new URLSearchParams({ mode });
    if (mode === 'custom') {
      q.set('region', region);
      q.set('duration', duration);
      q.set('style', style);
    }
    if (depart) q.set('depart', depart);
    if (newOnly) q.set('newOnly', '1');
    q.set('t', Date.now().toString(36)); // כל לחיצה – הרפתקה חדשה (רענון של העמוד שומר את אותה אחת)
    router.push(`/adventure?${q.toString()}`);
  }

  const chips = (list, value, set) =>
    list.map((label) => (
      <button key={label} type="button" className={`chip${value === label ? ' on' : ''}`} aria-pressed={value === label} onClick={() => set(label)}>
        {label}
      </button>
    ));

  return (
    <div dir="rtl" className="app">
      <main className="screen">
        <button type="button" className="backPill" onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))} aria-label="חזרה אחורה">
          → חזרה
        </button>
        <section className="hero">
          <div className="bird">
            <img src="/phoenix-pin.png" alt="THV" />
          </div>
          <T k="new.title" as="h1" className="q" />

          <OriginPicker />

          <div className="tiles">
            <button type="button" className={`tile${mode === 'surprise' ? ' on' : ''}`} aria-pressed={mode === 'surprise'} onClick={() => setMode('surprise')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />
              </svg>
              <T k="new.surprise" />
            </button>
            <button type="button" className={`tile${mode === 'custom' ? ' on' : ''}`} aria-pressed={mode === 'custom'} onClick={() => setMode('custom')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="10" cy="12" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
              <T k="new.custom" />
            </button>
          </div>

          {mode === 'surprise' && <T k="new.surpriseNote" as="p" className="note" />}

          {mode === 'custom' && (
            <div className="panel">
              <div className="group">
                <span className="label">אזור</span>
                <div className="wrap">{chips(REGIONS, region, setRegion)}</div>
              </div>
              <div className="group">
                <span className="label">משך</span>
                <div className="three">{chips(DURATIONS, duration, setDuration)}</div>
              </div>
              <div className="group">
                <span className="label">סגנון ההרפתקה</span>
                <div className="three">{chips(STYLES, style, setStyle)}</div>
              </div>
            </div>
          )}

          <div className="depart">
            <span className="label">🕒 מתי יוצאים?</span>
            <div className="departRow">
              <button type="button" className={`chip${!depart ? ' on' : ''}`} aria-pressed={!depart} onClick={() => setDepart('')}>
                עכשיו
              </button>
              <select className={`chip sel${depart ? ' on' : ''}`} value={depart} onChange={(e) => setDepart(e.target.value)} aria-label="שעת יציאה">
                <option value="">בשעה...</option>
                {TIMES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <T k="new.trafficNote" as="small" className="small" />
          </div>

          <label className="newOnly">
            <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />
            <T k="new.newOnly" />
          </label>

          <button type="button" className={`find${ready ? ' ready' : ''}`} disabled={!ready} onClick={find}>
            {t('new.find')}
            <span className="arrow" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </span>
          </button>
        </section>
      </main>

      <TabBar active="new" />

      <style>{`
        :root { --bg:#F6F9FC; --ink:#14213D; --muted:#5B6677; --blue:#1E6FD9; --blue-dark:#1557AD; --blue-pale:#DCEAFB; --orange:#F26B1D; --orange-dark:#C2520F; --line:#E3EAF3; }
        html, body { margin: 0; background: var(--bg); color: var(--ink); }
        button, select { font: inherit; color: inherit; }
        .app { min-height: 100dvh; font-family: "Rubik", system-ui, -apple-system, sans-serif; background: var(--bg); }
        .screen { max-width: 480px; margin: 0 auto; padding: 20px 20px 120px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; }
        .hero { background: linear-gradient(180deg, #E6F1FD 0%, #FFFFFF 100%); border-radius: 28px; padding: 18px; box-shadow: 0 10px 30px rgba(30,111,217,.10); display: flex; flex-direction: column; gap: 14px; }
        .bird { height: 130px; display: flex; align-items: center; justify-content: center; }
        .bird img { height: 120px; width: auto; animation: hover 3.2s ease-in-out infinite; }
        @keyframes hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .q { margin: 0; font-size: 20px; font-weight: 700; text-align: center; }
        .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border-radius: 20px; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 76px; border: 2px solid var(--blue); background: #fff; color: var(--blue); box-shadow: 0 4px 0 var(--blue-pale); }
        .tile.on { background: var(--blue); color: #fff; box-shadow: 0 6px 0 var(--blue-dark); }
        .tile:active { transform: translateY(2px); }
        .note { margin: 0; font-size: 13px; color: var(--muted); text-align: center; }
        .panel { display: flex; flex-direction: column; gap: 12px; background: #fff; border-radius: 20px; padding: 14px; border: 1px solid var(--line); animation: open .2s ease-out; }
        @keyframes open { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .group, .depart { display: flex; flex-direction: column; gap: 8px; }
        .label { font-size: 13px; font-weight: 600; color: #3A4658; }
        .wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
        .departRow { display: grid; grid-template-columns: 1fr 1.4fr; gap: 6px; }
        .chip { border: 1px solid #D5DFEB; background: #fff; color: var(--ink); border-radius: 999px; padding: 8px 12px; font-size: 13px; cursor: pointer; min-height: 36px; }
        .chip.on { border-color: var(--blue); background: var(--blue); color: #fff; }
        .chip.sel { appearance: none; text-align: center; }
        .small { font-size: 12px; color: var(--muted); }
        .newOnly { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #3A4658; cursor: pointer; }
        .newOnly input { width: 20px; height: 20px; accent-color: var(--blue); }
        .backPill { align-self: flex-start; border: 0; background: #fff; color: var(--ink); border-radius: 999px; padding: 9px 14px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(20,33,61,.10); margin-bottom: -6px; }
        .find { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 56px; border: none; border-radius: 999px; font-size: 17px; font-weight: 700; color: #fff; background: var(--orange); cursor: not-allowed; opacity: .45; }
        .find.ready { cursor: pointer; opacity: 1; box-shadow: 0 6px 0 var(--orange-dark); }
        .find.ready:active { transform: translateY(2px); box-shadow: 0 4px 0 var(--orange-dark); }
        .arrow { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; }
        .tile:focus-visible, .chip:focus-visible, .find:focus-visible { outline: 3px solid var(--orange); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .bird img, .panel { animation: none; } }
      `}</style>
    </div>
  );
}
