'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdventureMap from '../../components/AdventureMap';
import TypeIcon from '../../components/TypeIcon';
import Timeline from '../../components/Timeline';
import FitNotice from '../../components/FitNotice';
import { resolveOrigin } from '../../lib/origin';
import { formatMinutes } from '../../lib/travel';
import { loadProfile } from '../../lib/profile';

export default function AdventurePage() {
  return (
    <Suspense>
      <AdventurePreview />
    </Suspense>
  );
}

function AdventurePreview() {
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [locStatus, setLocStatus] = useState('pending');
  const [adventure, setAdventure] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();

  // קודם מבררים מאיפה יוצאים (המיקום שלי או עיר), ואז שולחים את הבחירות ומקבלים הרפתקה מתאימה
  useEffect(() => {
    let alive = true;
    setAdventure(null);
    setError('');
    resolveOrigin().then((origin) => {
      if (!alive) return;
      const q = new URLSearchParams(query);
      if (origin) {
        q.set('olat', origin.lat.toFixed(5));
        q.set('olng', origin.lng.toFixed(5));
        q.set('olabel', origin.label);
      }
      return fetch(`/api/find-adventure?${q.toString()}`)
        .then((res) => res.json())
        .then((data) => alive && (data.error ? setError(data.error) : setAdventure(data)));
    }).catch(() => alive && setError('לא הצלחנו לטעון את ההרפתקה. בדקו את החיבור ונסו שוב.'));
    return () => {
      alive = false;
    };
  }, [query]);

  // המיקום של המשתמש (הדפדפן מבקש הרשאה בפעם הראשונה)
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus('unsupported');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocStatus('ok');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => setSelected(null), [query]);

  // "יוצאים להרפתקה": פותחים הרפתקה בשרת (adventure_runs) ושומרים אותה במכשיר
  const handleStart = async () => {
    setStarting(true);
    const profile = loadProfile();
    let runId = null;
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adventure_title: adventure.title,
          adventure_ref: adventure.curatedId || null,
          stop_ids: adventure.stops.map((s) => s.id),
          user_name: profile?.name || null,
          user_email: profile?.email || null,
        }),
      });
      runId = (await res.json()).id || null;
    } catch {}
    try {
      localStorage.setItem('thv-trip', JSON.stringify({ adventure, runId, current: 0, verified: {}, startedAt: Date.now() }));
    } catch {}
    router.push('/adventure/go');
  };

  if (error || !adventure) {
    return (
      <main dir="rtl" style={st.page}>
        <button type="button" style={st.back} onClick={() => router.push('/')}>→ חזרה</button>
        <p style={st.status}>{error || 'מאתרים את המיקום שלך ומחפשים הרפתקה...'}</p>
      </main>
    );
  }

  if (!adventure.stops.length) {
    return (
      <main dir="rtl" style={st.page}>
        <button type="button" style={st.back} onClick={() => router.push('/')}>→ חזרה</button>
        <p style={st.status}>עוד אין מקומות שמתאימים לבחירה הזו ב{adventure.region}. נסו רמת קושי אחרת או אזור אחר.</p>
      </main>
    );
  }

  const total = adventure.plan?.origin ? adventure.plan.totalMinutes : adventure.totalMinutes;

  return (
    <main dir="rtl" style={st.page}>
      <button type="button" style={st.back} onClick={() => router.push('/')}>→ חזרה</button>

      <header style={st.head}>
        <h1 style={st.title}>{adventure.title}</h1>
        {adventure.description ? <p style={st.lead}>{adventure.description}</p> : null}
        <div style={st.chips}>
          <span style={st.chip}>⏱ כ-{formatMinutes(total)}</span>
          <span style={st.chip}>{adventure.region}</span>
          <span style={st.chip}>{adventure.difficulty}</span>
          <span style={st.chip}>{adventure.stops.length} תחנות</span>
        </div>
      </header>

      <FitNotice
        adventure={adventure}
        onPick={(sug) => {
          const q = new URLSearchParams({ mode: 'custom', region: sug.region, duration: sug.duration, level: sug.level });
          if (sug.placeId) q.set('id', sug.placeId);
          router.push(`/adventure?${q.toString()}`);
        }}
        onChooseOther={() => router.push('/')}
      />

      <AdventureMap stops={adventure.stops} userPos={userPos} selected={selected} onSelect={setSelected} height={200} />

      <ol style={st.list} aria-label="התחנות לפי הסדר">
        {adventure.stops.map((s, i) => (
          <li key={s.id} style={{ ...st.item, ...(selected === i ? st.itemOn : null) }} onClick={() => setSelected(i)}>
            <span style={st.num}>{i + 1}</span>
            <span
              style={{
                ...st.thumb,
                ...(s.image ? { backgroundImage: `url(${s.image})` } : null),
              }}
              aria-hidden="true"
            >
              {s.image ? null : <TypeIcon type={s.type} size={20} />}
            </span>
            <span style={st.name}>{s.name}</span>
            <span style={st.tag}>
              <TypeIcon type={s.type} />
              {s.type}
            </span>
          </li>
        ))}
      </ol>

      <details style={st.more}>
        <summary style={st.moreSum}>לוח זמנים ונסיעות</summary>
        <div style={{ marginTop: 12 }}>
          <Timeline adventure={adventure} />
        </div>
      </details>
      {locStatus === 'denied' && <p style={st.hint}>אין גישה למיקום, ולכן הזמן לא כולל את הנסיעה אליכם וחזרה.</p>}

      <footer style={st.footer}>
        <button type="button" style={st.start} onClick={handleStart} disabled={starting}>
          {starting ? 'יוצאים...' : 'יוצאים להרפתקה'}
        </button>
      </footer>
    </main>
  );
}

