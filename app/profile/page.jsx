'use client';

// הפרופיל האישי: הרשמה (שם ואימייל), ואחריה מטבעות, סטטיסטיקות והיסטוריית הרפתקאות.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TabBar from '../../components/TabBar';
import {
  ADVENTURE_REWARD,
  START_COINS,
  isValidEmail,
  loadLastDetails,
  loadProfile,
  loadWallet,
  logout,
  register,
  updateProfile,
} from '../../lib/profile';
import { formatDate, loadVisited } from '../../lib/visited';
import { ACHIEVEMENT_REWARD, achievementStatus, checkAchievements } from '../../lib/achievements';
import { loadFavorites, toggleFavorite } from '../../lib/favorites';

export default function ProfilePage() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [next, setNext] = useState(null); // לאן חוזרים אחרי ההרשמה (מגיעים ממסך הפתיחה)
  const router = useRouter();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('mode') === 'login') setMode('login');
    if (q.get('next')?.startsWith('/')) setNext(q.get('next'));
    setProfile(loadProfile());
    setReady(true);
  }, []);

  function signedIn(p) {
    setProfile(p);
    if (next) router.replace(next);
  }

  return (
    <div dir="rtl" style={st.app}>
      <main style={st.page}>
        {ready &&
          (profile ? (
            <Profile profile={profile} onChange={setProfile} />
          ) : mode === 'login' ? (
            <Login onDone={signedIn} onSignup={() => setMode('signup')} />
          ) : (
            <SignUp onDone={signedIn} onLogin={() => setMode('login')} />
          ))}
      </main>
      <TabBar active="profile" />
    </div>
  );
}

function SignUp({ onDone, onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState(null); // פרטים למילוי אוטומטי
  const [suggestFor, setSuggestFor] = useState(null); // 'name' | 'email' | null
  const nameError = tried && !name.trim() ? 'כתבו את השם שלכם' : '';
  const emailError = tried && !isValidEmail(email) ? 'כתבו כתובת אימייל תקינה, למשל dana@gmail.com' : '';

  useEffect(() => setSaved(loadLastDetails()), []);

  function submit(e) {
    e.preventDefault();
    setTried(true);
    if (!name.trim() || !isValidEmail(email)) return;
    const profile = register({ name, email });
    // מודיעים לבעלי האפליקציה על ההרשמה (אימייל). כישלון כאן לא עוצר את ההרשמה.
    fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profile.name, email: profile.email }),
    }).catch(() => {});
    onDone(profile);
  }

  function autofill() {
    setName(saved.name || '');
    setEmail(saved.email || '');
    setSuggestFor(null);
  }

  // מציעים מילוי אוטומטי רק כשהשדה ריק. התיבה צפה מעל הטופס, כדי שהכפתורים לא יזוזו כשהיא נסגרת.
  const empty = (field) => !(field === 'name' ? name : email).trim();
  const suggestion = (field) =>
    saved && suggestFor === field && empty(field) ? (
      <div style={st.suggestWrap}>
      <button
        type="button"
        style={st.suggest}
        onMouseDown={(e) => e.preventDefault()}
        onClick={autofill}
      >
        <span style={st.suggestTitle}>✨ מילוי אוטומטי</span>
        <span style={st.suggestBody}>{saved.name}</span>
        {saved.email ? <span style={st.suggestEmail} dir="ltr">{saved.email}</span> : null}
      </button>
      </div>
    ) : null;

  return (
    <>
      <section style={st.hero}>
        <img src="/phoenix-pin.png" alt="" style={st.heroBird} />
        <h1 style={st.title}>הצטרפו ל-THV</h1>
        <p style={st.sub}>פרופיל אישי שמרכז את המטבעות, ההרפתקאות והמקומות שלכם.</p>
      </section>
      <form onSubmit={submit} noValidate style={st.card} autoComplete="on">
        <label htmlFor="suName" style={st.label}>שם</label>
        <input
          id="suName"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setSuggestFor('name')}
          onBlur={() => setSuggestFor(null)}
          autoComplete="name"
          maxLength={40}
          placeholder="איך לקרוא לכם?"
          style={{ ...st.input, ...(nameError ? st.inputError : null) }}
          aria-invalid={!!nameError}
        />
        {suggestion('name')}
        {nameError && <p style={st.error}>{nameError}</p>}
        <label htmlFor="suEmail" style={st.label}>אימייל</label>
        <input
          id="suEmail"
          name="email"
          type="email"
          inputMode="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setSuggestFor('email')}
          onBlur={() => setSuggestFor(null)}
          autoComplete="email"
          placeholder="name@example.com"
          style={{ ...st.input, ...(emailError ? st.inputError : null), textAlign: 'left' }}
          aria-invalid={!!emailError}
        />
        {suggestion('email')}
        {emailError && <p style={st.error}>{emailError}</p>}
        <button type="submit" style={st.primary}>הרשמה</button>
        <p style={st.note}>מתחילים עם {START_COINS} מטבעות 🎁</p>
        <button type="button" style={st.switchLink} onClick={onLogin}>כבר יש לי חשבון</button>
      </form>
    </>
  );
}

