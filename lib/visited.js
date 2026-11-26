// המקומות שביקרתי בהם. נשמרים במכשיר (localStorage).
// כל מקום: { id, name, region, type, lat, lng, visits: [{ date, adventure }] }

const KEY = 'thv-visited';

export function loadVisited() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

// נקרא כשמגיעים לתחנה (אימות במיקום או אישור ידני)
export function recordVisit(stop, adventureTitle) {
  const all = loadVisited();
  const prev = all[stop.id];
  all[stop.id] = {
    id: stop.id,
    name: stop.name,
    region: stop.region,
    type: stop.type,
    lat: stop.lat,
    lng: stop.lng,
    visits: [...(prev?.visits || []), { date: Date.now(), adventure: adventureTitle }],
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  return all;
}

// רשימה מסודרת: הביקור האחרון קודם
export function visitedList(all = loadVisited()) {
  return Object.values(all).sort((a, b) => lastVisit(b) - lastVisit(a));
}
export const lastVisit = (p) => Math.max(...p.visits.map((v) => v.date));

export function formatDate(ms) {
  return new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}