const INK = '#14213D';
const MUTED = '#5B6677';
const LINE = '#E3EAF3';
const st = {
  page: { minHeight: '100vh', background: '#F6F9FC', color: INK, fontFamily: '"Rubik", system-ui, sans-serif', maxWidth: 480, margin: '0 auto', padding: '16px 20px 120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 },
  back: { alignSelf: 'flex-start', background: 'none', border: 0, color: '#1E6FD9', fontSize: 15, fontWeight: 600, padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit' },
  status: { textAlign: 'center', color: MUTED, fontSize: 16, lineHeight: 1.6, marginTop: 40 },
  head: { display: 'grid', gap: 8 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, textWrap: 'balance' },
  lead: { margin: 0, color: MUTED, fontSize: 15, lineHeight: 1.5 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 600 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 },
  item: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 18, padding: 8, boxShadow: '0 4px 14px rgba(20,33,61,.06)', border: '2px solid transparent', cursor: 'pointer' },
  itemOn: { borderColor: '#1E6FD9' },
  num: { width: 26, height: 26, borderRadius: '50%', background: '#F26B1D', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' },
  thumb: { width: 48, height: 48, borderRadius: 12, flex: '0 0 auto', background: '#DCEAFB center/cover no-repeat', color: '#1E6FD9', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EAF2FE', color: '#1557AD', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, flex: '0 0 auto' },
  more: { background: '#fff', borderRadius: 18, padding: '12px 14px', border: `1px solid ${LINE}` },
  moreSum: { cursor: 'pointer', fontWeight: 600, fontSize: 15 },
  hint: { margin: 0, fontSize: 13, color: MUTED },
  footer: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top, #F6F9FC 75%, rgba(246,249,252,0))', display: 'flex', justifyContent: 'center', zIndex: 1000 },
  start: { width: '100%', maxWidth: 440, minHeight: 56, border: 0, borderRadius: 999, background: '#F26B1D', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 0 #C2520F', fontFamily: 'inherit' },
};
