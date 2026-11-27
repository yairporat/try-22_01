'use client';

// מסך הניהול: כניסה בסיסמה, ואז עריכה של המקומות, ההרפתקאות, הטקסטים והתמונות באתר, והמלצות המטיילים.

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { REGIONS, LEVELS, TYPES } from '../../lib/adventure';
import { TEXTS } from '../../lib/texts';
import { useSite } from '../../components/Site';

export default function AdminPage() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}

const api = async (url, opts = {}) => {
  const res = await fetch(url, {
    cache: 'no-store',
    ...opts,
    headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json', ...opts.headers } : opts.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'משהו השתבש');
  return data;
};

const TABS = [
  { id: 'places', label: 'מקומות' },
  { id: 'adventures', label: 'הרפתקאות' },
  { id: 'texts', label: 'טקסטים ותמונות' },
  { id: 'reviews', label: 'המלצות' },
];

function Admin() {
  const router = useRouter();
  const params = useSearchParams();
  const site = useSite();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState(params.get('tab') || 'places');
  const [toast, setToast] = useState('');

  const loadMe = useCallback(() => api('/api/admin/me').then(setMe).catch(() => setMe({ admin: false, enabled: true })), []);
  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  if (!me) return <main dir="rtl" style={st.page}><p style={st.muted}>טוען...</p></main>;
  if (!me.admin) return <Login enabled={me.enabled} me={me} onDone={() => { loadMe(); site.refresh(); }} />;

  return (
    <main dir="rtl" style={st.page}>
      <header style={st.header}>
        <div>
          <h1 style={st.h1}>ניהול האתר</h1>
          <p style={st.muted}>
            {me.storage === 'supabase' ? '✅ השינויים נשמרים ב-Supabase' : me.storage === 'local' ? '💻 השינויים נשמרים במחשב (תיקיית data/admin)' : '⚠️ השינויים לא יישמרו לאורך זמן'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={st.ghostSm} onClick={() => router.push('/')}>לאתר</button>
          <button
            type="button"
            style={st.ghostSm}
            onClick={async () => {
              await api('/api/admin/logout', { method: 'POST' }).catch(() => {});
              site.refresh();
              loadMe();
            }}
          >
            יציאה
          </button>
        </div>
      </header>

      {me.supabaseProblem && me.storage !== 'supabase' && (
        <div style={st.warn}>⚠️ Supabase לא מחובר: {me.supabaseProblem}. מתקנים ב-Vercel (Environment Variables) ולוחצים Redeploy.</div>
      )}

      {me.storage === 'temporary' && (
        <div style={st.warn}>
          האתר באוויר ועוד לא מחובר ל-Supabase, ולכן שינויים ייעלמו אחרי זמן קצר. ב-Vercel מוסיפים את SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY ומריצים ב-Supabase את הקובץ supabase/migrations/003_admin_and_public_reviews.sql.
        </div>
      )}

      {!me.imported && <ImportBanner onDone={(r) => { notify(`הועברו ${r.places} מקומות ו-${r.adventures} הרפתקאות`); loadMe(); }} />}

      <div style={st.editRow}>
        <span>עריכת טקסטים ישירות על המסכים</span>
        <button type="button" style={{ ...st.toggle, ...(site.editMode ? st.toggleOn : null) }} aria-pressed={site.editMode} onClick={() => site.setEditMode(!site.editMode)}>
          {site.editMode ? 'פעיל' : 'כבוי'}
        </button>
      </div>

      <nav style={st.tabs} role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} style={{ ...st.tab, ...(tab === t.id ? st.tabOn : null) }} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'places' && <PlacesTab imported={me.imported} notify={notify} />}
      {tab === 'adventures' && <AdventuresTab imported={me.imported} notify={notify} />}
      {tab === 'texts' && <TextsTab notify={notify} />}
      {tab === 'reviews' && <ReviewsTab notify={notify} />}

      {toast && <div style={st.toast} role="status">{toast}</div>}
    </main>
  );
}

// ---------------- כניסה ----------------
function Login({ enabled, me = {}, onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <main dir="rtl" style={{ ...st.page, justifyContent: 'center', minHeight: '100dvh' }}>
      <form onSubmit={submit} style={st.loginBox}>
        <img src="/phoenix-pin.png" alt="" style={{ height: 80, justifySelf: 'center' }} />
        <h1 style={{ ...st.h1, textAlign: 'center' }}>כניסת מנהל</h1>
        {!enabled && (
          <div style={st.warn}>
            <span>כדי להפעיל כניסת מנהל מגדירים ב-Vercel משתנה סביבה בשם ADMIN_PASSWORD עם הסיסמה שתבחרו, ופורסים מחדש.</span>
            <small dir="ltr" style={{ fontFamily: 'monospace', textAlign: 'left' }}>
              env: {me.env} · branch: {me.branch || '-'} · password: {me.hasPassword ? 'set (too short?)' : 'missing'} · supabase: {me.hasSupabase ? 'yes' : 'no'}
            </small>
          </div>
        )}
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="סיסמה" style={st.input} autoFocus autoComplete="current-password" aria-label="סיסמה" />
        {error && <p style={st.err}>{error}</p>}
        <button type="submit" style={st.primary} disabled={busy || !password}>
          {busy ? 'נכנסים...' : 'כניסה'}
        </button>
        <a href="/" style={{ ...st.link, justifySelf: 'center' }}>חזרה לאתר</a>
      </form>
    </main>
  );
}

function ImportBanner({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div style={st.info}>
      <b>שלב ראשון: העברת המקומות לעריכה באתר</b>
      <span>כרגע המקומות וההרפתקאות נקראים מהטבלה. לחיצה אחת מעתיקה את כולם לכאן, ומאז עורכים ומוסיפים ישירות מהמסך הזה (הטבלה לא תשמש יותר).</span>
      {error && <span style={st.err}>{error}</span>}
      <button
        type="button"
        style={st.primary}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            onDone(await api('/api/admin/import', { method: 'POST' }));
          } catch (e) {
            setError(e.message);
          }
          setBusy(false);
        }}
      >
        {busy ? 'מעבירים...' : 'העברת המקומות וההרפתקאות'}
      </button>
    </div>
  );
}

