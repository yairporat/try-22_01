'use client';

// חלון קופץ כשלא נמצאה הרפתקה שמתאימה לבחירה (לא נכנסת בזמן כולל נסיעות ופקקים, או שאין מקומות מתאימים).
// שלוש אפשרויות: מעבר להמלצה שכן מתאימה, בחירה אחרת, או יציאה ממקום אחר.

import { useEffect, useState } from 'react';
import { OriginSheet } from './OriginPicker';
import { loadOriginChoice } from '../lib/origin';
import { T, useSite } from './Site';

export default function FitNotice({ adventure, onPick, onChooseOther, onOriginChange, onClose }) {
  const { t } = useSite();
  const [originOpen, setOriginOpen] = useState(false);
  const fit = adventure.fit;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && fit?.reason !== 'empty' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, fit]);

  if (!fit || fit.fits) return null;
  const s = fit.suggestion;
  const empty = fit.reason === 'empty' || !adventure.stops.length;
  const what =
    !s
      ? null
      : s.kind === 'style'
        ? `${s.style} ב${s.region}`
        : s.region === adventure.region
          ? `${s.duration} ב${s.region}${s.style && s.style !== adventure.style ? ` · ${s.style}` : ''}`
        : s.kind === 'region'
          ? `${s.style ? `${s.style} · ` : ''}הרפתקה ב${s.region}`
          : s.kind === 'nearest'
            ? `המקום הקרוב ביותר · ${s.region}`
            : s.kind === 'duration'
              ? `${s.duration} ב${s.region}`
              : `${s.duration} ב${s.region}`;

  return (
    <div style={st.overlay} role="dialog" aria-modal="true" aria-label={t('nofit.title')} dir="rtl">
      <div style={st.box}>
        <img src="/phoenix-pin.png" alt="" style={st.bird} />
        <T k="nofit.title" as="h2" style={st.title} />

        {s ? (
          <div style={st.sugg}>
            <T k="nofit.suggestionLabel" as="p" style={st.suggLabel} />
            <p style={st.suggTitle}>{s.title}</p>
            <p style={st.suggMeta}>
              {what} · {s.stops} {s.stops === 1 ? 'תחנה' : 'תחנות'}
            </p>
            {s.names?.length ? <p style={st.suggNames}>{s.names.join(' ← ')}</p> : null}
          </div>
        ) : (
          <p style={st.text}>אין עדיין מספיק מקומות ב{adventure.region}. אפשר להחליף את ההרפתקה.</p>
        )}

        <div style={st.actions}>
          {s && (
            <button type="button" style={st.primary} onClick={() => onPick(s)}>
              {t('nofit.toSuggestion')}
            </button>
          )}
          <button type="button" style={st.secondary} onClick={onChooseOther}>
            {t('nofit.other')}
          </button>
        </div>
      </div>
      {originOpen && (
        <OriginSheet
          current={loadOriginChoice()}
          onClose={() => setOriginOpen(false)}
          onPick={(choice) => {
            setOriginOpen(false);
            onOriginChange(choice);
          }}
        />
      )}
    </div>
  );
}

const font = '"Rubik", system-ui, sans-serif';
const st = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(20,33,61,.5)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: font },
  box: { background: '#fff', borderRadius: 28, padding: '20px 18px 16px', width: '100%', maxWidth: 380, display: 'grid', gap: 10, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,.25)', animation: 'pop .18s ease-out', color: '#14213D' },
  bird: { height: 64, justifySelf: 'center', filter: 'grayscale(.2)' },
  title: { margin: 0, fontWeight: 800, fontSize: 20 },
  text: { margin: 0, fontSize: 14, color: '#5B6677', lineHeight: 1.5 },
  sugg: { background: '#EAF2FE', borderRadius: 18, padding: 12, display: 'grid', gap: 3, textAlign: 'start' },
  suggLabel: { margin: 0, fontSize: 12, fontWeight: 700, color: '#1557AD' },
  suggTitle: { margin: 0, fontSize: 17, fontWeight: 800 },
  suggNames: { margin: 0, fontSize: 13, fontWeight: 600, color: '#14213D' },
  suggMeta: { margin: 0, fontSize: 13, color: '#5B6677' },
  actions: { display: 'grid', gap: 8, marginTop: 4 },
  primary: { border: 'none', borderRadius: 999, padding: '13px 0', fontSize: 16, fontWeight: 800, background: '#F26B1D', color: '#fff', boxShadow: '0 4px 0 #C2520F', cursor: 'pointer', fontFamily: font },
  secondary: { border: '2px solid #1E6FD9', borderRadius: 999, padding: '10px 0', fontSize: 15, fontWeight: 700, background: '#fff', color: '#1E6FD9', cursor: 'pointer', fontFamily: font },
  ghost: { border: '1px solid #D5DFEB', borderRadius: 999, padding: '10px 0', fontSize: 15, fontWeight: 600, background: '#F6F9FC', color: '#14213D', cursor: 'pointer', fontFamily: font },
  link: { background: 'none', border: 0, color: '#5B6677', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', fontFamily: font, padding: 4 },
};
