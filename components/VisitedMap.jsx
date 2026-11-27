'use client';

// מפת המקומות שביקרתי בהם: פניקס על כל מקום.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { hasCoords } from '../lib/travel';

const VisitedMap = forwardRef(function VisitedMap({ places, onSelect }, ref) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef({});
  const [full, setFull] = useState(false);

  function fitAllPlaces() {
    const map = mapRef.current;
    const pts = places.filter(hasCoords);
    if (!map) return;
    if (!pts.length) map.setView([31.5, 35], 7);
    else if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 11);
    else map.fitBounds(pts.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 12 });
  }

  useImperativeHandle(ref, () => ({
    focus(id) {
      const m = markersRef.current[id];
      if (m && mapRef.current) {
        mapRef.current.flyTo(m.getLatLng(), 13, { duration: 0.6 });
        m.openPopup();
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((mod) => {
      if (cancelled || mapRef.current) return;
      const L = mod.default || mod;
      const map = L.map(boxRef.current, { zoomControl: false });
      L.control.zoom({ position: 'topleft' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      map.setView([31.4, 35.0], 7);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      draw(L);
    });
    return () => {
      cancelled = true;
      const map = mapRef.current;
      mapRef.current = null;
      if (map) {
        map.stop();
        setTimeout(() => map.remove(), 400);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(L) {
    const map = mapRef.current;
    if (!map) return;
    layerRef.current.clearLayers();
    markersRef.current = {};
    const pts = places.filter(hasCoords);
    pts.forEach((p) => {
      const count = p.visits.length;
      const icon = L.divIcon({
        className: '',
        html: `<div class="thv-bird"><img src="/phoenix-pin.png" alt="">${count > 1 ? `<span>${count}</span>` : ''}</div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 40],
        popupAnchor: [0, -36],
      });
      const popup = document.createElement('div');
      popup.dir = 'rtl';
      const b = document.createElement('b');
      b.textContent = p.name;
      const small = document.createElement('div');
      small.textContent = count > 1 ? `ביקרת כאן ${count} פעמים` : 'ביקרת כאן';
      popup.append(b, small);
      const m = L.marker([p.lat, p.lng], { icon, title: p.name, keyboard: true })
        .bindPopup(popup)
        .on('click', () => onSelect && onSelect(p.id))
        .addTo(layerRef.current);
      markersRef.current[p.id] = m;
    });
    if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 11);
    else if (pts.length) map.fitBounds(pts.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 12 });
  }

  useEffect(() => {
    import('leaflet').then((mod) => mapRef.current && draw(mod.default || mod));
  }, [places]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [full]);

  return (
    <div style={full ? { position: 'fixed', inset: 0, zIndex: 2500, background: '#fff' } : { position: 'relative' }}>
      <div ref={boxRef} style={{ height: full ? '100%' : 340, borderRadius: full ? 0 : 22, overflow: 'hidden', zIndex: 0, border: full ? 0 : '2px solid #e3e9ef' }} />
      <div style={{ position: 'absolute', bottom: 26, right: 10, zIndex: 500, display: 'flex', gap: 8 }}>
        <button type="button" style={mapBtn} onClick={fitAllPlaces}>כל המפה</button>
        <button type="button" style={{ ...mapBtn, width: 40, padding: 0, fontSize: 18 }} onClick={() => setFull((v) => !v)} aria-label={full ? 'יציאה ממסך מלא' : 'מסך מלא'}>{full ? '✕' : '⛶'}</button>
      </div>
      <style>{`
        .thv-bird { position: relative; width: 46px; height: 46px; filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
        .thv-bird img { width: 46px; height: 46px; object-fit: contain; display: block; }
        .thv-bird span {
          position: absolute; top: -4px; left: -4px; min-width: 20px; height: 20px; padding: 0 5px; box-sizing: border-box;
          border-radius: 10px; background: #1f78a8; color: #fff; font: 800 12px system-ui, sans-serif;
          display: flex; align-items: center; justify-content: center; border: 2px solid #fff;
        }
        .leaflet-popup-content { font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; margin: 10px 14px; }
      `}</style>
    </div>
  );
});

export default VisitedMap;

const mapBtn = { height: 40, background: '#fff', color: '#14213D', border: 0, borderRadius: 12, padding: '0 12px', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,.2)', cursor: 'pointer', fontFamily: 'inherit' };
