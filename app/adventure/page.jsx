'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdventureMap from '../../components/AdventureMap';
import TypeIcon from '../../components/TypeIcon';
import GalleryModal from '../../components/GalleryModal';
import { isFavorite, toggleFavorite } from '../../lib/favorites';
import Timeline from '../../components/Timeline';
import FitNotice from '../../components/FitNotice';
import { resolveOrigin } from '../../lib/origin';
import { formatMinutes } from '../../lib/travel';
import { loadProfile } from '../../lib/profile';
import OriginPicker from '../../components/OriginPicker';
import Reviews from '../../components/Reviews';
import { useSite } from '../../components/Site';
import Birds from '../../components/Birds';
import HoldButton from '../../components/HoldButton';
import { loadVisited } from '../../lib/visited';
import { recordSurprise, surpriseParams } from '../../lib/surpriseHistory';

export default function AdventurePage() {
  return (
    <Suspense>
      <AdventurePreview />
    </Suspense>
  );
}

function AdventurePreview() {
  const [starting, setStarting] = useState(false);
  const [ratings, setRatings] = useState(null);
  const [fav, setFav] = useState(false);
  const [moreText, setMoreText] = useState(false);
  const [gallery, setGallery] = useState(null); // מספר התמונה שפתוחה בגלריה
  const [selected, setSelected] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [locStatus, setLocStatus] = useState('pending');
  const [adventure, setAdventure] = useState(null);
  const [error, setError] = useState('');
  const [fitClosed, setFitClosed] = useState(false);
  const [originVersion, setOriginVersion] = useState(0); // משתנה כשבוחרים נקודת יציאה אחרת
  const [swapping, setSwapping] = useState(null); // מספר התחנה שמחליפים עכשיו
  const [toast, setToast] = useState('');
  const originRef = useRef(null);
  const triedRef = useRef([]); // מקומות שכבר הוחלפו, כדי לא לקבל אותם שוב
  const { t } = useSite();
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();

  // קודם מבררים מאיפה יוצאים (המיקום שלי או עיר), ואז שולחים את הבחירות ומקבלים הרפתקה מתאימה
  useEffect(() => {
    let alive = true;
    setAdventure(null);
    setError('');
    setFitClosed(false);
    triedRef.current = [];
    resolveOrigin().then((origin) => {
      if (!alive) return;
      originRef.current = origin;
      const q = new URLSearchParams(query);
      if (q.get('newOnly') === '1') {
        const seen = Object.keys(loadVisited());
        if (seen.length) q.set('exclude', seen.join(','));
      }
      // "הפתע אותי": שולחים מה יצא לאחרונה, כדי לקבל משהו אחר
      if (q.get('mode') === 'surprise' && !q.get('id')) {
        for (const [k, v] of Object.entries(surpriseParams())) if (v) q.set(k, v);
      }
      if (origin) {
        q.set('olat', origin.lat.toFixed(5));
        q.set('olng', origin.lng.toFixed(5));
        q.set('olabel', origin.label);
      }
      return fetch(`/api/find-adventure?${q.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          if (data.error) return setError(data.error);
          if (data.surprise) recordSurprise(data.surprise);
          setAdventure(data);
        });
    }).catch(() => alive && setError('לא הצלחנו לטעון את ההרפתקה. בדקו את החיבור ונסו שוב.'));
    return () => {
      alive = false;
    };
  }, [query, originVersion]);

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

  // דירוג ממוצע ציבורי
  useEffect(() => {
    fetch('/api/ratings').then((r) => r.json()).then(setRatings).catch(() => setRatings({ places: {}, adventures: {} }));
  }, []);

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

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  // החלפת תחנה לפני היציאה: מקבלים מקום אחר באזור שמתאים להרפתקה
  const swapStop = async (i) => {
    setSwapping(i);
    const q = new URLSearchParams({
      replace: String(i),
      stops: adventure.stops.map((s) => s.id).join(','),
      title: adventure.title,
      duration: adventure.duration || '',
      style: adventure.style || '',
      level: params.get('level') || '',
      region: adventure.region || '',
    });
    triedRef.current = [...new Set([...triedRef.current, adventure.stops[i].id])];
    q.set('tried', triedRef.current.join(','));
    const o = originRef.current;
    if (o) {
      q.set('olat', o.lat.toFixed(5));
      q.set('olng', o.lng.toFixed(5));
      q.set('olabel', o.label);
    }
    if (params.get('depart')) q.set('depart', params.get('depart'));
    if (params.get('newOnly') === '1') {
      const seen = Object.keys(loadVisited());
      if (seen.length) q.set('exclude', seen.join(','));
    }
    try {
      const res = await fetch(`/api/find-adventure?${q.toString()}`);
      const data = await res.json();
      if (!res.ok || data.error) notify(data.error || 'לא מצאנו תחנה אחרת');
      else {
        const old = adventure.stops[i].name;
        const added = data.stops.find((s) => !adventure.stops.some((x) => x.id === s.id));
        setAdventure({ ...data, fit: null, curatedId: null, duration: adventure.duration || data.duration, style: adventure.style, region: adventure.region || data.region });
        setSelected(null);
        setFav(false);
        notify(added ? `${old} הוחלף ב${added.name}` : 'התחנה הוחלפה');
      }
    } catch {
      notify('לא הצלחנו להחליף. בדקו את החיבור ונסו שוב.');
    }
    setSwapping(null);
  };

  // חזרה למסך "הרפתקאה חדשה" עם אותן בחירות, כדי לשנות אותן
  const chooseOther = () => {
    const q = new URLSearchParams({ mode: 'custom' });
    if (params.get('newOnly') !== '1') q.set('newOnly', '0');
    for (const k of ['region', 'duration', 'style', 'depart']) {
      const v = params.get(k) || (k === 'region' ? adventure?.region : k === 'duration' ? adventure?.duration : k === 'style' ? adventure?.style : '');
      if (v) q.set(k, v);
    }
    router.push(`/new?${q.toString()}`);
  };
  const pickSuggestion = (sug) => {
    // עוברים בדיוק להרפתקה שהוצעה (אותן תחנות)
    if (sug.stopIds?.length) {
      const q = new URLSearchParams({ stops: sug.stopIds.join(','), title: sug.title || '' });
      if (params.get('depart')) q.set('depart', params.get('depart'));
      router.push(`/adventure?${q.toString()}`);
      return;
    }
    const q = new URLSearchParams({ mode: 'custom', region: sug.region, duration: sug.duration, style: sug.style || '' });
    if (sug.placeId) q.set('id', sug.placeId);
    if (params.get('depart')) q.set('depart', params.get('depart'));
    if (params.get('newOnly') === '1') q.set('newOnly', '1');
    router.push(`/adventure?${q.toString()}`);
  };
  const fitModal =
    adventure && adventure.fit && !adventure.fit.fits && !fitClosed ? (
      <FitNotice
        adventure={adventure}
        onPick={pickSuggestion}
        onChooseOther={chooseOther}
        onOriginChange={() => setOriginVersion((v) => v + 1)}
        onClose={() => setFitClosed(true)}
      />
    ) : null;

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
        <p style={st.status}>עוד אין מקומות שמתאימים לבחירה הזו ב{adventure.region}. נסו סגנון אחר או אזור אחר.</p>
        <button type="button" style={st.start} onClick={chooseOther}>בחירה אחרת</button>
        {fitModal}
      </main>
    );
  }

  const total = adventure.plan?.origin ? adventure.plan.totalMinutes : adventure.totalMinutes;
  // מזהה ההרפתקה: הרפתקה שבנית – לפי המזהה שלה, אחרת לפי התחנות
  const advKey = adventure.curatedId || `stops:${adventure.stops.map((s) => s.id).join(',')}`;
  const rating = ratings?.adventures?.[adventure.curatedId || adventure.title];
  // כל התמונות: של ההרפתקה, של התחנות והגלריות שלהן
  const images = [...new Set([adventure.image, ...adventure.stops.flatMap((s) => [s.image, ...(s.gallery || [])])].filter(Boolean))];
  const description =
    adventure.description ||
    `${adventure.stops.length} תחנות ב${adventure.region}: ${adventure.stops.map((s) => s.name).join(', ')}. ${adventure.stops.map((s) => s.description).filter(Boolean)[0] || ''}`;
  const favHref = adventure.curatedId
    ? `/adventure?curated=${encodeURIComponent(adventure.curatedId)}`
    : `/adventure?stops=${adventure.stops.map((s) => s.id).join(',')}&title=${encodeURIComponent(adventure.title)}`;
  const isFav = fav || (typeof window !== 'undefined' && isFavorite(advKey));

  return (
    <main dir="rtl" style={st.page}>
      <div style={st.topbar}>
        <button
          type="button"
          style={{ ...st.circle, color: isFav ? '#E5484D' : '#14213D' }}
          aria-pressed={isFav}
          aria-label={isFav ? 'הסרה מהמועדפים' : 'הוספה למועדפים'}
          onClick={() => setFav(toggleFavorite({ key: advKey, title: adventure.title, href: favHref, region: adventure.region, stops: adventure.stops.length }) || false)}
        >
          {isFav ? '♥' : '♡'}
        </button>
        <button type="button" style={st.circle} onClick={() => router.push('/')} aria-label="חזרה">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </div>

      <div style={{ ...st.hero, ...(images[0] ? { backgroundImage: `url(${images[0]})` } : null) }} role="img" aria-label={adventure.title}>
        {!images[0] && <img src="/phoenix-pin.png" alt="" style={{ height: 120, opacity: 0.9 }} />}
      </div>

      <header style={st.head}>
        <div style={st.titleRow}>
          <h1 style={st.title}>{adventure.title}</h1>
          <span style={st.rate}>{rating ? <Birds value={rating.avg} size={18} /> : <small>חדש</small>}</span>
        </div>
        <div style={st.chips}>
          <span style={st.chip}>⏱ כ-{formatMinutes(total)}</span>
          <span style={st.chip}>{adventure.region}</span>
          <span style={st.chip}>{adventure.style || adventure.difficulty}</span>
          <span style={st.chip}>{adventure.stops.length} תחנות</span>
        </div>
        <p style={{ ...st.lead, ...(moreText ? null : st.clamp) }}>{description}</p>
        {description.length > 120 && (
          <button type="button" style={st.more} onClick={() => setMoreText((v) => !v)}>
            {moreText ? 'פחות' : 'קרא עוד'}
          </button>
        )}
      </header>

      {images.length > 1 && (
        <div style={st.thumbs} aria-label="תמונות">
          {images.slice(0, 4).map((src, i) => {
            const extra = i === 3 && images.length > 4 ? images.length - 4 : 0;
            return (
              <button key={src} type="button" style={{ ...st.th, backgroundImage: `url(${src})` }} onClick={() => setGallery(i)} aria-label={extra ? `עוד ${extra} תמונות` : `תמונה ${i + 1}`}>
                {extra ? <span style={st.plus}>+{extra}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {fitModal}

      <OriginPicker onChange={() => setOriginVersion((v) => v + 1)} />

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
            <span style={st.name}>
              {s.name}
              {ratings?.places?.[s.id] ? (
                <small style={st.stopRate}>
                  <Birds value={ratings.places[s.id].avg} size={13} />
                </small>
              ) : null}
              <small style={st.stopType}>
                <TypeIcon type={s.type} /> {s.type}
                {s.onTheWay ? <span style={st.onWay}>תחנה בדרך</span> : null}
              </small>
            </span>
            <button
              type="button"
              style={st.swap}
              disabled={swapping !== null}
              onClick={(e) => {
                e.stopPropagation();
                swapStop(i);
              }}
              aria-label={`החלפת התחנה ${s.name}`}
            >
              {swapping === i ? '...' : '⇄ החלף'}
            </button>
          </li>
        ))}
      </ol>

      <Reviews placeIds={adventure.stops.map((s) => s.id)} names={Object.fromEntries(adventure.stops.map((s) => [s.id, s.name]))} />

      <details style={st.moreBox}>
        <summary style={st.moreSum}>לוח זמנים ונסיעות</summary>
        <div style={{ marginTop: 12 }}>
          <Timeline adventure={adventure} />
        </div>
      </details>
      {locStatus === 'denied' && <p style={st.hint}>אין גישה למיקום, ולכן הזמן לא כולל את הנסיעה אליכם וחזרה.</p>}

      {gallery !== null && <GalleryModal images={images} start={gallery} onClose={() => setGallery(null)} />}

      {toast && (
        <div style={st.toast} role="status">
          {toast}
        </div>
      )}

      <footer style={st.footer}>
        <div style={st.footRow}>
          <button
            type="button"
            style={{ ...st.saveBtn, ...(isFav ? st.saveOn : null) }}
            aria-pressed={isFav}
            onClick={() => {
              const on = toggleFavorite({ key: advKey, title: adventure.title, href: favHref, region: adventure.region, stops: adventure.stops.length }) || false;
              setFav(on);
              notify(on ? 'נשמר! ההרפתקה מחכה לך במועדפים' : 'הוסר מהמועדפים');
            }}
          >
            {isFav ? '✓ נשמר' : `🔖 ${t('adventure.save')}`}
          </button>
          <HoldButton onConfirm={handleStart} disabled={starting} label={starting ? 'יוצאים...' : t('adventure.hold')} holdingLabel="ממשיכים להחזיק..." style={{ flex: 1 }} />
        </div>
      </footer>
    </main>
  );
}

const INK = '#14213D';
const MUTED = '#5B6677';
const LINE = '#E3EAF3';
const st = {
  page: { minHeight: '100vh', background: '#F6F9FC', color: INK, fontFamily: '"Rubik", system-ui, sans-serif', maxWidth: 480, margin: '0 auto', padding: '16px 20px 120px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  circle: { width: 42, height: 42, borderRadius: '50%', border: '1px solid #E3EAF3', background: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#14213D', boxShadow: '0 2px 8px rgba(20,33,61,.06)' },
  hero: { height: 230, borderRadius: 26, background: 'linear-gradient(160deg,#B8E0F7,#4F9BD9) center/cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 26px rgba(20,33,61,.12)' },
  titleRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  rate: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF1E6', color: '#B4470F', borderRadius: 999, padding: '6px 10px', fontSize: 14, flex: '0 0 auto', marginTop: 4 },
  clamp: { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  more: { alignSelf: 'flex-start', background: 'none', border: 0, padding: 0, color: '#1E6FD9', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  thumbs: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 },
  th: { aspectRatio: '1', borderRadius: 14, border: 0, background: '#DCEAFB center/cover no-repeat', cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: 0 },
  plus: { position: 'absolute', inset: 0, background: 'rgba(20,33,61,.55)', color: '#fff', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' },
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
  name: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, display: 'grid' },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EAF2FE', color: '#1557AD', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, flex: '0 0 auto' },
  moreBox: { background: '#fff', borderRadius: 18, padding: '12px 14px', border: `1px solid ${LINE}` },
  stopRate: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500, color: '#B4470F', marginTop: 2 },
  onWay: { background: '#FFF4E5', color: '#8A5A00', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginInlineStart: 4 },
  stopType: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500, color: '#1557AD', marginTop: 2 },
  swap: { flex: '0 0 auto', border: '1px solid #D5DFEB', background: '#fff', color: '#1E6FD9', borderRadius: 999, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  footRow: { width: '100%', maxWidth: 440, display: 'flex', gap: 8, alignItems: 'center' },
  saveBtn: { flex: '0 0 auto', minHeight: 58, border: '2px solid #D5DFEB', background: '#fff', color: '#14213D', borderRadius: 999, padding: '0 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  saveOn: { borderColor: '#22A06B', color: '#17784F', background: '#E6F6EE' },
  toast: { position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#14213D', color: '#fff', borderRadius: 999, padding: '10px 18px', fontSize: 14, zIndex: 1500, boxShadow: '0 8px 20px rgba(0,0,0,.2)', maxWidth: '90vw', textAlign: 'center' },
  moreSum: { cursor: 'pointer', fontWeight: 600, fontSize: 15 },
  hint: { margin: 0, fontSize: 13, color: MUTED },
  footer: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px calc(12px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top, #F6F9FC 75%, rgba(246,249,252,0))', display: 'flex', justifyContent: 'center', zIndex: 1000 },
  start: { width: '100%', maxWidth: 440, minHeight: 56, border: 0, borderRadius: 999, background: '#F26B1D', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 0 #C2520F', fontFamily: 'inherit' },
};
