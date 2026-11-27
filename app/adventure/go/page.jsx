'use client';

// מצב הרפתקה: כל תחנה במשבצת משלה. התחנה הנוכחית מסומנת "אתה כאן", ותחנות שהושלמו ב-✓.
// לחיצה על משבצת פותחת דף פרטים (גלריה, תיאור, הגעה ובטיחות, ניווט).
// "אמת הגעה" – רק בתחנה הנוכחית, לפי GPS בתוך הרדיוס של המקום. אחרי האימות: דירוג (אפשר לדלג),
// ומעבר אוטומטי לתחנה הבאה. "סיים הרפתקה" זמין כל הזמן.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdventureMap from '../../../components/AdventureMap';
import PhoenixRating from '../../../components/PhoenixRating';
import TypeIcon from '../../../components/TypeIcon';
import Reviews from '../../../components/Reviews';
import { airKm, driveTime, formatKm, formatMinutes, hasCoords, wazeLink } from '../../../lib/travel';
import { equipmentFor } from '../../../lib/equipment';
import { recordVisit } from '../../../lib/visited';
import { ACHIEVEMENT_REWARD, checkAchievements } from '../../../lib/achievements';
import { ADVENTURE_REWARD, awardAdventure, loadProfile } from '../../../lib/profile';

const STORAGE_KEY = 'thv-trip';
const DEFAULT_RADIUS = 400; // מטרים, כשלמקום לא הוגדר רדיוס
const EARLY_REASONS = ['חסר לי זמן', 'הייתי צריך לחזור', 'לא מצאנו את המקומות', 'אחר'];

