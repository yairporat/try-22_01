// ההרפתקאות שסיימתי (נשמרות במכשיר). כל אחת: { key, title, region, date, status, stops: [{ id, name, done }] }

const KEY = 'thv-adventures-done';

export function loadDoneAdventures() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function recordDoneAdventure(trip) {
  const list = loadDoneAdventures();
  const key = String(trip.startedAt || Date.now());
  if (list.some((a) => a.key === key)) return list;
  const stops = trip.adventure.stops.map((s) => ({ id: s.id, name: s.name, done: !!trip.verified?.[s.id] }));
  const entry = {
    key,
    title: trip.adventure.title,
    region: trip.adventure.region || '',
    date: Date.now(),
    status: trip.ended?.status === 'completed' && stops.every((s) => s.done) ? 'completed' : 'partial',
    stops,
  };
  const next = [entry, ...list].slice(0, 200);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

// הרפתקה פעילה שעצרתי באמצע (כדי להציע להמשיך)
export function activeTrip() {
  try {
    const t = JSON.parse(localStorage.getItem('thv-trip'));
    return t && t.adventure?.stops?.length && !t.ended ? t : null;
  } catch {
    return null;
  }
}
