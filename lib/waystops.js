// "עצירות בדרך": מקומות שנמצאים על הדרך מנקודת היציאה אל התחנה הראשונה, גם מחוץ לאזור שנבחר.
// הם לא נכנסים להרפתקה לבד – האפליקציה מציעה אותם ("אפשר לעצור בדרך"), והמשתמש מוסיף אם רוצה.
//
// איך יודעים שמקום "על הדרך":
// 1. לבד: המסלול בכבישים (OSRM) עובר עד 2.5 ק"מ ממנו.
// 2. מקום שהמנהל סימן "מתאים לעצירה בדרך": עד 6 ק"מ מהמסלול, או שהמסלול עובר באחד הכבישים
//    שהמנהל כתב לו (למשל "כביש 6, 90") והעיקוף לא גדול.
// אם אין חיבור לשירות המסלולים – לפי קו אווירי: עיקוף של עד 6 ק"מ.

import { hasCoords } from './travel.js';

const AUTO_KM = 2.5;
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

const cache = new Map();
async function routeBetween(a, b) {
  const key = [a.lat, a.lng, b.lat, b.lng].map((n) => n.toFixed(3)).join(',');
  if (cache.has(key)) return cache.get(key);
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=simplified&geometries=geojson&steps=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
  const route = (await res.json()).routes?.[0];
  if (!route) throw new Error('no route');
  const line = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  const refs = new Set();
  for (const leg of route.legs || []) for (const st of leg.steps || []) roadNumbers(st.ref).forEach((r) => refs.add(r));
  const out = { line, refs };
  if (cache.size > 300) cache.clear();
  cache.set(key, out);
  return out;
}

/**
 * עד max מקומות "על הדרך" מ-origin אל first (התחנה הראשונה).
 * skip: מזהים שלא להציע (התחנות שכבר בהרפתקה, מקומות שביקרתי בהם כשמסומן "רק חדשים").
 */
export async function findWayStops(places, { origin, first, skip = [], max = 3 }) {
  if (!hasCoords(origin) || !hasCoords(first)) return [];
  const total = km(origin, first);
  if (total < 15) return []; // נסיעה קצרה – אין "דרך"
  const skipSet = new Set(skip);
  let route = null;
  try {
    route = await routeBetween(origin, first);
  } catch {}

  const found = [];
  for (const p of places) {
    if (skipSet.has(p.id) || !hasCoords(p)) continue;
    // עצירה בדרך צריכה להיות קצרה: בלי מסלולים ארוכים או מאתגרים (אלא אם המנהל סימן אותה)
    if (!p.wayStop && (p.difficulty === 'מאתגר' || p.visitMinutes > 90)) continue;
    // לא ממש ליד נקודת היציאה או ליד התחנה הראשונה
    if (km(origin, p) < 8 || km(first, p) < 5) continue;
    const detour = km(origin, p) + km(p, first) - total;
    let why = null;
    let off = Infinity;
    if (route) {
      off = toLine(p, route.line);
      const roads = roadNumbers(p.roads);
      if (off <= AUTO_KM) why = 'auto';
      else if (p.wayStop && off <= MARKED_KM) why = 'marked';
      else if (p.wayStop && roads.some((r) => route.refs.has(r)) && detour <= ROAD_DETOUR_KM) why = 'road';
    } else if (detour <= (p.wayStop ? 10 : 6)) {
      why = 'air';
      off = detour / 2;
    }
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
      why,
      offKm: Math.max(0, Math.round(off * 10) / 10),
      // בערך כמה דקות העצירה מוסיפה: הביקור + יציאה מהכביש וחזרה
      extraMinutes: p.visitMinutes + Math.round((Math.max(off, detour / 2) * 2 * 60) / 50) + 5,
    });
  }
  // קודם מקומות שהמנהל סימן, ואחר כך הקרובים ביותר לדרך; מקומות קצרים עדיפים
  found.sort((a, b) => Number(b.marked) - Number(a.marked) || a.offKm - b.offKm || a.visitMinutes - b.visitMinutes);
  return found.slice(0, max);
}