function loadTrip() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
function saveTrip(trip) {
  try {
    if (trip) localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function GoPage() {
  const router = useRouter();
  const [trip, setTrip] = useState(undefined); // undefined = טוען, null = אין הרפתקה
  const [userPos, setUserPos] = useState(null);
  const [locStatus, setLocStatus] = useState('pending');
  const [detail, setDetail] = useState(null); // מספר התחנה שהפרטים שלה פתוחים
  const [rateFor, setRateFor] = useState(null); // התחנה שמדרגים עכשיו
  const [ending, setEnding] = useState(null); // null | 'confirm' | 'reason'
  const lastFix = useRef(null);

  useEffect(() => {
    const t = loadTrip();
    // הרפתקה שנשמרה בגרסה הקודמת של המסך – ממירים
    if (t && !t.verified) t.verified = {};
    setTrip(t);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return setLocStatus('unsupported');
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

  function update(next) {
    setTrip(next);
    saveTrip(next);
  }

  // אם ההרפתקה נפתחה בלי חיבור לשרת – פותחים אותה עכשיו
  async function ensureRun(t) {
    if (t.runId) return t.runId;
    const p = loadProfile();
    try {
      const r = await post('/api/runs', {
        adventure_title: t.adventure.title,
        adventure_ref: t.adventure.curatedId || null,
        stop_ids: t.adventure.stops.map((s) => s.id),
        user_name: p?.name || null,
        user_email: p?.email || null,
      });
      return r.id;
    } catch {
      return null;
    }
  }

  if (trip === undefined) return <main dir="rtl" style={st.page} />;
  if (!trip || !trip.adventure?.stops?.length) {
    return (
      <main dir="rtl" style={st.page}>
        <p style={st.empty}>אין הרפתקה פעילה. בחרו הרפתקה במסך הבית.</p>
        <button type="button" style={st.primary} onClick={() => router.push('/')}>למסך הבית</button>
      </main>
    );
  }

  const stops = trip.adventure.stops;
  const verifiedCount = stops.filter((s) => trip.verified[s.id]).length;
  const allDone = verifiedCount === stops.length;

  // ---- אחרי שמירת דירוג (או דילוג) לתחנה ----
  async function finishStop(index, ratingData) {
    const s = stops[index];
    const v = { ...trip.verified[s.id], rating: ratingData?.rating || null, review: ratingData?.review || '', share: ratingData?.share !== false };
    const next = { ...trip, verified: { ...trip.verified, [s.id]: v } };
    // עוברים אוטומטית לתחנה הבאה שעוד לא הושלמה
    const nextIndex = stops.findIndex((x, i) => i > index && !next.verified[x.id]);
    next.current = nextIndex >= 0 ? nextIndex : stops.length;
    setRateFor(null);
    setDetail(null);
    const runId = await ensureRun(next);
    next.runId = runId;
    if (runId) {
      post(`/api/runs/${runId}/stop`, { place_id: s.id, rating: v.rating, review: v.review, is_public: v.share, verified_by: v.by, verified_at: new Date(v.at).toISOString() }).catch(() => {});
    }
    if (next.current >= stops.length) next.ended = { status: 'completed', at: Date.now() };
    update(next);
    window.scrollTo(0, 0);
  }

  function markArrived(index, by) {
    const s = stops[index];
    let fresh = [];
    try {
      recordVisit(s, trip.adventure.title);
      fresh = checkAchievements(); // למשל: חמישה מקומות / שלושה אזורים
    } catch {}
    update({
      ...trip,
      verified: { ...trip.verified, [s.id]: { at: Date.now(), by } },
      achievements: [...(trip.achievements || []), ...fresh.map((a) => ({ id: a.id, icon: a.icon, title: a.title }))],
    });
    setRateFor(index);
  }

  // ---- מסך סיום ----
  if (trip.ended) {
    return (
      <Summary
        trip={trip}
        userPos={userPos}
        onDone={async (final) => {
          if (trip.finishSent) return;
          const complete = trip.ended.status === 'completed' && allDone;
          let coins = null;
          if (complete) {
            try {
              coins = awardAdventure(trip.startedAt, trip.adventure.title).coins;
            } catch {}
          }
          let achievements = trip.achievements || [];
          try {
            const fresh = checkAchievements();
            achievements = [...achievements, ...fresh.map((a) => ({ id: a.id, icon: a.icon, title: a.title }))];
            if (fresh.length && coins !== null) coins += fresh.length * ACHIEVEMENT_REWARD;
          } catch {}
          const runId = await ensureRun(trip);
          let emailed = null;
          if (runId) {
            try {
              emailed = (await post(`/api/runs/${runId}/finish`, {
                final_rating: final?.rating || null,
                final_review: final?.review || '',
                early_end_reason: trip.ended.reason,
                early_end_other: trip.ended.other,
                points: complete ? ADVENTURE_REWARD : 0,
              })).emailed;
            } catch {}
          }
          update({ ...trip, runId, finishSent: true, final: final || null, coins, emailed, achievements });
        }}
        onHome={() => {
          saveTrip(null);
          router.push('/');
        }}
      />
    );
  }

  const current = Math.min(trip.current ?? 0, stops.length - 1);

  // ---- דף פרטי תחנה ----
  if (detail !== null) {
    return (
      <>
        <StopDetail
          stop={stops[detail]}
          index={detail}
          isCurrent={detail === current}
          done={trip.verified[stops[detail].id]}
          userPos={userPos}
          locStatus={locStatus}
          lastFix={lastFix}
          onBack={() => setDetail(null)}
          onArrived={(by) => markArrived(detail, by)}
        />
        {rateFor !== null && <RateModal stop={stops[rateFor]} onSave={(r) => finishStop(rateFor, r)} onSkip={() => finishStop(rateFor, null)} />}
      </>
    );
  }

  // ---- רשימת המשבצות ----
  return (
    <main dir="rtl" style={st.page}>
      <header style={st.top}>
        <div style={{ minWidth: 0 }}>
          <p style={st.kicker}>מצב הרפתקה</p>
          <h1 style={st.h1}>{trip.adventure.title}</h1>
          <p style={st.progressText}>
            {verifiedCount} מתוך {stops.length} תחנות הושלמו
          </p>
        </div>
        <button type="button" style={st.endBtn} onClick={() => setEnding(allDone ? null : 'confirm')}>
          סיים הרפתקה
        </button>
      </header>
      <div style={st.progress} aria-hidden="true">
        {stops.map((s, i) => (
          <span key={s.id} style={{ ...st.seg, background: trip.verified[s.id] ? '#22A06B' : i === current ? '#F26B1D' : '#E3EAF3' }} />
        ))}
      </div>

      <AdventureMap stops={stops} userPos={userPos} selected={current} focus={current} height={220} onSelect={(i) => setDetail(i)} />

      <ol style={st.cards}>
        {stops.map((s, i) => {
          const done = trip.verified[s.id];
          const isCur = i === current && !done;
          return (
            <li key={s.id}>
              <button type="button" style={{ ...st.card, ...(isCur ? st.cardCur : null), ...(done ? st.cardDone : null) }} onClick={() => setDetail(i)} aria-current={isCur ? 'step' : undefined}>
                <span style={{ ...st.thumb, ...(s.image ? { backgroundImage: `url(${s.image})` } : null) }} aria-hidden="true">
                  {s.image ? null : <TypeIcon type={s.type} size={22} />}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
                  <span style={st.cardTop}>
                    <span style={{ ...st.num, background: done ? '#22A06B' : isCur ? '#F26B1D' : '#9AA8B8' }}>{done ? '✓' : i + 1}</span>
                    {isCur && <span style={st.here}>אתה כאן</span>}
                  </span>
                  <b style={st.cardName}>{s.name}</b>
                  <span style={st.cardMeta}>
                    <TypeIcon type={s.type} /> {s.type} · ביקור {s.visitTime}
                    {done ? (done.by === 'manual' ? ' · אושר ידנית' : ' · הגעת') : ''}
                  </span>
                </span>
                <span style={st.chev} aria-hidden="true">‹</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p style={st.hint}>לחצו על תחנה כדי לראות את כל הפרטים. אימות הגעה אפשר לעשות רק בתחנה הנוכחית.</p>

      {ending === 'confirm' && (
        <Modal onClose={() => setEnding(null)}>
          <h2 style={st.modalTitle}>לסיים את ההרפתקה?</h2>
          <p style={st.modalText}>בטוח שאתה רוצה לסיים למרות שלא הגעת לכל המקומות? המטבעות ניתנים רק כשמגיעים לכל התחנות.</p>
          <div style={st.modalActions}>
            <button type="button" style={st.danger} onClick={() => setEnding('reason')}>כן, לסיים</button>
            <button type="button" style={st.secondary} onClick={() => setEnding(null)}>להמשיך בהרפתקה</button>
          </div>
        </Modal>
      )}
      {ending === 'reason' && (
        <ReasonModal
          onCancel={() => setEnding(null)}
          onConfirm={(reason, other) => {
            setEnding(null);
            update({ ...trip, ended: { status: 'ended_early', reason, other, at: Date.now() } });
            window.scrollTo(0, 0);
          }}
        />
      )}
    </main>
  );
}

// ---------- דף פרטי תחנה ----------
function StopDetail({ stop, index, isCurrent, done, userPos, locStatus, lastFix, onBack, onArrived }) {
  const [drive, setDrive] = useState(null);
  const [verify, setVerify] = useState({ state: 'idle' });
  const radius = stop.radius || DEFAULT_RADIUS;
  const images = [stop.image, ...(stop.gallery || [])].filter(Boolean);
  const gear = useMemo(() => equipmentFor(stop), [stop]);

  useEffect(() => {
    if (!userPos || !hasCoords(stop)) return;
    let alive = true;
    driveTime(userPos, stop).then((r) => alive && setDrive(r));
    return () => {
      alive = false;
    };
  }, [stop.id, Math.round((userPos?.lat || 0) * 100), Math.round((userPos?.lng || 0) * 100)]); // eslint-disable-line react-hooks/exhaustive-deps

  function judge(me) {
    const meters = airKm(me, stop) * 1000;
    const slack = Math.min(me.accuracy || 0, 1000); // מתחשבים בדיוק של ה-GPS
    if (meters - slack <= radius) onArrived('gps');
    else setVerify({ state: 'far', meters });
  }
  function check() {
    if (!hasCoords(stop)) return setVerify({ state: 'noLocation', reason: 'stop' });
    if (!navigator.geolocation) return setVerify({ state: 'noLocation', reason: 'device' });
    if (lastFix.current && Date.now() - lastFix.current.at < 15000) return judge(lastFix.current);
    setVerify({ state: 'checking' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        lastFix.current = { ...me, at: Date.now() };
        judge(me);
      },
      (err) => {
        if (err.code !== 1 && lastFix.current) return judge(lastFix.current);
        setVerify({ state: 'noLocation', reason: err.code === 1 ? 'permission' : 'timeout' });
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
    );
  }

  const air = userPos && hasCoords(stop) ? airKm(userPos, stop) * 1000 : null;
  const safety = [
    stop.parking && ['🅿️', 'חניה', stop.parking],
    stop.tips && ['⚠️', 'חשוב לדעת', stop.tips],
    stop.hours && ['🕒', 'שעות פתיחה', stop.hours],
  ].filter(Boolean);

  return (
    <main dir="rtl" style={{ ...st.page, paddingBottom: isCurrent && !done ? 200 : 40 }}>
      <button type="button" style={st.back} onClick={onBack}>→ לכל התחנות</button>

      <div style={st.gallery} aria-label="תמונות">
        {images.length ? (
          images.map((src, i) => <img key={src + i} src={src} alt={i === 0 ? stop.name : ''} style={st.galleryImg} />)
        ) : (
          <div style={st.galleryEmpty} aria-hidden="true"><TypeIcon type={stop.type} size={44} /></div>
        )}
      </div>

      <header style={{ display: 'grid', gap: 6 }}>
        <p style={st.kicker}>תחנה {index + 1}</p>
        <h1 style={st.h1}>{stop.name}</h1>
        <div style={st.chips}>
          <span style={st.tag}><TypeIcon type={stop.type} /> {stop.type}</span>
          <span style={st.chip}>{stop.difficulty}</span>
          <span style={st.chip}>⏱ ביקור {stop.visitTime}</span>
        </div>
      </header>

      {stop.description && <p style={st.desc}>{stop.description}</p>}

      <section style={st.box}>
        <h2 style={st.h2}>הגעה ובטיחות</h2>
        {safety.map(([icon, label, text]) => (
          <p key={label} style={st.line}><span aria-hidden="true">{icon}</span> <b>{label}:</b> {text}</p>
        ))}
        <div style={st.line}>
          <span aria-hidden="true">🎒</span> <b>ציוד מומלץ:</b> {gear.items.join(', ')}
          {gear.general && <span style={st.small}> (המלצה כללית)</span>}
        </div>
        {!safety.length && <p style={st.small}>אין עדיין הערות הגעה למקום הזה.</p>}
      </section>

      <div style={st.navRow}>
        <a href={stop.mapsLink} target="_blank" rel="noreferrer" style={st.navBtn}>נווט ב-Google Maps</a>
        {hasCoords(stop) && <a href={wazeLink(stop)} target="_blank" rel="noreferrer" style={{ ...st.navBtn, ...st.waze }}>Waze</a>}
      </div>

      <Reviews placeIds={[stop.id]} limit={3} />

      {done && <p style={st.success}>✓ {done.by === 'manual' ? 'אישרת שהגעת לכאן' : 'הגעת לכאן'}{done.rating ? ` · דירגת ${done.rating}/5` : ''}</p>}
      {!isCurrent && !done && <p style={st.hint}>אפשר לאמת הגעה רק בתחנה הנוכחית.</p>}

      {isCurrent && !done && (
        <footer style={st.footer}>
          <div style={st.footInner}>
            {userPos && hasCoords(stop) && (
              <p style={st.eta}>
                {air < 1000 ? `${Math.round(air)} מ'` : formatKm(air / 1000)} ממך
                {drive ? ` · ${drive.estimated ? 'כ-' : ''}${formatMinutes(drive.minutes)} נסיעה` : ''}
              </p>
            )}
            {verify.state === 'far' && (
              <p style={st.warn}>
                נראה שעוד לא הגעת: המקום במרחק {verify.meters < 1000 ? `${Math.round(verify.meters)} מטר` : formatKm(verify.meters / 1000)}. צריך להיות עד {radius} מטר ממנו.
              </p>
            )}
            {verify.state === 'noLocation' && (
              <div style={st.warnBox}>
                <span>
                  {verify.reason === 'stop' && 'למקום הזה אין מיקום מדויק, ולכן אי אפשר לאמת ב-GPS.'}
                  {verify.reason === 'permission' && 'אין גישה למיקום, ולכן אי אפשר לאמת ב-GPS.'}
                  {verify.reason === 'device' && 'המכשיר לא תומך באיתור מיקום.'}
                  {verify.reason === 'timeout' && 'לא הצלחנו לקבל מיקום מה-GPS.'}
                </span>
                <button type="button" style={st.manual} onClick={() => onArrived('manual')}>אני כאן, אישור ידני</button>
              </div>
            )}
            <button type="button" style={st.primary} onClick={check} disabled={verify.state === 'checking'}>
              {verify.state === 'checking' ? 'בודקים את המיקום שלך...' : 'אמת הגעה'}
            </button>
            {locStatus === 'denied' && verify.state === 'idle' && <p style={st.small}>אין גישה למיקום. אפשר לאפשר אותה בהגדרות הדפדפן.</p>}
          </div>
        </footer>
      )}
    </main>
  );
}

// ---------- חלונות ----------
function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div style={st.overlay} role="dialog" aria-modal="true">
      <div style={st.sheet}>{children}</div>
    </div>
  );
}

function RateModal({ stop, onSave, onSkip }) {
  return (
    <Modal>
      <p style={st.arrived}>✓ הגעת ל{stop.name}!</p>
      <PhoenixRating share title="איך הייתה התחנה?" onSubmit={onSave} onSkip={onSkip} submitLabel="שמירה והמשך" skipLabel="דלג" />
    </Modal>
  );
}

function ReasonModal({ onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  return (
    <Modal onClose={onCancel}>
      <h2 style={st.modalTitle}>למה מסיימים מוקדם?</h2>
      <div style={{ display: 'grid', gap: 8 }} role="radiogroup">
        {EARLY_REASONS.map((r) => (
          <label key={r} style={{ ...st.radio, ...(reason === r ? st.radioOn : null) }}>
            <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
        {reason === 'אחר' && (
          <textarea value={other} onChange={(e) => setOther(e.target.value)} rows={2} maxLength={300} placeholder="ספרו לנו בכמה מילים" style={st.ta} aria-label="סיבה אחרת" />
        )}
      </div>
      <div style={st.modalActions}>
        <button type="button" style={{ ...st.danger, opacity: reason ? 1 : 0.45 }} disabled={!reason} onClick={() => onConfirm(reason, other.trim())}>
          המשך לסיום
        </button>
        <button type="button" style={st.secondary} onClick={onCancel}>ביטול</button>
      </div>
    </Modal>
  );
}

// ---------- מסך סיום ----------
function Summary({ trip, userPos, onDone, onHome }) {
  const [busy, setBusy] = useState(false);
  const stops = trip.adventure.stops;
  const done = stops.filter((s) => trip.verified[s.id]).length;
  const complete = trip.ended.status === 'completed' && done === stops.length;

  async function finish(final) {
    setBusy(true);
    await onDone(final);
    setBusy(false);
  }

  return (
    <main dir="rtl" style={{ ...st.page, paddingBottom: 40 }}>
      <section style={st.doneHead}>
        <div style={{ fontSize: 52 }} aria-hidden="true">{complete ? '🏆' : '🏁'}</div>
        <h1 style={{ ...st.h1, textAlign: 'center' }}>{complete ? 'ההרפתקה הושלמה!' : 'סיימת את ההרפתקה'}</h1>
        <p style={st.progressText}>{trip.adventure.title} · {done} מתוך {stops.length} תחנות</p>
        {complete ? (
          <div style={st.reward} role="status"><span style={st.coin} aria-hidden="true" /><b><bdi dir="ltr">+{ADVENTURE_REWARD}</bdi> נקודות</b>{trip.coins ? <span style={{ color: '#A07A2A' }}> · יש לך {trip.coins}</span> : null}</div>
        ) : (
          <p style={st.small}>הנקודות ניתנות רק כשמגיעים לכל התחנות.</p>
        )}
        {trip.achievements?.length ? (
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }} aria-label="הישגים חדשים">
            {trip.achievements.map((a) => (
              <li key={a.id} style={{ background: '#FFF6E5', border: '1px solid #F5D9A6', borderRadius: 14, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <span aria-hidden="true" style={{ fontSize: 22 }}>{a.icon}</span>
                <span style={{ flex: 1 }}>הישג חדש: {a.title}</span>
                <bdi dir="ltr" style={{ color: '#B4470F' }}>+{ACHIEVEMENT_REWARD}</bdi>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section style={st.box}>
        {trip.finishSent ? (
          <p style={{ ...st.success, margin: 0 }}>
            תודה!{trip.final?.rating ? ` דירגת את ההרפתקה ${trip.final.rating}/5.` : ''}
          </p>
        ) : (
          <PhoenixRating
            title="איך הייתה ההרפתקה?"
            placeholder="ביקורת על ההרפתקה כולה"
            submitLabel="שליחה"
            skipLabel="דלג"
            busy={busy}
            onSubmit={finish}
            onSkip={() => finish(null)}
          />
        )}
      </section>

      <ol style={st.cards}>
        {stops.map((s, i) => {
          const v = trip.verified[s.id];
          return (
            <li key={s.id} style={st.sumItem}>
              <span style={{ ...st.num, background: v ? '#22A06B' : '#CBD5E1' }}>{v ? '✓' : '–'}</span>
              <span style={{ flex: 1 }}>{i + 1}. {s.name}</span>
              <span style={st.small}>{v ? (v.rating ? `${v.rating}/5` : 'הגעת') : 'לא הגעת'}</span>
            </li>
          );
        })}
      </ol>

      <GoBack origin={trip.adventure.plan?.origin} userPos={userPos} lastStop={stops[stops.length - 1]} />

      <button type="button" style={st.primary} disabled={busy} onClick={async () => { if (!trip.finishSent) await finish(null); onHome(); }}>
        חזרה למסך הבית
      </button>
    </main>
  );
}

// הדרך חזרה לנקודת היציאה
function GoBack({ origin, userPos, lastStop }) {
  const [drive, setDrive] = useState(null);
  const from = userPos || (hasCoords(lastStop) ? lastStop : null);
  useEffect(() => {
    if (!hasCoords(origin) || !from) return;
    let alive = true;
    driveTime(from, origin).then((r) => alive && setDrive(r));
    return () => {
      alive = false;
    };
  }, [origin?.lat, origin?.lng, from?.lat, from?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hasCoords(origin)) return null;
  const name = origin.label === 'המיקום שלך' ? 'נקודת היציאה' : origin.label;
  return (
    <section style={st.box}>
      <p style={{ margin: 0, fontWeight: 700 }}>
        🏠 חזרה ל{name}
        {drive ? <span style={{ fontWeight: 500, color: '#5B6677' }}> · {drive.estimated ? 'כ-' : ''}{formatMinutes(drive.minutes)} · {formatKm(drive.km)}</span> : null}
      </p>
      <div style={st.navRow}>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${origin.lat},${origin.lng}`} target="_blank" rel="noreferrer" style={st.navBtn}>Google Maps</a>
        <a href={wazeLink(origin)} target="_blank" rel="noreferrer" style={{ ...st.navBtn, ...st.waze }}>Waze</a>
      </div>
    </section>
  );
}

const INK = '#14213D';
const MUTED = '#5B6677';
const LINE = '#E3EAF3';
const pill = { border: 0, borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0', width: '100%' };

const st = {
  page: { minHeight: '100vh', background: '#F6F9FC', color: INK, fontFamily: '"Rubik", system-ui, sans-serif', maxWidth: 480, margin: '0 auto', padding: '16px 20px 60px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 },
  empty: { textAlign: 'center', color: MUTED, fontSize: 16, margin: '60px 0 20px' },
  top: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  kicker: { margin: 0, fontSize: 13, color: MUTED },
  h1: { margin: '2px 0 0', fontSize: 22, fontWeight: 700, textWrap: 'balance' },
  h2: { margin: 0, fontSize: 16, fontWeight: 700 },
  progressText: { margin: '4px 0 0', fontSize: 14, color: MUTED },
  endBtn: { flex: '0 0 auto', background: '#fff', border: '1px solid #F4C7C3', color: '#B42318', borderRadius: 999, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  progress: { display: 'flex', gap: 4 },
  seg: { flex: 1, height: 6, borderRadius: 3 },
  cards: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 },
  card: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start', background: '#fff', border: '2px solid transparent', borderRadius: 20, padding: 10, boxShadow: '0 4px 14px rgba(20,33,61,.06)', cursor: 'pointer', fontFamily: 'inherit', color: INK },
  cardCur: { borderColor: '#F26B1D', boxShadow: '0 6px 18px rgba(242,107,29,.18)' },
  cardDone: { background: '#F3FBF7' },
  thumb: { width: 64, height: 64, borderRadius: 14, flex: '0 0 auto', background: '#DCEAFB center/cover no-repeat', color: '#1E6FD9', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 6 },
  num: { width: 24, height: 24, borderRadius: '50%', color: '#fff', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' },
  here: { background: '#FFF1E6', color: '#B4470F', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  cardName: { fontSize: 16 },
  cardMeta: { fontSize: 12, color: MUTED, display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  chev: { color: '#9AA8B8', fontSize: 20 },
  hint: { margin: 0, fontSize: 13, color: MUTED, lineHeight: 1.5 },
  back: { alignSelf: 'flex-start', background: 'none', border: 0, color: '#1E6FD9', fontSize: 15, fontWeight: 600, padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit' },
  gallery: { display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', margin: '0 -20px', padding: '0 20px', scrollbarWidth: 'none' },
  galleryImg: { flex: '0 0 86%', height: 220, objectFit: 'cover', borderRadius: 20, scrollSnapAlign: 'center' },
  galleryEmpty: { flex: '1 0 100%', height: 160, borderRadius: 20, background: 'linear-gradient(160deg,#B8E0F7,#4F9BD9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EAF2FE', color: '#1557AD', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600 },
  desc: { margin: 0, fontSize: 15, lineHeight: 1.65 },
  box: { background: '#fff', borderRadius: 18, padding: 14, border: `1px solid ${LINE}`, display: 'grid', gap: 8 },
  line: { margin: 0, fontSize: 14, lineHeight: 1.55 },
  small: { fontSize: 12, color: MUTED, margin: 0 },
  navRow: { display: 'flex', gap: 10 },
  navBtn: { flex: 1, textAlign: 'center', background: '#1E6FD9', color: '#fff', borderRadius: 999, padding: '11px 0', fontWeight: 700, textDecoration: 'none', fontSize: 15, boxShadow: '0 4px 0 #1557AD' },
  waze: { flex: '0 0 30%', background: '#33ccff', color: '#0b2a3a', boxShadow: '0 4px 0 #1a9fd1' },
  success: { margin: 0, background: '#E6F6EE', color: '#17784F', borderRadius: 14, padding: '10px 12px', fontWeight: 700, textAlign: 'center' },
  footer: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top, #F6F9FC 80%, rgba(246,249,252,0))', zIndex: 1000 },
  footInner: { maxWidth: 440, margin: '0 auto', display: 'grid', gap: 8 },
  eta: { margin: 0, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#3A4658', fontVariantNumeric: 'tabular-nums' },
  warn: { margin: 0, background: '#FFF8E1', color: '#7A3F00', borderRadius: 14, padding: '10px 12px', fontSize: 14, lineHeight: 1.5 },
  warnBox: { background: '#FFF8E1', color: '#7A3F00', borderRadius: 14, padding: '10px 12px', fontSize: 14, lineHeight: 1.5, display: 'grid', gap: 8 },
  manual: { ...pill, padding: '9px 0', fontSize: 15, background: '#fff', color: '#7A3F00', border: '2px solid #F6C48B' },
  primary: { ...pill, minHeight: 54, background: '#F26B1D', color: '#fff', boxShadow: '0 6px 0 #C2520F' },
  secondary: { ...pill, background: '#fff', color: INK, border: `1px solid ${LINE}` },
  danger: { ...pill, background: '#D92D20', color: '#fff' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,33,61,.45)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { width: '100%', maxWidth: 480, background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', display: 'grid', gap: 12, maxHeight: '92vh', overflowY: 'auto', direction: 'rtl', fontFamily: '"Rubik", system-ui, sans-serif', color: INK },
  modalTitle: { margin: 0, fontSize: 19, fontWeight: 700 },
  modalText: { margin: 0, fontSize: 15, lineHeight: 1.55, color: '#3A4658' },
  modalActions: { display: 'grid', gap: 8 },
  arrived: { margin: 0, textAlign: 'center', background: '#E6F6EE', color: '#17784F', borderRadius: 14, padding: '8px 12px', fontWeight: 700 },
  radio: { display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${LINE}`, borderRadius: 14, padding: '12px 14px', fontSize: 15, cursor: 'pointer' },
  radioOn: { borderColor: '#1E6FD9', background: '#F2F7FE' },
  ta: { font: 'inherit', fontSize: 15, padding: 12, borderRadius: 12, border: '1px solid #D5DFEB', resize: 'vertical', width: '100%', boxSizing: 'border-box' },
  doneHead: { display: 'grid', justifyItems: 'center', gap: 4, marginTop: 10, textAlign: 'center' },
  reward: { display: 'flex', alignItems: 'center', gap: 8, background: '#FFF8E1', border: '2px solid #F6D58B', borderRadius: 999, padding: '8px 16px', marginTop: 6, fontSize: 16, color: '#8A5A00' },
  coin: { width: 22, height: 22, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #ffd86b, #f0a41a)', boxShadow: 'inset 0 0 0 2px #f6b93b', display: 'inline-block' },
  sumItem: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: '10px 12px', fontSize: 15 },
};