// "כבר יש לי חשבון": מתחברים עם האימייל שנרשמתם איתו
function Login({ onDone, onSignup }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const last = loadLastDetails();
    if (last?.email) setEmail(last.email);
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('כתבו כתובת אימייל תקינה, למשל dana@gmail.com');
    setBusy(true);
    setError('');
    let name = null;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) name = data.name;
      else if (res.status !== 404) throw new Error();
    } catch {}
    // גם אם השרת לא זמין – מכירים את מי שהתנתק מהמכשיר הזה
    const last = loadLastDetails();
    if (!name && last?.email === email.trim().toLowerCase()) name = last.name;
    setBusy(false);
    if (!name) return setError('לא מצאנו חשבון עם האימייל הזה. אפשר להירשם בחינם.');
    onDone(register({ name, email }));
  }

  return (
    <>
      <section style={st.hero}>
        <img src="/phoenix-pin.png" alt="" style={st.heroBird} />
        <h1 style={st.title}>שמחים לראות אתכם שוב</h1>
        <p style={st.sub}>התחברו עם האימייל שנרשמתם איתו.</p>
      </section>
      <form onSubmit={submit} noValidate style={st.card}>
        <label htmlFor="liEmail" style={st.label}>אימייל</label>
        <input
          id="liEmail"
          type="email"
          inputMode="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="name@example.com"
          style={{ ...st.input, ...(error ? st.inputError : null), textAlign: 'left' }}
          aria-invalid={!!error}
          aria-describedby={error ? 'liErr' : undefined}
        />
        {error && <p id="liErr" style={st.error} role="alert">{error}</p>}
        <button type="submit" style={{ ...st.primary, opacity: busy ? 0.6 : 1 }} disabled={busy}>
          {busy ? 'מתחברים...' : 'התחברות'}
        </button>
        <button type="button" style={st.switchLink} onClick={onSignup}>אין לי חשבון – הרשמה</button>
      </form>
    </>
  );
}

