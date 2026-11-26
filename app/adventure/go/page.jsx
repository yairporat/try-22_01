'use client';

// מסך הניווט: תחנה אחרי תחנה. מנווטים לתחנה, מאמתים הגעה לפי המיקום (או מדלגים),
// ובסוף מסיימים את ההרפתקה ורואים סיכום.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdventureMap from '../../../components/AdventureMap';
import { airKm, driveTime, formatKm, formatMinutes, hasCoords, wazeLink } from '../../../lib/travel';
import { equipmentFor } from '../../../lib/equipment';
import FeedbackForm from '../../../components/FeedbackForm';

const STORAGE_KEY = 'thv-trip';
// במרחק כזה (במטרים) מהתחנה נחשבים "הגעתי"
const ARRIVAL_METERS = 400;

function loadTrip() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
function saveTrip(trip) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
  } catch {}
}

export default function GoPage() {
  const router = useRouter();
  const [trip, setTrip] = useState(undefined); // undefined = טוען, null = אין הרפתקה
  const [userPos, setUserPos] = useState(null);
  const [locStatus, setLocStatus] = useState('pending');
  const [drive, setDrive] = useState(null);
  // idle | checking | arrived | far | noLocation
  const [verify, setVerify] = useState({ state: 'idle' });
  const [confirmExit, setConfirmExit] = useState(false);
  const lastFix = useRef(null); // המיקום האחרון שהתקבל, עם הזמן שבו התקבל

  useEffect(() => setTrip(loadTrip()), []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus('unsupported');
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        lastFix.current = { ...me, at: Date.now() };
        setUserPos(me);
        setLocStatus('ok');
      },
      (err) => setLocStatus(err.code === 1 ? 'denied' : 'pending'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const stops = trip?.adventure?.stops || [];
  const current = trip?.current ?? 0;
  const stop = stops[current];
  const finished = trip && current >= stops.length;
  const isLast = current === stops.length - 1;

  // מרחק בקו אווירי – מתעדכן כל הזמן
  const airMeters = userPos && hasCoords(stop) ? airKm(userPos, stop) * 1000 : null;

  // זמן נסיעה – מחושב מחדש כשמגיעים לתחנה חדשה, או כשזזים יותר מקילומטר
  const driveKey = userPos && hasCoords(stop) ? `${current}:${userPos.lat.toFixed(2)},${userPos.lng.toFixed(2)}` : '';
  useEffect(() => {
    setDrive(null);
    if (!driveKey) return;
    let alive = true;
    driveTime(userPos, stop).then((r) => alive && setDrive(r));
    return () => {
      alive = false;
    };
  }, [driveKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(next) {
    setTrip(next);
    saveTrip(next);
    setVerify({ state: 'idle' });
    window.scrollTo(0, 0);
  }

  function advance(result) {
    const results = [...(trip.results || [])];
    results[current] = result;
    const next = { ...trip, results, current: current + 1 };
    if (current + 1 >= stops.length) next.finishedAt = Date.now();
    update(next);
  }

  function judge(me) {
    const meters = airKm(me, stop) * 1000;
    // מתחשבים בדיוק של ה-GPS, עד קילומטר
    const slack = Math.min(me.accuracy || 0, 1000);
    if (meters - slack <= ARRIVAL_METERS) setVerify({ state: 'arrived', verified: true });
    else setVerify({ state: 'far', meters });
  }

  function checkArrival() {
    if (!hasCoords(stop)) return setVerify({ state: 'noLocation', reason: 'stop' });
    if (!navigator.geolocation) return setVerify({ state: 'noLocation', reason: 'device' });
    // מיקום מהשניות האחרונות מספיק טוב
    if (lastFix.current && Date.now() - lastFix.current.at < 15000) return judge(lastFix.current);
    setVerify({ state: 'checking' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        lastFix.current = { ...me, at: Date.now() };
        setUserPos(me);
        judge(me);
      },
      (err) => {
        if (err.code !== 1 && lastFix.current) return judge(lastFix.current);
        setVerify({ state: 'noLocation', reason: err.code === 1 ? 'permission' : 'timeout' });
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
    );
  }

  if (trip === undefined) return <main dir="rtl" style={st.page} />;

  if (!trip || !stops.length) {
    return (
      <main dir="rtl" style={st.page}>
        <p style={st.empty}>אין הרפתקה פעילה. בחרו הרפתקה במסך הבית.</p>
        <button type="button" style={st.primary} onClick={() => router.push('/')}>
          למסך הבית
        </button>
      </main>
    );
  }

  if (finished) {
    return (
      <Summary
        trip={trip}
        onHome={() => { saveTrip(null); router.push('/'); }}
        onFeedback={(feedback) => {
          const next = { ...trip, feedback };
          setTrip(next);
          saveTrip(next);
        }}
      />
    );
  }

  const done = (trip.results || []).length;

  return (
    <main dir="rtl" style={st.page}>
      {/* פס עליון: התקדמות */}
      <header style={st.top}>
        <div style={st.topRow}>
          <b style={st.counter}>
            תחנה {current + 1} מתוך {stops.length}
          </b>
          <button type="button" style={st.exit} onClick={() => setConfirmExit(true)}>
            יציאה
          </button>
        </div>
        <div style={st.progress} aria-hidden="true">
          {stops.map((s, i) => (
            <span
              key={s.id}
              style={{
                ...st.seg,
                background:
                  i < done
                    ? trip.results[i] === 'skipped'
                      ? '#cbd5e1'
                      : '#22a06b'
                    : i === current
                      ? '#f2653a'
                      : '#e3e9ef',
              }}
            />
          ))}
        </div>
        {confirmExit && (
          <div style={st.confirm}>
            <span>לצאת מההרפתקה? ההתקדמות לא תישמר.</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={st.confirmYes} onClick={() => { saveTrip(null); router.push('/'); }}>
                כן, לצאת
              </button>
              <button type="button" style={st.confirmNo} onClick={() => setConfirmExit(false)}>
                להמשיך
              </button>
            </div>
          </div>
        )}
      </header>

      <AdventureMap stops={stops} userPos={userPos} selected={current} focus={current} height={260} />

      {/* מרחק וזמן לתחנה */}
      <section style={st.eta}>
        <p style={st.etaLabel}>בדרך אל</p>
        <h1 style={st.name}>{stop.name}</h1>
        {userPos && hasCoords(stop) ? (
          <div style={st.etaRow}>
            <div style={st.etaBox}>
              <b style={st.etaBig}>{drive ? `${drive.estimated ? 'כ-' : ''}${formatMinutes(drive.minutes)}` : '...'}</b>
              <span style={st.etaSmall}>נסיעה</span>
            </div>
            <div style={st.etaBox}>
              <b style={st.etaBig}>{drive ? formatKm(drive.km) : '...'}</b>
              <span style={st.etaSmall}>בכביש</span>
            </div>
            <div style={st.etaBox}>
              <b style={st.etaBig}>{airMeters < 1000 ? `${Math.round(airMeters)} מ'` : formatKm(airMeters / 1000)}</b>
              <span style={st.etaSmall}>בקו אווירי</span>
            </div>
          </div>
        ) : (
          <p style={st.hint}>
            {locStatus === 'pending' && 'מאתרים את המיקום שלך...'}
            {locStatus === 'denied' && 'כדי לראות מרחק וזמן נסיעה, אפשרו גישה למיקום בהגדרות הדפדפן.'}
            {locStatus === 'unsupported' && 'המכשיר לא תומך באיתור מיקום.'}
            {locStatus === 'ok' && !hasCoords(stop) && 'למקום הזה אין מיקום מדויק. השתמשו בכפתור הניווט.'}
          </p>
        )}
        <div style={st.navRow}>
          <a href={stop.mapsLink} target="_blank" rel="noreferrer" style={st.navBtn}>
            נווט ב-Google Maps
          </a>
          {hasCoords(stop) && (
            <a href={wazeLink(stop)} target="_blank" rel="noreferrer" style={{ ...st.navBtn, ...st.waze }}>
              נווט ב-Waze
            </a>
          )}
        </div>
      </section>

      {/* פרטי התחנה */}
      <StopInfo stop={stop} />

      {/* אימות הגעה / דילוג */}
      <footer style={st.footer}>
        <VerifyPanel
          verify={verify}
          isLast={isLast}
          stopName={stop.name}
          onCheck={checkArrival}
          onManual={() => setVerify({ state: 'arrived', verified: false })}
          onNext={() => advance(verify.verified ? 'verified' : 'manual')}
          onSkip={() => advance('skipped')}
        />
      </footer>
    </main>
  );
}

function StopInfo({ stop }) {
  const gear = useMemo(() => equipmentFor(stop), [stop]);
  const sections = [
    stop.parking && { title: 'חניה', icon: '🅿️', body: <p style={st.p}>{stop.parking}</p> },
    {
      title: 'ציוד מומלץ',
      icon: '🎒',
      body: (
        <>
          <ul style={st.ul}>
            {gear.items.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          {gear.general && <p style={st.small}>המלצה כללית לפי סוג המקום והאזור.</p>}
        </>
      ),
    },
    stop.tips && { title: 'חשוב לדעת', icon: '⚠️', body: <p style={st.p}>{stop.tips}</p> },
    stop.hours && { title: 'שעות פתיחה', icon: '🕒', body: <p style={st.p}>{stop.hours}</p> },
  ].filter(Boolean);

  return (
    <section style={st.info}>
      <div style={st.tags}>
        <span style={st.tag}>{stop.type}</span>
        <span style={st.tag}>{stop.difficulty}</span>
        <span style={st.tag}>ביקור: {stop.visitTime}</span>
      </div>
      {stop.description && <p style={st.desc}>{stop.description}</p>}
      <div style={{ display: 'grid', gap: 10 }}>
        {sections.map((s, i) => (
          <details key={s.title} open={i < 2} style={st.details}>
            <summary style={st.summary}>
              <span aria-hidden="true">{s.icon}</span> {s.title}
            </summary>
            <div style={st.detailsBody}>{s.body}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function VerifyPanel({ verify, isLast, stopName, onCheck, onManual, onNext, onSkip }) {
  const nextLabel = isLast ? 'סיום ההרפתקה' : 'המשך לתחנה הבאה';

  if (verify.state === 'arrived') {
    return (
      <div style={st.vbox}>
        <p style={st.success}>✓ {verify.verified ? 'אימתנו שהגעת אל' : 'אישרת שהגעת אל'} {stopName}</p>
        <button type="button" style={isLast ? st.finish : st.primary} onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    );
  }

  return (
    <div style={st.vbox}>
      {verify.state === 'far' && (
        <p style={st.warn}>
          נראה שאתם עדיין לא שם: התחנה במרחק{' '}
          {verify.meters < 1000 ? `${Math.round(verify.meters)} מטר` : formatKm(verify.meters / 1000)}. נסו שוב כשתגיעו.
        </p>
      )}
      {verify.state === 'noLocation' && (
        <div style={st.warnBox}>
          <p style={{ margin: 0 }}>
            {verify.reason === 'stop' && 'לתחנה הזו אין מיקום מדויק, ולכן אי אפשר לאמת אוטומטית.'}
            {verify.reason === 'permission' && 'אין גישה למיקום, ולכן אי אפשר לאמת אוטומטית.'}
            {verify.reason === 'device' && 'המכשיר לא תומך באיתור מיקום.'}
            {verify.reason === 'timeout' && 'לא הצלחנו לקבל מיקום מה-GPS. אפשר לנסות שוב, או לאשר ידנית.'}
          </p>
          <button type="button" style={st.manual} onClick={onManual}>
            אני כאן, אישור ידני
          </button>
        </div>
      )}
      <button type="button" style={st.primary} onClick={onCheck} disabled={verify.state === 'checking'}>
        {verify.state === 'checking' ? 'בודקים את המיקום שלך...' : 'הגעתי! אימות מיקום'}
      </button>
      <button type="button" style={st.skip} onClick={onSkip}>
        {isLast ? 'דלג וסיים את ההרפתקה' : 'דלג לתחנה הבאה'}
      </button>
    </div>
  );
}

function Summary({ trip, onHome, onFeedback }) {
  const { stops } = trip.adventure;
  const results = trip.results || [];
  const visited = results.filter((r) => r !== 'skipped').length;
  const minutes = trip.finishedAt && trip.startedAt ? Math.round((trip.finishedAt - trip.startedAt) / 60000) : null;
  return (
    <main dir="rtl" style={{ ...st.page, paddingBottom: 40 }}>
      <section style={st.done}>
        <div style={st.trophy} aria-hidden="true">🏆</div>
        <h1 style={{ ...st.name, fontSize: 26 }}>סיימת את ההרפתקה!</h1>
        <p style={st.doneSub}>{trip.adventure.title}</p>
        <div style={st.etaRow}>
          <div style={st.etaBox}>
            <b style={st.etaBig}>
              {visited}/{stops.length}
            </b>
            <span style={st.etaSmall}>תחנות</span>
          </div>
          {minutes !== null && (
            <div style={st.etaBox}>
              <b style={st.etaBig}>{formatMinutes(Math.max(1, minutes))}</b>
              <span style={st.etaSmall}>משך</span>
            </div>
          )}
        </div>
      </section>
      <ol style={st.list}>
        {stops.map((s, i) => (
          <li key={s.id} style={st.listItem}>
            <span style={{ ...st.badge, background: results[i] === 'skipped' ? '#cbd5e1' : '#22a06b' }}>
              {results[i] === 'skipped' ? '–' : '✓'}
            </span>
            <span style={{ flex: 1 }}>{s.name}</span>
            <span style={st.small}>{results[i] === 'skipped' ? 'דילגת' : results[i] === 'manual' ? 'אישור ידני' : 'אומת במיקום'}</span>
          </li>
        ))}
      </ol>
      <FeedbackForm trip={trip} onSent={onFeedback} />
      <button type="button" style={st.primary} onClick={onHome}>
        חזרה למסך הבית
      </button>
    </main>
  );
}

const BLUE = '#2f80ed';
const BLUE_DARK = '#1c5fb8';
const ORANGE = '#f2653a';
const ORANGE_DARK = '#c94a22';
const GREEN = '#22a06b';

const btn = {
  width: '100%',
  border: 'none',
  borderRadius: 18,
  padding: '14px 0',
  fontSize: 17,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const st = {
  page: {
    minHeight: '100vh',
    background: '#fff',
    padding: '16px 16px 200px',
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 480,
    margin: '0 auto',
    boxSizing: 'border-box',
    color: '#1a1a1a',
  },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 16, margin: '60px 0 20px' },
  top: { marginBottom: 12 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 15 },
  exit: { background: '#f1f5f9', border: 'none', borderRadius: 12, padding: '6px 12px', fontWeight: 700, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit' },
  progress: { display: 'flex', gap: 4, marginTop: 8 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  confirm: { marginTop: 10, background: '#fff4e5', borderRadius: 14, padding: 12, display: 'grid', gap: 10, fontSize: 14 },
  confirmYes: { ...btn, padding: '8px 0', fontSize: 14, background: ORANGE, color: '#fff' },
  confirmNo: { ...btn, padding: '8px 0', fontSize: 14, background: '#fff', color: '#1a1a1a', border: '1px solid #e3e9ef' },
  eta: { marginTop: 14 },
  etaLabel: { margin: 0, color: '#64748b', fontSize: 14 },
  name: { margin: '2px 0 10px', fontSize: 24, textWrap: 'balance' },
  etaRow: { display: 'flex', gap: 8 },
  etaBox: { flex: 1, minWidth: 96, background: '#f1f5f9', borderRadius: 14, padding: '10px 6px', display: 'grid', justifyItems: 'center', gap: 2 },
  etaBig: { fontSize: 18, fontVariantNumeric: 'tabular-nums' },
  etaSmall: { fontSize: 12, color: '#64748b' },
  hint: { margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.5 },
  navRow: { display: 'flex', gap: 10, marginTop: 12 },
  navBtn: {
    flex: 1,
    textAlign: 'center',
    background: BLUE,
    color: '#fff',
    borderBottom: `4px solid ${BLUE_DARK}`,
    borderRadius: 14,
    padding: '11px 0',
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: 15,
  },
  waze: { background: '#33ccff', borderBottomColor: '#1a9fd1', color: '#0b2a3a' },
  info: { marginTop: 20 },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tag: { background: '#eaf2fe', color: BLUE_DARK, borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 600 },
  desc: { fontSize: 15, lineHeight: 1.6, color: '#333', margin: '12px 0 14px' },
  details: { background: '#fff', border: '2px solid #e3e9ef', borderRadius: 16, padding: '4px 14px' },
  summary: { cursor: 'pointer', fontWeight: 700, padding: '10px 0', fontSize: 15 },
  detailsBody: { paddingBottom: 12 },
  p: { margin: 0, fontSize: 15, lineHeight: 1.6 },
  ul: { margin: 0, paddingInlineStart: 20, lineHeight: 1.8, fontSize: 15 },
  small: { margin: '6px 0 0', fontSize: 12, color: '#64748b' },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
    background: 'linear-gradient(to top, #fff 80%, rgba(255,255,255,0))',
    zIndex: 1000,
  },
  vbox: { maxWidth: 448, margin: '0 auto', display: 'grid', gap: 8 },
  primary: { ...btn, background: ORANGE, color: '#fff', borderBottom: `5px solid ${ORANGE_DARK}` },
  finish: { ...btn, background: GREEN, color: '#fff', borderBottom: '5px solid #17784f' },
  skip: { background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: 15, padding: 6, cursor: 'pointer', fontFamily: 'inherit' },
  success: { margin: 0, background: '#e6f6ee', color: '#17784f', borderRadius: 14, padding: '10px 12px', fontWeight: 700, textAlign: 'center' },
  warn: { margin: 0, background: '#fff4e5', color: '#7a3f00', borderRadius: 14, padding: '10px 12px', fontSize: 14, lineHeight: 1.5 },
  warnBox: { background: '#fff4e5', color: '#7a3f00', borderRadius: 14, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, display: 'grid', gap: 8 },
  manual: { ...btn, padding: '9px 0', fontSize: 15, background: '#fff', color: '#7a3f00', border: '2px solid #f6c48b' },
  done: { textAlign: 'center', marginTop: 24, display: 'grid', justifyItems: 'center', gap: 4 },
  trophy: { fontSize: 56 },
  doneSub: { margin: '0 0 14px', color: '#64748b' },
  list: { listStyle: 'none', padding: 0, margin: '20px 0', display: 'grid', gap: 8 },
  listItem: { display: 'flex', alignItems: 'center', gap: 10, border: '2px solid #e3e9ef', borderRadius: 14, padding: '10px 12px', fontSize: 15 },
  badge: { width: 26, height: 26, borderRadius: '50%', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' },
};
