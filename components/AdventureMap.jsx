'use client';

// מפת ההרפתקה: התחנות (ממוספרות), הקו שמחבר ביניהן, והמיקום של המשתמש.
// לחיצה על תחנה קוראת ל-onSelect עם מספר התחנה.

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { hasCoords } from '../lib/travel';

export default function AdventureMap({ stops, userPos, selected, onSelect }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ stops: null, user: null, L: null });
  const fittedRef = useRef(false);

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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
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
        html: `<div class="thv-pin${i === selected ? ' on' : ''}">${i + 1}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([s.lat, s.lng], { icon, title: s.name, keyboard: true })
        .on('click', () => onSelect(i))
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
    const pts = stops.filter(hasCoords).map((s) => [s.lat, s.lng]);
    if (userPos) pts.push([userPos.lat, userPos.lng]);
    if (pts.length === 1) map.setView(pts[0], 13);
    else if (pts.length) map.fitBounds(pts, { padding: [36, 36] });
  }

  useEffect(drawStops, [stops, selected]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    drawUser();
    // כשהמיקום מגיע בפעם הראשונה – מראים גם אותו וגם את התחנות
    if (userPos && !layersRef.current.userFitted && mapRef.current) {
      layersRef.current.userFitted = true;
      fitAll();
    }
  }, [userPos]); // eslint-disable-line react-hooks/exhaustive-deps

  // כשבוחרים תחנה – מזיזים את המפה אליה
  useEffect(() => {
    const s = stops[selected];
    if (mapRef.current && hasCoords(s)) mapRef.current.panTo([s.lat, s.lng]);
  }, [selected, stops]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={boxRef} style={{ height: 300, borderRadius: 18, overflow: 'hidden', zIndex: 0 }} />
      <button type="button" onClick={fitAll} style={fitButton}>
        כל ההרפתקה
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