function Profile({ profile, onChange }) {
  const router = useRouter();
  const [wallet, setWallet] = useState({ coins: 0, history: [] });
  const [visited, setVisited] = useState({});
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [confirmOut, setConfirmOut] = useState(false);

  const [achievements, setAchievements] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    try {
      checkAchievements(); // מזכה הישגים שהושגו ועוד לא זוכו
    } catch {}
    setWallet(loadWallet());
    setVisited(loadVisited());
    setAchievements(achievementStatus());
    setFavorites(loadFavorites());
  }, []);

  const places = Object.values(visited);
  const regions = new Set(places.map((p) => p.region)).size;
  const trips = wallet.history.filter((h) => h.tripId);
  const adventures = trips.length;

  return (
    <>
      <section style={st.head}>
        <div style={st.avatar} aria-hidden="true">
          <img src="/phoenix-pin.png" alt="" style={st.avatarImg} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editing ? (
            <form
              style={{ display: 'flex', gap: 6 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                onChange(updateProfile({ name: name.trim() }));
                setEditing(false);
              }}
            >
              <label htmlFor="editName" style={st.srOnly}>שם</label>
              <input id="editName" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} style={{ ...st.input, padding: 8 }} autoFocus />
              <button type="submit" style={st.small}>שמירה</button>
            </form>
          ) : (
            <h1 style={st.name}>
              {profile.name}{' '}
              <button type="button" style={st.link} onClick={() => setEditing(true)}>עריכה</button>
            </h1>
          )}
          <p style={st.email} dir="ltr">{profile.email}</p>
          <p style={st.since}>חבר/ה מאז {formatDate(profile.createdAt)}</p>
        </div>
      </section>

      <section style={st.coins}>
        <span style={st.coinBig} aria-hidden="true" />
        <div>
          <b style={st.coinNum}>{wallet.coins}</b>
          <p style={st.coinLabel}>מטבעות · {ADVENTURE_REWARD} על כל הרפתקה שמסיימים</p>
        </div>
      </section>

      <div style={st.stats}>
        <Stat n={adventures} label="הרפתקאות" />
        <Stat n={places.length} label="מקומות" />
        <Stat n={`${regions}/7`} label="אזורים" />
      </div>

      <h2 style={st.section}>הישגים</h2>
      <ul style={st.list} aria-label="הישגים">
        {achievements.map((a) => (
          <li key={a.id} style={{ ...st.item, opacity: a.earnedAt ? 1 : 0.92 }}>
            <span style={{ ...st.badge, filter: a.earnedAt ? 'none' : 'grayscale(1)', opacity: a.earnedAt ? 1 : 0.55 }} aria-hidden="true">{a.earnedAt ? a.icon : '🔒'}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <b style={st.itemTitle}>{a.title}</b>
              {a.earnedAt ? (
                <span style={st.itemDate}>הושג ב-{formatDate(a.earnedAt)}</span>
              ) : (
                <>
                  <span style={st.itemDate}>{a.desc} · <bdi dir="ltr">{a.value}/{a.goal}</bdi></span>
                  <div style={st.bar} role="progressbar" aria-valuemin={0} aria-valuemax={a.goal} aria-valuenow={a.value} aria-label={a.title}>
                    <div style={{ ...st.barFill, width: `${(a.value / a.goal) * 100}%` }} />
                  </div>
                </>
              )}
            </div>
            <span style={{ ...st.plus, opacity: a.earnedAt ? 1 : 0.5 }} dir="ltr">+{ACHIEVEMENT_REWARD}</span>
          </li>
        ))}
      </ul>

      {favorites.length ? (
        <>
          <h2 style={st.section}>המועדפים שלי</h2>
          <ul style={st.list} aria-label="מועדפים">
            {favorites.map((f) => (
              <li key={f.key} style={st.item}>
                <button type="button" style={st.favOpen} onClick={() => router.push(f.href)}>
                  <b style={st.itemTitle}>{f.title}</b>
                  <span style={st.itemDate}>{[f.region, f.stops ? `${f.stops} תחנות` : ''].filter(Boolean).join(' · ')}</span>
                </button>
                <button
                  type="button"
                  style={st.favX}
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
        </>
      ) : null}

      <h2 style={st.section}>הרפתקאות שסיימתי</h2>
      {trips.length ? (
        <ul style={st.list}>
          {trips.map((h) => (
            <li key={h.tripId || h.date} style={st.item}>
              <div style={{ minWidth: 0 }}>
                <b style={st.itemTitle}>{h.reason}</b>
                <span style={st.itemDate}>{formatDate(h.date)}</span>
              </div>
              <span style={st.plus} dir="ltr">+{h.amount}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={st.card}>
          <p style={{ margin: 0, color: '#6b7b88' }}>עוד לא סיימתם הרפתקה. כל הרפתקה שתסיימו תוסיף {ADVENTURE_REWARD} מטבעות.</p>
          <button type="button" style={st.primary} onClick={() => router.push('/')}>יוצאים להרפתקה</button>
        </div>
      )}

      {confirmOut ? (
        <div style={st.confirm}>
          <span>להתנתק? המטבעות והמקומות נשארים במכשיר.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ ...st.small, flex: 1, background: '#ee6a1f', color: '#fff' }} onClick={() => { logout(); onChange(null); }}>
              התנתקות
            </button>
            <button type="button" style={{ ...st.small, flex: 1 }} onClick={() => setConfirmOut(false)}>ביטול</button>
          </div>
        </div>
      ) : (
        <button type="button" style={st.logout} onClick={() => setConfirmOut(true)}>התנתקות</button>
      )}
    </>
  );
}

function Stat({ n, label }) {
  return (
    <div style={st.stat}>
      <b style={st.statBig}>{n}</b>
      <span style={st.statLabel}>{label}</span>
    </div>
  );
}

const INK = '#14212b';
const MUTED = '#6b7b88';
const LINE = '#e3e9ef';
const card = { background: '#fff', border: `2px solid ${LINE}`, borderBottomWidth: 5, borderRadius: 20 };

const st = {
  switchLink: { background: 'none', border: 0, padding: 8, color: '#1E6FD9', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  badge: { width: 44, height: 44, borderRadius: 14, background: '#FFF6E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flex: '0 0 auto' },
  bar: { height: 6, borderRadius: 999, background: '#E3EAF3', marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, background: '#F26B1D' },
  favOpen: { flex: 1, minWidth: 0, background: 'none', border: 0, padding: 0, textAlign: 'right', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' },
  favX: { width: 40, height: 40, borderRadius: '50%', border: '1px solid #F5C9CB', background: '#FFF0F0', color: '#E5484D', fontSize: 18, cursor: 'pointer', flex: '0 0 auto' },
  app: { minHeight: '100dvh', background: '#f7f9fc', color: INK, fontFamily: '"Rubik", "Heebo", "Assistant", system-ui, -apple-system, sans-serif' },
  page: { maxWidth: 480, margin: '0 auto', padding: '22px 18px 120px', boxSizing: 'border-box', display: 'grid', gap: 14 },
  hero: { display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 6, marginTop: 10 },
  heroBird: { width: 110, height: 110, objectFit: 'contain' },
  title: { margin: 0, fontSize: '1.7rem', fontWeight: 800 },
  sub: { margin: 0, color: MUTED, lineHeight: 1.5 },
  card: { ...card, padding: 16, display: 'grid', gap: 8 },
  label: { fontSize: '0.9rem', fontWeight: 700 },
  input: { font: 'inherit', fontSize: '1rem', padding: 12, border: `2px solid ${LINE}`, borderRadius: 12, background: '#fff', color: INK, width: '100%', boxSizing: 'border-box' },
  inputError: { borderColor: '#d92d20' },
  error: { margin: 0, color: '#b42318', fontSize: '0.85rem' },
  primary: { marginTop: 6, width: '100%', padding: 16, fontSize: '1.1rem', fontWeight: 800, color: '#fff', background: '#ee6a1f', border: 0, borderBottom: '5px solid #c24f12', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit' },
  note: { margin: 0, fontSize: '0.8rem', color: MUTED, textAlign: 'center' },
  suggestWrap: { position: 'relative', height: 0 },
  suggest: { position: 'absolute', top: 4, left: 0, right: 0, zIndex: 5, display: 'grid', gap: 2, textAlign: 'start', background: '#fff', border: '2px solid #1f78a8', borderRadius: 12, padding: '10px 12px', boxShadow: '0 6px 18px rgba(20,33,43,.12)', cursor: 'pointer', font: 'inherit', color: INK },
  suggestTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#1f78a8' },
  suggestBody: { fontSize: '0.95rem', fontWeight: 700 },
  suggestEmail: { fontSize: '0.9rem', color: MUTED, textAlign: 'right' },
  head: { display: 'flex', alignItems: 'center', gap: 14 },
  avatar: { width: 76, height: 76, borderRadius: '50%', background: '#e6f1f8', border: '3px solid #fff', boxShadow: '0 0 0 2px #1f78a8', display: 'grid', placeItems: 'center', flex: '0 0 auto' },
  avatarImg: { width: 58, height: 58, objectFit: 'contain' },
  name: { margin: 0, fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 },
  link: { background: 'none', border: 0, color: '#1f78a8', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit' },
  email: { margin: '2px 0 0', color: MUTED, fontSize: '0.9rem', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' },
  since: { margin: '2px 0 0', color: MUTED, fontSize: '0.8rem' },
  coins: { ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#fff8e1', borderColor: '#f6d58b' },
  coinBig: { width: 48, height: 48, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #ffd86b, #f0a41a)', boxShadow: 'inset 0 0 0 3px #f6b93b', flex: '0 0 auto' },
  coinNum: { fontSize: '2rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#8a5a00' },
  coinLabel: { margin: 0, fontSize: '0.85rem', color: '#a07a2a' },
  stats: { display: 'flex', gap: 10 },
  stat: { ...card, flex: 1, padding: '10px 6px', display: 'grid', justifyItems: 'center', gap: 2 },
  statBig: { fontSize: '1.4rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' },
  statLabel: { fontSize: '0.8rem', color: MUTED },
  section: { margin: '6px 0 0', fontSize: '0.85rem', fontWeight: 700, color: MUTED },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 },
  item: { ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px' },
  itemTitle: { display: 'block', fontWeight: 800 },
  itemDate: { display: 'block', fontSize: '0.82rem', color: MUTED },
  plus: { color: '#17784f', fontWeight: 800, background: '#e6f6ee', borderRadius: 999, padding: '4px 10px', flex: '0 0 auto' },
  confirm: { background: '#fff4e5', borderRadius: 14, padding: 12, display: 'grid', gap: 10, fontSize: 14 },
  small: { font: 'inherit', fontWeight: 800, padding: '8px 14px', border: `2px solid ${LINE}`, borderRadius: 12, background: '#fff', cursor: 'pointer', color: INK },
  logout: { background: 'none', border: 0, color: MUTED, fontWeight: 700, padding: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' },
};
