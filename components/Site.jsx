'use client';

// הטקסטים של האתר ומצב המנהל, לכל העמודים.
// <T k="home.title" /> מציג טקסט שהמנהל יכול לשנות. במצב עריכה – לחיצה על הטקסט פותחת חלון עריכה.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TEXT_DEFAULTS, TEXTS } from '../lib/texts';

const SiteContext = createContext({ t: (k) => TEXT_DEFAULTS[k] ?? k, admin: false, editMode: false });
export const useSite = () => useContext(SiteContext);

const EDIT_KEY = 'thv-edit-mode';

export function SiteProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [admin, setAdmin] = useState(false);
  const [editMode, setEditModeState] = useState(false);
  const [editing, setEditing] = useState(null); // המפתח שנערך עכשיו

  const refresh = useCallback(() => {
    return fetch('/api/texts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setOverrides(d.texts || {});
        setAdmin(!!d.admin);
        if (!d.admin) setEditModeState(false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      setEditModeState(localStorage.getItem(EDIT_KEY) === '1');
    } catch {}
    refresh();
  }, [refresh]);

  const setEditMode = (on) => {
    setEditModeState(on);
    try {
      localStorage.setItem(EDIT_KEY, on ? '1' : '0');
    } catch {}
  };

  const t = useCallback((k) => (overrides[k] != null && overrides[k] !== '' ? overrides[k] : TEXT_DEFAULTS[k] ?? k), [overrides]);

  async function saveText(key, value) {
    const res = await fetch('/api/admin/texts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'השמירה נכשלה');
    setOverrides((o) => {
      const next = { ...o };
      if (value === '') delete next[key];
      else next[key] = value;
      return next;
    });
  }

  const value = { t, admin, editMode: admin && editMode, setEditMode, refresh, overrides, saveText, editText: setEditing };

  return (
    <SiteContext.Provider value={value}>
      {children}
      {admin && <AdminBar editMode={editMode} setEditMode={setEditMode} />}
      {editing && <TextEditor k={editing} current={t(editing)} onClose={() => setEditing(null)} onSave={saveText} />}
    </SiteContext.Provider>
  );
}

// טקסט שאפשר לערוך. as: התגית שתוצג (span כברירת מחדל)
export function T({ k, as: Tag = 'span', style, className, children }) {
  const { t, editMode, editText } = useSite();
  const text = t(k);
  if (!editMode) {
    return (
      <Tag style={style} className={className}>
        {text}
        {children}
      </Tag>
    );
  }
  return (
    <Tag
      style={{ ...style, outline: '2px dashed #F26B1D', outlineOffset: 2, borderRadius: 6, cursor: 'text' }}
      className={className}
      role="button"
      tabIndex={0}
      title="לחצו כדי לערוך"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        editText(k);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          editText(k);
        }
      }}
    >
      {text}
      {children}
    </Tag>
  );
}

// פס קטן למנהל בראש המסך: מצב עריכה + כניסה למסך הניהול
function AdminBar({ editMode, setEditMode }) {
  const [open, setOpen] = useState(true);
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return null;
  return (
    <div style={bar.wrap} dir="rtl">
      {open ? (
        <div style={bar.box}>
          <b style={{ fontSize: 13 }}>מנהל</b>
          <button type="button" style={{ ...bar.btn, ...(editMode ? bar.on : null) }} aria-pressed={editMode} onClick={() => setEditMode(!editMode)}>
            ✏️ {editMode ? 'עריכה פעילה' : 'עריכת טקסטים'}
          </button>
          <a href="/admin" style={bar.btn}>⚙️ ניהול</a>
          <button type="button" style={bar.x} onClick={() => setOpen(false)} aria-label="הקטנה">–</button>
        </div>
      ) : (
        <button type="button" style={bar.mini} onClick={() => setOpen(true)} aria-label="פתיחת סרגל המנהל">⚙️</button>
      )}
    </div>
  );
}

function TextEditor({ k, current, onClose, onSave }) {
  const def = TEXTS.find((x) => x.key === k);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const long = def?.kind === 'long' || value.length > 60;

  async function save(v) {
    setBusy(true);
    setError('');
    try {
      await onSave(k, v);
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div style={ed.overlay} role="dialog" aria-modal="true" aria-label="עריכת טקסט" dir="rtl" onClick={onClose}>
      <div style={ed.sheet} onClick={(e) => e.stopPropagation()}>
        <p style={ed.kicker}>{def ? `${def.group} · ${def.label}` : k}</p>
        {long ? (
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} style={ed.input} autoFocus />
        ) : (
          <input value={value} onChange={(e) => setValue(e.target.value)} style={ed.input} autoFocus onKeyDown={(e) => e.key === 'Enter' && save(value.trim())} />
        )}
        {def && value !== def.value && <p style={ed.orig}>במקור: {def.value}</p>}
        {error && <p style={ed.err}>{error}</p>}
        <div style={ed.row}>
          <button type="button" style={ed.save} disabled={busy || !value.trim()} onClick={() => save(value.trim())}>
            {busy ? 'שומרים...' : 'שמירה'}
          </button>
          <button type="button" style={ed.ghost} disabled={busy} onClick={onClose}>ביטול</button>
        </div>
        {def && current !== def.value && (
          <button type="button" style={ed.reset} disabled={busy} onClick={() => save('')}>חזרה לטקסט המקורי</button>
        )}
      </div>
    </div>
  );
}

const font = '"Rubik", system-ui, sans-serif';
const bar = {
  wrap: { position: 'fixed', top: 8, left: 8, zIndex: 3000, fontFamily: font },
  box: { display: 'flex', alignItems: 'center', gap: 6, background: '#14213D', color: '#fff', borderRadius: 999, padding: '6px 8px 6px 12px', boxShadow: '0 6px 18px rgba(0,0,0,.25)' },
  btn: { background: 'rgba(255,255,255,.12)', color: '#fff', border: 0, borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', fontFamily: font },
  on: { background: '#F26B1D' },
  x: { background: 'none', border: 0, color: '#fff', fontSize: 18, cursor: 'pointer', padding: '0 4px', fontFamily: font },
  mini: { width: 40, height: 40, borderRadius: '50%', border: 0, background: '#14213D', color: '#fff', fontSize: 18, cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,.25)' },
};
const ed = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,33,61,.45)', zIndex: 4000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: font },
  sheet: { background: '#fff', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: '18px 18px calc(18px + env(safe-area-inset-bottom))', display: 'grid', gap: 10, boxSizing: 'border-box' },
  kicker: { margin: 0, fontSize: 13, color: '#5B6677', fontWeight: 600 },
  input: { font: 'inherit', fontSize: 17, padding: 12, borderRadius: 12, border: '1px solid #D5DFEB', width: '100%', boxSizing: 'border-box', color: '#14213D' },
  orig: { margin: 0, fontSize: 13, color: '#5B6677' },
  err: { margin: 0, fontSize: 14, color: '#C0392B' },
  row: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 },
  save: { border: 0, borderRadius: 999, padding: '12px 0', fontSize: 16, fontWeight: 700, background: '#F26B1D', color: '#fff', cursor: 'pointer', fontFamily: font },
  ghost: { border: '1px solid #D5DFEB', borderRadius: 999, background: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font },
  reset: { background: 'none', border: 0, color: '#1E6FD9', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: font, justifySelf: 'center' },
};