// ---------------- תמונה: העלאה מהטלפון או קישור ----------------
// מקטינים בדפדפן לפני ההעלאה (עד 1600 פיקסלים), כדי שתמונות מהמצלמה יעלו מהר
async function shrink(file) {
  try {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', await shrink(file));
  return (await api('/api/admin/upload', { method: 'POST', body: fd })).url;
}

function ImageField({ value, onChange, label = 'תמונה' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div style={st.field}>
      <span style={st.label}>{label}</span>
      <div style={st.imgRow}>
        <span style={{ ...st.imgPrev, ...(value ? { backgroundImage: `url(${value})` } : null) }}>{value ? null : '🖼️'}</span>
        <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 0 }}>
          <label style={{ ...st.ghostSm, textAlign: 'center', opacity: busy ? 0.5 : 1 }}>
            {busy ? 'מעלים...' : '⬆️ העלאת תמונה'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setBusy(true);
                setError('');
                try {
                  onChange(await uploadImage(f));
                } catch (err) {
                  setError(err.message);
                }
                setBusy(false);
              }}
            />
          </label>
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="או קישור לתמונה" style={{ ...st.input, fontSize: 13, padding: 8 }} dir="ltr" />
        </div>
        {value ? <button type="button" style={st.x} onClick={() => onChange('')} aria-label="הסרת התמונה">✕</button> : null}
      </div>
      {error && <span style={st.err}>{error}</span>}
    </div>
  );
}

