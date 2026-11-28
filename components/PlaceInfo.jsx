'use client';

// כל הפרטים על מקום, באותו סדר בכל מקום באפליקציה:
// על המקום · איך מגיעים · ציוד נדרש · עונה / זמן מומלץ · שעות פתיחה · חשוב לדעת · הערות נוספות
// ולמטה ניווט: לחניה (תמיד), ולמקום עצמו – רק כש-showSpot (בתוך ההרפתקה, כשנכנסים לתחנה).

import { hasCoords, wazeLink } from '../lib/travel';

export default function PlaceInfo({ place, showSpot = false, gear = null, showDescription = true }) {
  const p = place || {};
  const sections = [
    showDescription && p.description && ['ℹ️', 'על המקום', p.description],
    (p.directions || p.parking) && ['🚗', 'איך מגיעים', [p.directions, p.parking && `חניה: ${p.parking}`].filter(Boolean).join('\n')],
    (p.equipment || gear) && ['🎒', 'ציוד נדרש', p.equipment || gear],
    p.season && ['🗓️', 'עונה / זמן מומלץ', p.season],
    p.hours && ['🕒', 'שעות פתיחה', p.hours],
    p.tips && ['⚠️', 'חשוב לדעת', p.tips],
    p.notes && ['📝', 'הערות נוספות', p.notes],
  ].filter(Boolean);
  const spot = showSpot && (p.spotLink || typeof p.spotLat === 'number');
  const spotPoint = typeof p.spotLat === 'number' ? { lat: p.spotLat, lng: p.spotLng } : null;

  return (
    <div style={s.wrap}>
      {sections.map(([icon, label, text]) => (
        <section key={label} style={s.sec}>
          <h3 style={s.h3}>
            <span aria-hidden="true">{icon}</span> {label}
          </h3>
          <p style={s.text}>{text}</p>
        </section>
      ))}

      <div style={s.navGroup}>
        <p style={s.navLabel}>🅿️ ניווט לחניה</p>
        <div style={s.navRow}>
          {p.mapsLink && (
            <a href={p.mapsLink} target="_blank" rel="noreferrer" style={s.nav}>
              Google Maps
            </a>
          )}
          {hasCoords(p) && (
            <a href={wazeLink(p)} target="_blank" rel="noreferrer" style={{ ...s.nav, ...s.waze }}>
              Waze
            </a>
          )}
        </div>
      </div>

      {spot && (
        <div style={{ ...s.navGroup, ...s.spotGroup }}>
          <p style={s.navLabel}>📍 ניווט למקום עצמו (ברגל מהחניה)</p>
          <div style={s.navRow}>
            <a
              href={spotPoint ? `https://www.google.com/maps/dir/?api=1&destination=${spotPoint.lat},${spotPoint.lng}&travelmode=walking` : p.spotLink}
              target="_blank"
              rel="noreferrer"
              style={{ ...s.nav, ...s.spot }}
            >
              Google Maps
            </a>
            {spotPoint && (
              <a href={wazeLink(spotPoint)} target="_blank" rel="noreferrer" style={{ ...s.nav, ...s.waze }}>
                Waze
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { display: 'grid', gap: 10 },
  sec: { background: '#fff', borderRadius: 16, padding: '10px 12px', border: '1px solid #E3EAF3' },
  h3: { margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#14213D' },
  text: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#3A4658', whiteSpace: 'pre-line' },
  navGroup: { display: 'grid', gap: 6 },
  spotGroup: { background: '#E6F6EE', borderRadius: 16, padding: 10 },
  navLabel: { margin: 0, fontSize: 13, fontWeight: 700, color: '#3A4658' },
  navRow: { display: 'flex', gap: 8 },
  nav: { flex: 1, textAlign: 'center', background: '#1E6FD9', color: '#fff', borderRadius: 999, padding: '10px 0', fontWeight: 700, textDecoration: 'none', fontSize: 14, boxShadow: '0 3px 0 #1557AD' },
  waze: { flex: '0 0 32%', background: '#33ccff', color: '#0b2a3a', boxShadow: '0 3px 0 #1a9fd1' },
  spot: { background: '#22A06B', boxShadow: '0 3px 0 #17784F' },
};
