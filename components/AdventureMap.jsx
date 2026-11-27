'use client';

// מפת ההרפתקה: התחנות (ממוספרות), הקו שמחבר ביניהן, והמיקום של המשתמש.
// לחיצה על תחנה קוראת ל-onSelect עם מספר התחנה.

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { hasCoords } from '../lib/travel';

// focus: מספר תחנה להתמקד בה (במסך הניווט) – המפה מראה אותה ואת המיקום שלך, עם קו ביניהם.
export default function AdventureMap({ stops, userPos, selected, onSelect, focus = null, height = 300 }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ stops: null, user: null, L: null });
  const fittedRef = useRef(false);
  const [full, setFull] = useState(false);

  // מסך מלא: אחרי שינוי הגודל Leaflet צריך למדוד מחדש
  useEffect(() => {
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize();
      fitAll();
    }, 60);
    const onKey = (e) => e.key === 'Escape' && setFull(false);
    if (full) window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps

  // יצירת המפה פעם אחת
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      if (cancelled || mapRef.current) return;
      const L = mod.default || mod;
      const map = L.map(boxRef.current, { zoomControl: false, attributionControl: true });
      L.control.zoom({ position: 'topleft' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap',
      }).addTo(map);
      map.setView([31.5, 35], 7);
      mapRef.current = map;
      layersRef.current.L = L;
      layersRef.current.stops = L.layerGroup().addTo(map);
      layersRef.current.user = L.layerGroup().addTo(map);
      drawStops();
      drawUser();
    });
    return () => {
      cancelled = true;
      const map = mapRef.current;
      mapRef.current = null;
      if (map) {
        // נותנים לאנימציה של Leaflet להסתיים לפני שסוגרים את המפה (אחרת יש שגיאה ביציאה באמצע זום)
        map.stop();
        setTimeout(() => map.remove(), 400);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawStops() {
    const { L, stops: layer } = layersRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    layer.clearLayers();
    const points = stops.map((s, i) => ({ s, i })).filter(({ s }) => hasCoords(s));
    if (points.length > 1) {
      L.polyline(
        points.map(({ s }) => [s.lat, s.lng]),
        { color: '#2f80ed', weight: 4, opacity: 0.7, dashArray: '8 8' },
      ).addTo(layer);
    }
    points.forEach(({ s, i }) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="thv-pin${i === selected ? ' on' : ''}${focus !== null && i !== focus ? ' dim' : ''}">${i + 1}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([s.lat, s.lng], { icon, title: s.name, keyboard: true })
        .on('click', () => onSelect && onSelect(i))
        .addTo(layer);
    });
    if (!fittedRef.current && points.length) {
      fitAll();
      fittedRef.current = true;
    }
  }

  function drawUser() {
    const { L, user: layer } = layersRef.current;
    if (!L || !mapRef.current) return;
    layer.clearLayers();
    if (!userPos) return;
    const target = focus !== null ? stops[focus] : null;
    if (hasCoords(target)) {
      L.polyline([[userPos.lat, userPos.lng], [target.lat, target.lng]], {
        color: '#f2653a', weight: 4, opacity: 0.8, dashArray: '2 10', lineCap: 'round',
      }).addTo(layer);
    }
    L.circle([userPos.lat, userPos.lng], {
      radius: userPos.accuracy || 50,
      color: '#2f80ed',
      weight: 1,
      fillOpacity: 0.12,
    }).addTo(layer);
    L.marker([userPos.lat, userPos.lng], {
      icon: L.divIcon({ className: '', html: '<div class="thv-me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
      title: 'המיקום שלך',
      zIndexOffset: 1000,
    }).addTo(layer);
  }

  function fitAll() {
    const { L } = layersRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const shown = focus !== null ? [stops[focus]] : stops;
    const pts = shown.filter(hasCoords).map((s) => [s.lat, s.lng]);
    if (userPos) pts.push([userPos.lat, userPos.lng]);
    if (pts.length === 1) map.setView(pts[0], 13);
    else if (pts.length) map.fitBounds(pts, { padding: [36, 36] });
  }

  useEffect(drawStops, [stops, selected, focus]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focus === null) return;
    drawUser();
    fitAll();
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    drawUser(); // מתעדכן כשהמיקום זז
    // כשהמיקום מגיע בפעם הראשונה – מראים גם אותו וגם את התחנות
    if (userPos && !layersRef.current.userFitted && mapRef.current) {
      layersRef.current.userFitted = true;
      fitAll();
    }
  }, [userPos]); // eslint-disable-line react-hooks/exhaustive-deps

  // כשבוחרים תחנה – מזיזים את המפה אליה
  useEffect(() => {
    const s = stops[selected];
    if (focus === null && mapRef.current && hasCoords(s)) mapRef.current.panTo([s.lat, s.lng]);
  }, [selected, stops]);

  return (
    <div style={full ? fullWrap : { position: 'relative' }}>
      <div ref={boxRef} style={{ height: full ? '100%' : height, borderRadius: full ? 0 : 18, overflow: 'hidden', zIndex: 0 }} />
      <button type="button" onClick={() => setFull((v) => !v)} style={fullButton} aria-label={full ? 'יציאה ממסך מלא' : 'מסך מלא'}>
        {full ? '✕' : '⛶'}
      </button>
      <button type="button" onClick={fitAll} style={fitButton}>
        {focus !== null ? 'אני והתחנה' : 'כל ההרפתקה'}
      </button>
      <style>{`
        .thv-pin {
          width: 36px; height: 36px; border-radius: 50%;
          background: #f2653a; color: #fff; font: 800 16px system-ui, sans-serif;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.3);
          box-sizing: border-box; cursor: pointer; transition: transform .15s;
        }
        .thv-pin.on { background: #1c5fb8; transform: scale(1.2); }
        .thv-pin.dim { opacity: .45; transform: scale(.8); }
        .thv-me {
          width: 20px; height: 20px; border-radius: 50%;
          background: #2f80ed; border: 3px solid #fff; box-sizing: border-box;
          box-shadow: 0 0 0 6px rgba(47,128,237,.25);
        }
        .leaflet-container { font-family: system-ui, sans-serif; }
      `}</style>
    </div>
  );
}

const fitButton = {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 500,
  background: '#fff',
  color: '#1c5fb8',
  border: 'none',
  borderRadius: 12,
  padding: '7px 12px',
  fontWeight: 700,
  fontSize: 13,
  boxShadow: '0 2px 8px rgba(0,0,0,.2)',
  cursor: 'pointer',
};

const fullWrap = { position: 'fixed', inset: 0, zIndex: 2500, background: '#fff' };
const fullButton = { ...fitButton, top: 'auto', bottom: 26, right: 10, width: 40, height: 40, padding: 0, fontSize: 18, color: '#14213D' };