function GalleryField({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = value || [];
  return (
    <div style={st.field}>
      <span style={st.label}>תמונות נוספות (גלריה)</span>
      <div style={st.gallery}>
        {list.map((src, i) => (
          <span key={src + i} style={{ ...st.galThumb, backgroundImage: `url(${src})` }}>
            <button type="button" style={st.galX} onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="הסרה">✕</button>
          </span>
        ))}
        <label style={{ ...st.galAdd, opacity: busy ? 0.5 : 1 }}>
          {busy ? '...' : '+'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={async (e) => {
              const files = [...(e.target.files || [])];
              e.target.value = '';
              if (!files.length) return;
              setBusy(true);
              setError('');
              const urls = [];
              for (const f of files) {
                try {
                  urls.push(await uploadImage(f));
                } catch (err) {
                  setError(err.message);
                }
              }
              onChange([...list, ...urls]);
              setBusy(false);
            }}
          />
        </label>
      </div>
      {error && <span style={st.err}>{error}</span>}
    </div>
  );
}

// ---------------- מקומות ----------------
const EMPTY_PLACE = { name: '', region: REGIONS[0], type: TYPES[0], difficulty: LEVELS[0], visitMinutes: 60, description: '', location: '', image: '', gallery: [], hours: '', parking: '', tips: '', equipment: '', radius: '', recommended: false, hidden: false };

function PlacesTab({ imported, notify }) {
  const [places, setPlaces] = useState(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const load = () => api('/api/admin/places').then((d) => setPlaces(d.places)).catch(() => setPlaces([]));
  useEffect(() => {
    load();
  }, [imported]);

  const shown = useMemo(() => (places || []).filter((p) => !q || p.name.includes(q) || p.region.includes(q) || p.type.includes(q)), [places, q]);

  if (editing) {
    return (
      <PlaceForm
        place={editing}
        onCancel={() => setEditing(null)}
        onSaved={(msg) => {
          notify(msg);
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <section style={st.section}>
      <div style={st.toolbar}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מקום" style={{ ...st.input, flex: 1 }} aria-label="חיפוש מקום" />
        <button type="button" style={st.add} disabled={!imported} onClick={() => setEditing({ ...EMPTY_PLACE })}>+ מקום חדש</button>
      </div>
      {!imported && <p style={st.muted}>כדי להוסיף ולערוך מקומות, קודם מעבירים אותם לעריכה באתר (הכפתור למעלה).</p>}
      {places === null ? (
        <p style={st.muted}>טוען...</p>
      ) : (
        <ul style={st.list}>
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" style={st.row} disabled={!imported} onClick={() => setEditing({ ...EMPTY_PLACE, ...p, radius: p.radius || '' })}>
                <span style={{ ...st.thumb, ...(p.image ? { backgroundImage: `url(${p.image})` } : null) }}>{p.image ? null : '📍'}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
                  <b>{p.name}</b>
                  <small style={st.muted}>{p.region} · {p.type} · {p.difficulty} · {p.visitMinutes} דק'</small>
                </span>
                {p.hidden && <span style={st.badgeGray}>מוסתר</span>}
                {p.recommended && <span style={st.badge}>מומלץ</span>}
                {typeof p.lat !== 'number' && <span style={st.badgeWarn} title="אין מיקום מדויק">אין מיקום</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PlaceForm({ place, onCancel, onSaved }) {
  const [p, setP] = useState(place);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (e) => setP((x) => ({ ...x, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const isNew = !place.id;

  async function save() {
    setBusy(true);
    setError('');
    try {
      const r = await api('/api/admin/places', { method: 'POST', body: JSON.stringify(p) });
      onSaved(r.located ? 'המקום נשמר' : 'המקום נשמר, אבל לא זיהינו את המיקום מהקישור. הדביקו קישור שיתוף מגוגל מפס.');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api(`/api/admin/places?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      onSaved('המקום נמחק');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <section style={st.form}>
      <div style={st.formHead}>
        <button type="button" style={st.link} onClick={onCancel}>→ חזרה לרשימה</button>
        <h2 style={st.h2}>{isNew ? 'מקום חדש' : p.name}</h2>
      </div>
      <Field label="שם המקום"><input value={p.name} onChange={set('name')} style={st.input} /></Field>
      <div style={st.grid3}>
        <Field label="אזור"><select value={p.region} onChange={set('region')} style={st.input}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="סוג"><select value={p.type} onChange={set('type')} style={st.input}>{TYPES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="רמת קושי"><select value={p.difficulty} onChange={set('difficulty')} style={st.input}>{LEVELS.map((r) => <option key={r}>{r}</option>)}</select></Field>
      </div>
      <div style={st.grid2}>
        <Field label="זמן ביקור (דקות)"><input type="number" min="5" step="5" value={p.visitMinutes} onChange={set('visitMinutes')} style={st.input} inputMode="numeric" /></Field>
        <Field label="רדיוס הגעה (מטרים)"><input type="number" min="50" step="50" value={p.radius} onChange={set('radius')} placeholder="400" style={st.input} inputMode="numeric" /></Field>
      </div>
      <Field label="מיקום בגוגל מפס" hint="בגוגל מפס: שיתוף > העתקת קישור, ומדביקים כאן">
        <input value={p.location} onChange={set('location')} style={st.input} dir="ltr" placeholder="https://maps.app.goo.gl/..." />
      </Field>
      {typeof p.lat === 'number' && <p style={st.muted}>📍 מיקום שזוהה: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</p>}
      <Field label="תיאור"><textarea value={p.description} onChange={set('description')} rows={5} style={st.input} /></Field>
      <ImageField value={p.image} onChange={set('image')} label="תמונה ראשית" />
      <GalleryField value={p.gallery} onChange={set('gallery')} />
      <Field label="שעות פתיחה"><input value={p.hours} onChange={set('hours')} style={st.input} /></Field>
      <Field label="חניה"><textarea value={p.parking} onChange={set('parking')} rows={2} style={st.input} /></Field>
      <Field label="חשוב לדעת (בטיחות, עונה, מזג אוויר)"><textarea value={p.tips} onChange={set('tips')} rows={2} style={st.input} /></Field>
      <Field label="ציוד מומלץ"><input value={p.equipment} onChange={set('equipment')} style={st.input} /></Field>
      <label style={st.check}><input type="checkbox" checked={!!p.recommended} onChange={set('recommended')} /> מומלץ</label>
      <label style={st.check}><input type="checkbox" checked={!!p.hidden} onChange={set('hidden')} /> להסתיר מהמשתמשים (נשמר, אבל לא מופיע בהרפתקאות)</label>
      {error && <p style={st.err}>{error}</p>}
      <div style={st.formActions}>
        <button type="button" style={st.primary} disabled={busy} onClick={save}>{busy ? 'שומרים...' : 'שמירה'}</button>
        <button type="button" style={st.ghost} disabled={busy} onClick={onCancel}>ביטול</button>
      </div>
      {!isNew &&
        (confirmDel ? (
          <div style={st.warn}>
            למחוק את {p.name}? אי אפשר לבטל. (אפשר במקום זה לסמן "להסתיר".)
            <div style={st.formActions}>
              <button type="button" style={st.danger} disabled={busy} onClick={remove}>מחיקה</button>
              <button type="button" style={st.ghost} onClick={() => setConfirmDel(false)}>ביטול</button>
            </div>
          </div>
        ) : (
          <button type="button" style={{ ...st.link, color: '#C0392B' }} onClick={() => setConfirmDel(true)}>מחיקת המקום</button>
        ))}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={st.field}>
      <span style={st.label}>{label}</span>
      {children}
      {hint && <small style={st.muted}>{hint}</small>}
    </label>
  );
}

// ---------------- הרפתקאות ----------------
const EMPTY_ADV = { name: '', description: '', image: '', show: true, stops: [] };

function AdventuresTab({ imported, notify }) {
  const [list, setList] = useState(null);
  const [places, setPlaces] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => {
    api('/api/admin/adventures').then((d) => setList(d.adventures)).catch(() => setList([]));
    api('/api/admin/places').then((d) => setPlaces(d.places)).catch(() => {});
  };
  useEffect(load, [imported]);
  const byId = Object.fromEntries(places.map((p) => [p.id, p]));

  async function move(i, dir) {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    try {
      await api('/api/admin/adventures', { method: 'POST', body: JSON.stringify({ order: next.map((a) => a.id) }) });
    } catch (e) {
      notify(e.message);
      load();
    }
  }

  if (editing) {
    return (
      <AdventureForm
        adv={editing}
        places={places}
        onCancel={() => setEditing(null)}
        onSaved={(msg) => {
          notify(msg);
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <section style={st.section}>
      <div style={st.toolbar}>
        <p style={{ ...st.muted, flex: 1, margin: 0 }}>ההרפתקאות שמופיעות בכרטיסים במסך הבית, לפי הסדר כאן.</p>
        <button type="button" style={st.add} disabled={!imported} onClick={() => setEditing({ ...EMPTY_ADV })}>+ הרפתקה חדשה</button>
      </div>
      {list === null ? (
        <p style={st.muted}>טוען...</p>
      ) : (
        <ul style={st.list}>
          {list.map((a, i) => (
            <li key={a.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={st.updown}>
                <button type="button" style={st.arrow} disabled={!imported || i === 0} onClick={() => move(i, -1)} aria-label="למעלה">▲</button>
                <button type="button" style={st.arrow} disabled={!imported || i === list.length - 1} onClick={() => move(i, 1)} aria-label="למטה">▼</button>
              </div>
              <button type="button" style={{ ...st.row, flex: 1 }} disabled={!imported} onClick={() => setEditing({ ...EMPTY_ADV, ...a })}>
                <span style={{ ...st.thumb, ...(a.image ? { backgroundImage: `url(${a.image})` } : null) }}>{a.image ? null : '🧭'}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
                  <b>{a.name}</b>
                  <small style={st.muted}>{a.stops.map((id) => byId[id]?.name || '?').join(' ← ')}</small>
                </span>
                {a.show === false && <span style={st.badgeGray}>מוסתרת</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AdventureForm({ adv, places, onCancel, onSaved }) {
  const [a, setA] = useState(adv);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [adding, setAdding] = useState('');
  const byId = Object.fromEntries(places.map((p) => [p.id, p]));
  const isNew = !adv.id;
  const set = (k) => (e) => setA((x) => ({ ...x, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const moveStop = (i, dir) =>
    setA((x) => {
      const s = [...x.stops];
      const j = i + dir;
      if (j < 0 || j >= s.length) return x;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...x, stops: s };
    });

  async function save() {
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/adventures', { method: 'POST', body: JSON.stringify(a) });
      onSaved('ההרפתקה נשמרה');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api(`/api/admin/adventures?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' });
      onSaved('ההרפתקה נמחקה');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const available = places.filter((p) => !a.stops.includes(p.id)).sort((x, y) => x.region.localeCompare(y.region) || x.name.localeCompare(y.name));

  return (
    <section style={st.form}>
      <div style={st.formHead}>
        <button type="button" style={st.link} onClick={onCancel}>→ חזרה לרשימה</button>
        <h2 style={st.h2}>{isNew ? 'הרפתקה חדשה' : a.name}</h2>
      </div>
      <Field label="שם ההרפתקה"><input value={a.name} onChange={set('name')} style={st.input} /></Field>
      <Field label="תיאור"><textarea value={a.description} onChange={set('description')} rows={4} style={st.input} /></Field>
      <ImageField value={a.image} onChange={set('image')} label="תמונת הכרטיס" />

      <div style={st.field}>
        <span style={st.label}>התחנות, לפי הסדר</span>
        <ol style={st.stops}>
          {a.stops.map((id, i) => (
            <li key={id} style={st.stop}>
              <span style={st.num}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{byId[id]?.name || `(מקום שנמחק: ${id})`}<small style={st.muted}> · {byId[id]?.region}</small></span>
              <button type="button" style={st.arrow} disabled={i === 0} onClick={() => moveStop(i, -1)} aria-label="למעלה">▲</button>
              <button type="button" style={st.arrow} disabled={i === a.stops.length - 1} onClick={() => moveStop(i, 1)} aria-label="למטה">▼</button>
              <button type="button" style={st.x} onClick={() => setA((x) => ({ ...x, stops: x.stops.filter((s) => s !== id) }))} aria-label="הסרה">✕</button>
            </li>
          ))}
        </ol>
        {a.stops.length < 8 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={adding} onChange={(e) => setAdding(e.target.value)} style={{ ...st.input, flex: 1 }} aria-label="הוספת תחנה">
              <option value="">בחרו מקום להוספה...</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.region} · {p.name}</option>
              ))}
            </select>
            <button type="button" style={st.add} disabled={!adding} onClick={() => { setA((x) => ({ ...x, stops: [...x.stops, adding] })); setAdding(''); }}>הוספה</button>
          </div>
        )}
      </div>

      <label style={st.check}><input type="checkbox" checked={a.show !== false} onChange={set('show')} /> להציג במסך הבית</label>
      {error && <p style={st.err}>{error}</p>}
      <div style={st.formActions}>
        <button type="button" style={st.primary} disabled={busy} onClick={save}>{busy ? 'שומרים...' : 'שמירה'}</button>
        <button type="button" style={st.ghost} disabled={busy} onClick={onCancel}>ביטול</button>
      </div>
      {!isNew &&
        (confirmDel ? (
          <div style={st.warn}>
            למחוק את ההרפתקה {a.name}?
            <div style={st.formActions}>
              <button type="button" style={st.danger} disabled={busy} onClick={remove}>מחיקה</button>
              <button type="button" style={st.ghost} onClick={() => setConfirmDel(false)}>ביטול</button>
            </div>
          </div>
        ) : (
          <button type="button" style={{ ...st.link, color: '#C0392B' }} onClick={() => setConfirmDel(true)}>מחיקת ההרפתקה</button>
        ))}
    </section>
  );
}

// ---------------- טקסטים ותמונות ----------------
function TextsTab({ notify }) {
  const { t, overrides, saveText } = useSite();
  const groups = [...new Set(TEXTS.map((x) => x.group))];
  return (
    <section style={st.section}>
      <p style={st.muted}>טיפ: אפשר גם להפעיל "עריכת טקסטים ישירות על המסכים" למעלה, ואז ללחוץ על כל טקסט באתר כדי לשנות אותו.</p>
      {groups.map((g) => (
        <details key={g} style={st.group} open={g === groups[0]}>
          <summary style={st.groupSum}>{g}</summary>
          <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
            {TEXTS.filter((x) => x.group === g).map((x) => (
              <TextRow key={x.key} def={x} current={t(x.key)} changed={overrides[x.key] != null} onSave={async (v) => { await saveText(x.key, v); notify('נשמר'); }} />
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}

function TextRow({ def, current, changed, onSave }) {
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setValue(current), [current]);
  const save = async (v) => {
    setBusy(true);
    setError('');
    try {
      await onSave(v);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };
  return (
    <div style={st.field}>
      {def.kind === 'image' ? (
        <ImageField label={def.label} value={value} onChange={setValue} />
      ) : (
        <span style={st.label}>{def.label}{changed ? <small style={st.badge}> שונה</small> : null}</span>
      )}
      {def.kind === 'image' ? null : def.kind === 'long' ? (
        <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} style={st.input} />
      ) : (
        <input value={value} onChange={(e) => setValue(e.target.value)} style={st.input} />
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" style={st.saveSm} disabled={busy || value === current || !value.trim()} onClick={() => save(value.trim())}>שמירה</button>
        {changed && <button type="button" style={st.link} disabled={busy} onClick={() => save('')}>חזרה למקור</button>}
        {changed && <small style={st.muted}>במקור: {def.value}</small>}
      </div>
      {error && <span style={st.err}>{error}</span>}
    </div>
  );
}

// ---------------- המלצות ----------------
function ReviewsTab({ notify }) {
  const [list, setList] = useState(null);
  const [places, setPlaces] = useState({});
  useEffect(() => {
    api('/api/admin/reviews').then((d) => setList(d.reviews)).catch(() => setList([]));
    api('/api/admin/places').then((d) => setPlaces(Object.fromEntries(d.places.map((p) => [p.id, p.name])))).catch(() => {});
  }, []);
  async function toggle(r) {
    try {
      await api('/api/admin/reviews', { method: 'POST', body: JSON.stringify({ id: r.id, hidden: !r.hidden }) });
      setList((l) => l.map((x) => (x.id === r.id ? { ...x, hidden: !r.hidden } : x)));
      notify(r.hidden ? 'ההמלצה מוצגת שוב' : 'ההמלצה הוסתרה');
    } catch (e) {
      notify(e.message);
    }
  }
  if (list === null) return <p style={st.muted}>טוען...</p>;
  if (!list.length) return <p style={st.muted}>עוד אין המלצות כתובות.</p>;
  return (
    <section style={st.section}>
      <p style={st.muted}>המלצות שהמטיילים בחרו לשתף מוצגות לכולם. אפשר להסתיר המלצה לא מתאימה.</p>
      <ul style={st.list}>
        {list.map((r) => (
          <li key={r.id} style={{ ...st.reviewItem, opacity: r.hidden ? 0.55 : 1 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <b>{r.name || 'מטייל'}</b>
              <small style={st.muted}>{places[r.placeId] || r.placeId}</small>
              {r.rating ? <small style={st.badge}>{r.rating}/5</small> : null}
              {!r.isPublic && <small style={st.badgeGray}>פרטית</small>}
              {r.hidden && <small style={st.badgeGray}>מוסתרת</small>}
            </div>
            <p style={{ margin: '6px 0', lineHeight: 1.5 }}>{r.text}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <small style={st.muted}>{r.date ? new Date(r.date).toLocaleDateString('he-IL') : ''}{r.email ? ` · ${r.email}` : ''}</small>
              {r.isPublic && (
                <button type="button" style={{ ...st.link, marginInlineStart: 'auto' }} onClick={() => toggle(r)}>
                  {r.hidden ? 'להציג שוב' : 'להסתיר'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------- עיצוב ----------------
const font = '"Rubik", system-ui, sans-serif';
const INK = '#14213D';
const MUTED = '#5B6677';
const LINE = '#E3EAF3';
const btn = { border: 0, borderRadius: 999, cursor: 'pointer', fontFamily: font, fontWeight: 700 };
const st = {
  page: { minHeight: '100dvh', background: '#F6F9FC', color: INK, fontFamily: font, maxWidth: 640, margin: '0 auto', padding: '20px 16px 60px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  h1: { margin: 0, fontSize: 24, fontWeight: 800 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700 },
  muted: { margin: 0, color: MUTED, fontSize: 13 },
  warn: { background: '#FFF4E5', border: '1px solid #F6D58B', color: '#7A4B00', borderRadius: 16, padding: 12, fontSize: 14, lineHeight: 1.5, display: 'grid', gap: 8 },
  info: { background: '#EAF2FE', border: '1px solid #BBD4F7', borderRadius: 18, padding: 14, fontSize: 14, lineHeight: 1.5, display: 'grid', gap: 8 },
  editRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 16, padding: '10px 14px', border: `1px solid ${LINE}`, fontSize: 14, fontWeight: 600 },
  toggle: { ...btn, background: '#E3EAF3', color: MUTED, padding: '6px 14px', fontSize: 13 },
  toggleOn: { background: '#F26B1D', color: '#fff' },
  tabs: { display: 'flex', gap: 6, overflowX: 'auto', background: '#fff', borderRadius: 999, padding: 4, border: `1px solid ${LINE}` },
  tab: { ...btn, flex: '1 0 auto', background: 'none', color: MUTED, padding: '9px 12px', fontSize: 14 },
  tabOn: { background: '#1E6FD9', color: '#fff' },
  section: { display: 'grid', gap: 10 },
  toolbar: { display: 'flex', gap: 8, alignItems: 'center' },
  input: { font: 'inherit', fontSize: 15, padding: '10px 12px', borderRadius: 12, border: `1px solid #D5DFEB`, background: '#fff', color: INK, width: '100%', boxSizing: 'border-box' },
  add: { ...btn, background: '#F26B1D', color: '#fff', padding: '10px 14px', fontSize: 14, whiteSpace: 'nowrap' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, padding: 8, textAlign: 'start', cursor: 'pointer', fontFamily: font, color: INK, fontSize: 15 },
  thumb: { width: 52, height: 52, borderRadius: 12, background: '#DCEAFB center/cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', fontSize: 20 },
  badge: { background: '#FFF1E6', color: '#B4470F', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  badgeGray: { background: '#EEF1F5', color: MUTED, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  badgeWarn: { background: '#FDECEC', color: '#C0392B', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  form: { display: 'grid', gap: 12, background: '#fff', borderRadius: 22, padding: 16, border: `1px solid ${LINE}` },
  formHead: { display: 'grid', gap: 4 },
  field: { display: 'grid', gap: 6 },
  label: { fontSize: 13, fontWeight: 700, color: '#3A4658' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 },
  formActions: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 },
  primary: { ...btn, background: '#F26B1D', color: '#fff', padding: '13px 0', fontSize: 16, boxShadow: '0 4px 0 #C2520F' },
  ghost: { ...btn, background: '#fff', color: INK, border: '1px solid #D5DFEB', padding: '12px 0', fontSize: 15, fontWeight: 600 },
  ghostSm: { ...btn, background: '#fff', color: INK, border: '1px solid #D5DFEB', padding: '7px 12px', fontSize: 13, fontWeight: 600, display: 'inline-block' },
  saveSm: { ...btn, background: '#1E6FD9', color: '#fff', padding: '7px 16px', fontSize: 13 },
  danger: { ...btn, background: '#C0392B', color: '#fff', padding: '12px 0', fontSize: 15 },
  link: { background: 'none', border: 0, padding: 0, color: '#1E6FD9', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: font, justifySelf: 'start', textDecoration: 'none' },
  err: { margin: 0, color: '#C0392B', fontSize: 14, whiteSpace: 'pre-line' },
  imgRow: { display: 'flex', gap: 10, alignItems: 'center' },
  imgPrev: { width: 84, height: 84, borderRadius: 14, background: '#EEF1F5 center/cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flex: '0 0 auto', border: `1px solid ${LINE}` },
  x: { width: 30, height: 30, borderRadius: '50%', border: `1px solid ${LINE}`, background: '#fff', cursor: 'pointer', flex: '0 0 auto', fontSize: 13 },
  gallery: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  galThumb: { width: 72, height: 72, borderRadius: 12, background: '#EEF1F5 center/cover no-repeat', position: 'relative' },
  galX: { position: 'absolute', top: -6, left: -6, width: 24, height: 24, borderRadius: '50%', border: 0, background: INK, color: '#fff', fontSize: 11, cursor: 'pointer' },
  galAdd: { width: 72, height: 72, borderRadius: 12, border: '2px dashed #B9C6D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: MUTED, cursor: 'pointer' },
  updown: { display: 'grid', gap: 4 },
  arrow: { width: 30, height: 26, borderRadius: 8, border: `1px solid ${LINE}`, background: '#fff', cursor: 'pointer', fontSize: 10, color: MUTED },
  stops: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 },
  stop: { display: 'flex', alignItems: 'center', gap: 6, background: '#F6F9FC', borderRadius: 12, padding: '6px 8px', fontSize: 14 },
  num: { width: 24, height: 24, borderRadius: '50%', background: '#F26B1D', color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' },
  group: { background: '#fff', borderRadius: 16, padding: '12px 14px', border: `1px solid ${LINE}` },
  groupSum: { cursor: 'pointer', fontWeight: 700, fontSize: 15 },
  reviewItem: { background: '#fff', borderRadius: 16, padding: 12, border: `1px solid ${LINE}`, fontSize: 14 },
  loginBox: { display: 'grid', gap: 12, background: '#fff', borderRadius: 26, padding: 22, boxShadow: '0 10px 30px rgba(20,33,61,.08)', width: '100%', maxWidth: 380, margin: '0 auto', boxSizing: 'border-box' },
  toast: { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: INK, color: '#fff', borderRadius: 999, padding: '10px 18px', fontSize: 14, zIndex: 5000, boxShadow: '0 8px 20px rgba(0,0,0,.2)' },
};
