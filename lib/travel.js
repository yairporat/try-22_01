// חישוב מרחק וזמן נסיעה בין שתי נקודות.

export const hasCoords = (p) => p && typeof p.lat === 'number' && typeof p.lng === 'number';

// מרחק בקו אווירי בק"מ
export function airKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// הערכה בלי אינטרנט: הכביש ארוך בערך פי 1.35 מהקו האווירי.
// המהירות הממוצעת עולה עם המרחק: כ-45 קמ"ש בנסיעה קצרה, ועד 80 קמ"ש בכבישים מהירים.
export function estimateDrive(a, b) {
  const km = airKm(a, b) * 1.35;
  const speed = 40 + Math.min(40, km / 3);
  return { km, minutes: Math.max(2, Math.round((km / speed) * 60)), estimated: true };
}

// זמן נסיעה לפי הכבישים (שירות OSRM החינמי). אם אין חיבור – חוזרים להערכה.
const cache = new Map();
export async function driveTime(a, b) {
  const key = [a.lat, a.lng, b.lat, b.lng].map((n) => n.toFixed(4)).join(',');
  if (cache.has(key)) return cache.get(key);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error('no route');
    const result = { km: route.distance / 1000, minutes: Math.max(1, Math.round(route.duration / 60)), estimated: false };
    cache.set(key, result);
    return result;
  } catch {
    return estimateDrive(a, b);
  }
}

export function formatMinutes(m) {
  if (m < 60) return `${m} דק'`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} ש' ${r} דק'` : `${h} ש'`;
}

export const formatKm = (km) => (km < 10 ? km.toFixed(1) : Math.round(km)) + ' ק"מ';

// קישור לניווט ב-Waze
export const wazeLink = (p) => `https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes`;
