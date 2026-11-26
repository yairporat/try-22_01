'use client';

// הודעה כשההרפתקה (כולל הנסיעות) ארוכה מהזמן שבחרו, עם המלצה לחלופה שכן מתאימה.

import { formatMinutes } from '../lib/travel';

export default function FitNotice({ adventure, onPick, onChooseOther }) {
  const fit = adventure.fit;
  if (!fit || fit.fits) return null;
  const s = fit.suggestion;
  const what =
    !s ? null : s.kind === 'region' ? `הרפתקה ב${s.region}` : s.kind === 'duration' ? `${s.duration} ב${adventure.region}` : `${s.duration} ב${s.region}`;
  return (
    <section style={st.box} role="status">
      <p style={st.title}>⏱️ ההרפתקה לא נכנסת בזמן שבחרת</p>
      <p style={st.text}>
        היא לוקחת כ-{formatMinutes(fit.totalMinutes)} כולל הנסיעות, ובחרת {adventure.duration} (עד {formatMinutes(fit.limitMinutes)}).
      </p>
      {s ? (
        <div style={st.sugg}>
          <p style={st.suggLabel}>ההמלצה שלנו</p>
          <p style={st.suggTitle}>{s.title}</p>
          <p style={st.suggMeta}>
            {what} · {s.stops} {s.stops === 1 ? 'תחנה' : 'תחנות'} · כ-{formatMinutes(s.totalMinutes)} כולל נסיעות
          </p>
          <button type="button" style={st.primary} onClick={() => onPick(s)}>
            לעבור להמלצה
          </button>
        </div>
      ) : (
        <p style={st.text}>לא מצאנו הרפתקה שנכנסת בזמן הזה מנקודת היציאה שלך.</p>
      )}
      <button type="button" style={st.secondary} onClick={onChooseOther}>
        לבחור משהו אחר
      </button>
    </section>
  );
}

const st = {
  box: { background: '#fff8e1', border: '2px solid #f6d58b', borderRadius: 20, padding: 16, display: 'grid', gap: 8, textAlign: 'start', margin: '0 0 16px' },
  title: { margin: 0, fontWeight: 800, fontSize: 17, color: '#8a5a00' },
  text: { margin: 0, fontSize: 14, color: '#5c4500', lineHeight: 1.5 },
  sugg: { background: '#fff', borderRadius: 14, padding: 12, display: 'grid', gap: 4 },
  suggLabel: { margin: 0, fontSize: 12, fontWeight: 700, color: '#1c5fb8' },
  suggTitle: { margin: 0, fontSize: 17, fontWeight: 800, color: '#1a1a1a' },
  suggMeta: { margin: 0, fontSize: 13, color: '#64748b' },
  primary: { marginTop: 6, width: '100%', border: 'none', borderRadius: 14, padding: '11px 0', fontSize: 15, fontWeight: 800, background: '#2f80ed', color: '#fff', borderBottom: '4px solid #1c5fb8', cursor: 'pointer', fontFamily: 'inherit' },
  secondary: { width: '100%', border: '2px solid #f6d58b', borderRadius: 14, padding: '9px 0', fontSize: 15, fontWeight: 700, background: 'transparent', color: '#8a5a00', cursor: 'pointer', fontFamily: 'inherit' },
};
