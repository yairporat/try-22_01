// לוגיקת ההתאמה: מקבלת את רשימת המקומות ואת הבחירות של המשתמש,
// ומחזירה הרפתקה (רשימת תחנות מסודרת).

export const REGIONS = ['גולן', 'גליל עליון', 'גליל תחתון', 'מרכז', 'שפלה', 'מדבר יהודה', 'נגב'];
export const DURATIONS = ['שעתיים', 'חצי יום', 'יום שלם'];
export const LEVELS = ['קל', 'בינוני', 'מאתגר'];
export const TYPES = ['מעיין', 'תצפית', 'מסלול', 'היסטוריה'];

// כמה דקות יש בכל משך הרפתקה
const DURATION_MINUTES = { 'שעתיים': 120, 'חצי יום': 270, 'יום שלם': 480 };
// זמן נסיעה משוער בין תחנות
const TRAVEL_MINUTES = 25;
const MAX_STOPS = 5;

const TYPE_WORDS = { 'מעיין': 'מעיינות', 'תצפית': 'תצפיות', 'מסלול': 'מסלולים', 'היסטוריה': 'היסטוריה' };

// בודקת שהקובץ תקין. מחזירה רשימת שגיאות בעברית (ריקה אם הכל תקין).
export function validatePlaces(places, label = (i) => `מקום מספר ${i + 1}`) {
  const errors = [];
  if (!Array.isArray(places)) return ['הקובץ צריך להיות רשימה שמתחילה ב-[ ומסתיימת ב-]'];
  const ids = new Set();
  places.forEach((p, i) => {
    const where = `${label(i)}${p && p.name ? ` (${p.name})` : ''}`;
    if (!p || typeof p !== 'object') return errors.push(`${where}: לא מקום תקין`);
    if (!p.id) errors.push(`${where}: חסר מזהה`);
    else if (ids.has(p.id)) errors.push(`${where}: המזהה "${p.id}" כבר קיים בשורה אחרת`);
    ids.add(p.id);
    if (!p.name) errors.push(`${where}: חסר שם המקום`);
    if (!REGIONS.includes(p.region)) errors.push(`${where}: אזור צריך להיות אחד מ: ${REGIONS.join(', ')}`);
    if (!TYPES.includes(p.type)) errors.push(`${where}: סוג צריך להיות אחד מ: ${TYPES.join(', ')}`);
    if (!LEVELS.includes(p.difficulty)) errors.push(`${where}: רמת קושי צריכה להיות אחד מ: ${LEVELS.join(', ')}`);
    if (!(p.visitMinutes > 0)) errors.push(`${where}: זמן ביקור צריך להיות מספר דקות, למשל 60`);
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') errors.push(`${where}: קו רוחב וקו אורך צריכים להיות מספרים (קואורדינטות)`);
  });
  return errors;
}

function distanceKm(a, b) {
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// מסדרת את התחנות כך שכל תחנה היא הקרובה ביותר לקודמת
function orderByRoute(stops) {
  if (stops.length < 2) return stops;
  const left = [...stops];
  const route = [left.shift()];
  while (left.length) {
    const last = route[route.length - 1];
    left.sort((a, b) => distanceKm(last, a) - distanceKm(last, b));
    route.push(left.shift());
  }
  return route;
}

/**
 * בונה הרפתקה.
 * choice: { mode: 'surprise' | 'custom', region, duration, level, placeId }
 * placeId: כשבוחרים הרפתקה מומלצת – ההרפתקה תיבנה סביב המקום הזה.
 */
export function findAdventure(places, choice = {}, random = Math.random) {
  let { region, duration, level, placeId } = choice;

  const start = placeId ? places.find((p) => p.id === placeId) : null;
  if (start) {
    region = start.region;
    level = level || start.difficulty;
  }

  if (choice.mode === 'surprise' || !region) {
    const withPlaces = REGIONS.filter((r) => places.some((p) => p.region === r));
    region = region || withPlaces[Math.floor(random() * withPlaces.length)];
  }
  duration = DURATIONS.includes(duration) ? duration : 'חצי יום';
  level = LEVELS.includes(level) ? level : choice.mode === 'surprise' ? 'בינוני' : 'קל';

  // מקומות באזור שלא קשים יותר ממה שהמשתמש בחר
  const maxLevel = LEVELS.indexOf(level);
  const candidates = places.filter(
    (p) => p.region === region && LEVELS.indexOf(p.difficulty) <= maxLevel && p.id !== start?.id,
  );

  // קודם מקומות ברמה שנבחרה בדיוק, אחר כך הקלים יותר (בסדר אקראי, כדי לגוון)
  const ranked = [
    ...shuffle(candidates.filter((p) => p.difficulty === level), random),
    ...shuffle(candidates.filter((p) => p.difficulty !== level), random),
  ];

  const budget = DURATION_MINUTES[duration];
  const stops = start ? [start] : [];
  let used = start ? start.visitMinutes : 0;
  for (const p of ranked) {
    if (stops.length >= MAX_STOPS) break;
    const cost = p.visitMinutes + (stops.length ? TRAVEL_MINUTES : 0);
    if (used + cost <= budget) {
      stops.push(p);
      used += cost;
    }
  }
  // אם שום מקום לא נכנס בזמן, לוקחים לפחות את הקצר ביותר
  if (!stops.length && candidates.length) {
    stops.push([...candidates].sort((a, b) => a.visitMinutes - b.visitMinutes)[0]);
  }

  const ordered = start ? [start, ...orderByRoute(stops.slice(1))] : orderByRoute(stops);
  const types = [...new Set(ordered.map((p) => p.type))].map((t) => TYPE_WORDS[t]);
  const title = types.length
    ? `${types.slice(0, 2).join(' ו')} ב${region}`
    : `הרפתקה ב${region}`;

  return {
    title,
    region,
    duration,
    difficulty: level,
    totalMinutes: ordered.reduce((s, p, i) => s + p.visitMinutes + (i ? TRAVEL_MINUTES : 0), 0),
    stops: ordered.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      difficulty: p.difficulty,
      image: p.image || '',
      description: p.description,
      visitTime: `${p.visitMinutes} דקות`,
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
    })),
  };
}
