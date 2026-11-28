// "עצירות בדרך": מקומות שנמצאים על הדרך – מנקודת היציאה אל התחנות ובין התחנות – באותו אזור או באזור סמוך.
// הם לא נכנסים להרפתקה לבד – האפליקציה מציעה אותם ("אפשר לעצור בדרך"), והמשתמש מוסיף אם רוצה.
//
// איך יודעים שמקום "על הדרך":
// 1. לבד: המסלול בכבישים עובר עד 3.5 ק"מ ממנו. המסלול – מגוגל מפס (אם יש GOOGLE_MAPS_API_KEY), אחרת מ-OSRM.
// 2. מקום שהמנהל סימן "מתאים לעצירה בדרך": עד 6 ק"מ מהמסלול, או שהמסלול עובר באחד הכבישים
//    שהמנהל כתב לו (למשל "כביש 6, 90") והעיקוף לא גדול.
// אם אין חיבור לשירות המסלולים – לפי קו אווירי: עיקוף של עד 6 ק"מ.

import { hasCoords } from './travel.js';

const AUTO_KM = 3.5;
const MARKED_KM = 6;
const ROAD_DETOUR_KM = 15;

const km = (a, b) => {
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};

// מרחק מנקודה לקטע (ק"מ), בהטלה שטוחה – מספיק מדויק למרחקים כאלה
function toSegment(p, a, b) {
  const kx = 111 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 111;
  const ax = (a.lng - p.lng) * kx, ay = (a.lat - p.lat) * ky;
  const bx = (b.lng - p.lng) * kx, by = (b.lat - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
const toLine = (p, line) => {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, toSegment(p, line[i - 1], line[i]));
  return best;
};

// מספרי הכבישים מטקסט כמו "כביש 6, 90 ו-77" → ['6','90','77']
export const roadNumbers = (text) => [...new Set(String(text || '').match(/\d{1,4}/g) || [])];

// פענוח polyline של גוגל לרשימת נקודות
function decodePolyline(str) {
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d;
      else lng += d;
    }
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

const cache = new Map();
// המסלול בכבישים דרך כל הנקודות (יציאה, תחנה 1, תחנה 2...): הקו על המפה ומספרי הכבישים שבדרך
async function routeThrough(points) {
  const key = points.map((p) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`).join(';');
  if (cache.has(key)) return cache.get(key);
  let out = null;
  const gkey = process.env.GOOGLE_MAPS_API_KEY;
  if (gkey) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
      const ll = (p) => `${p.lat},${p.lng}`;
      url.searchParams.set('origin', ll(points[0]));
      url.searchParams.set('destination', ll(points[points.length - 1]));
      if (points.length > 2) url.searchParams.set('waypoints', points.slice(1, -1).map(ll).join('|'));
      url.searchParams.set('language', 'he');
      url.searchParams.set('region', 'il');
      url.searchParams.set('key', gkey);
      const data = await (await fetch(url, { signal: AbortSignal.timeout(5000) })).json();
      const route = data.routes?.[0];
      if (route) {
        const refs = new Set();
        for (const leg of route.legs || [])
          for (const st of leg.steps || []) for (const m of String(st.html_instructions || '').matchAll(/(?:כביש|Route|Rte|Hwy|Highway|road)\s*(\d{1,4})/gi)) refs.add(m[1]);
        out = { line: decodePolyline(route.overview_polyline.points), refs };
      }
    } catch {}
  }
  if (!out) {
    const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=simplified&geometries=geojson&steps=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    const route = (await res.json()).routes?.[0];
    if (!route) throw new Error('no route');
    const refs = new Set();
    for (const leg of route.legs || []) for (const st of leg.steps || []) roadNumbers(st.ref).forEach((r) => refs.add(r));
    out = { line: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })), refs };
  }
  if (cache.size > 300) cache.clear();
  cache.set(key, out);
  return out;
}

// איפה להכניס עצירה: לפני התחנה שהעיקוף אליה הכי קטן (0 = לפני הראשונה)
export function bestInsertAt(p, origin, stops) {
  let best = { at: stops.length, cost: Infinity };
  for (let k = 0; k <= stops.length; k++) {
    const prev = k === 0 ? origin : stops[k - 1];
    const next = k < stops.length ? stops[k] : null;
    if (!prev || !hasCoords(prev)) continue;
    const cost = next && hasCoords(next) ? km(prev, p) + km(p, next) - km(prev, next) : km(prev, p) * 1.5;
    if (cost < best.cost) best = { at: k, cost };
  }
  return best.at;
}

/**
 * עד max מקומות "על הדרך": מנקודת היציאה אל התחנות ובין התחנות.
 * stops: התחנות לפי הסדר. skip: מזהים שלא להציע (התחנות עצמן, מקומות שביקרתי בהם כשמסומן "רק חדשים").
 * לכל מקום: insertAt – לפני איזו תחנה להכניס אותו.
 */
export async function findWayStops(places, { origin, stops, skip = [], max = 5 }) {
  const pts = stops.filter(hasCoords);
  if (!hasCoords(origin) || !pts.length) return [];
  const skipSet = new Set(skip);
  let route = null;
  try {
    route = await routeThrough([origin, ...pts]);
  } catch {}
  // קו אווירי בין הנקודות, אם אין מסלול
  const airLine = [origin, ...pts];
  const regions = new Set(stops.map((x) => x.region));

  const found = [];
  for (const p of places) {
    if (skipSet.has(p.id) || !hasCoords(p)) continue;
    if (!p.wayStop && (p.difficulty === 'מאתגר' || p.visitMinutes > 90)) continue;
    if (km(origin, p) < 8) continue; // לא ממש ליד הבית
    let why = null;
    let off = route ? toLine(p, route.line) : toLine(p, airLine);
    const roads = roadNumbers(p.roads);
    if (route) {
      if (off <= AUTO_KM) why = 'auto';
      else if (p.wayStop && off <= MARKED_KM) why = 'marked';
      else if (p.wayStop && roads.some((r) => route.refs.has(r)) && off <= ROAD_DETOUR_KM / 2) why = 'road';
    } else if (off <= (p.wayStop ? 12 : 8)) why = 'air'; // בלי מסלול בכבישים – קו אווירי, עם יותר מרווח
    if (!why) continue;
    found.push({
      id: p.id,
      name: p.name,
      region: p.region,
      type: p.type,
      difficulty: p.difficulty,
      image: p.image || '',
      visitMinutes: p.visitMinutes,
      marked: !!p.wayStop,
      roads: p.roads || '',
      sameRegion: regions.has(p.region),
      why,
      offKm: Math.max(0, Math.round(off * 10) / 10),
      insertAt: bestInsertAt(p, origin, stops),
      // בערך כמה דקות העצירה מוסיפה: הביקור + יציאה מהכביש וחזרה
      extraMinutes: p.visitMinutes + Math.round((off * 2 * 60) / 50) + 5,
    });
  }
  // קודם מקומות שהמנהל סימן, ואחר כך הקרובים ביותר לדרך
  found.sort((a, b) => Number(b.marked) - Number(a.marked) || a.offKm - b.offKm || a.visitMinutes - b.visitMinutes);
  return found.slice(0, max);
}
