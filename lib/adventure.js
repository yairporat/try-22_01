import { mapsLinkFor } from './sheet.js';
import { estimateDrive, hasCoords } from './travel.js';

// לוגיקת ההתאמה: מקבלת את רשימת המקומות ואת הבחירות של המשתמש,
// ומחזירה הרפתקה (רשימת תחנות מסודרת).

export const REGIONS = ['גולן', 'גליל עליון', 'גליל תחתון', 'מרכז', 'שפלה', 'מדבר יהודה', 'נגב'];
export const DURATIONS = ['שעתיים', 'חצי יום', 'יום שלם'];
export const LEVELS = ['קל', 'בינוני', 'מאתגר'];
export const TYPES = ['מעיין', 'תצפית', 'מסלול', 'היסטוריה'];

// כמה דקות יש בכל משך הרפתקה
const DURATION_MINUTES = { 'שעתיים': 120, 'חצי יום': 270, 'יום שלם': 480 };
// זמן נסיעה בין תחנות כשאין מיקום מדויק לאחת מהן
const TRAVEL_MINUTES = 25;
// זמן לחנות ולהגיע מהרכב לתחנה
const PARK_MINUTES = 5;

// מקום בלי מיקום מדויק נחשב כאילו הוא במרכז האזור שלו (לפי המקומות האחרים באזור)
let CENTROIDS = {};
function setCentroids(places) {
  CENTROIDS = {};
  for (const r of REGIONS) {
    const pts = places.filter((p) => p.region === r && hasCoords(p));
    if (pts.length) CENTROIDS[r] = { lat: pts.reduce((n, p) => n + p.lat, 0) / pts.length, lng: pts.reduce((n, p) => n + p.lng, 0) / pts.length };
  }
}
const where = (p) => (hasCoords(p) ? p : (p && CENTROIDS[p.region]) || null);

// זמן נסיעה משוער בין שתי נקודות (בדקות)
function legMinutes(a, b) {
  const A = where(a), B = where(b);
  if (!A || !B) return TRAVEL_MINUTES;
  return estimateDrive(A, B).minutes + PARK_MINUTES;
}
function leg(a, b) {
  const A = where(a), B = where(b);
  if (!A || !B) return { minutes: TRAVEL_MINUTES, km: null, estimated: true };
  const d = estimateDrive(A, B);
  // כשאחת הנקודות בלי מיקום מדויק – לא מציגים מרחק
  const exact = hasCoords(a) && hasCoords(b);
  return { minutes: d.minutes + PARK_MINUTES, km: exact ? Math.round(d.km * 10) / 10 : null, estimated: true };
}
const MAX_STOPS = 5;

const TYPE_WORDS = { 'מעיין': 'מעיינות', 'תצפית': 'תצפיות', 'מסלול': 'מסלולים', 'היסטוריה': 'היסטוריה' };

// כמה דקות מעבר לזמן שבחרו עוד נחשבות "מתאים"
const FIT_TOLERANCE = 15;

// חלופה שכן נכנסת בזמן: קודם אזור אחר (הקרוב ביותר שמתאים), ואם אין – משך ארוך יותר באותו אזור
function suggestAlternative(places, { region, duration, level, origin, placeId }, random) {
  const tryOne = (c) => {
    const a = findAdventure(places, { mode: 'custom', level, origin, ...c, noSuggestion: true }, random);
    return a.stops.length && a.fit.fits ? a : null;
  };
  let regions = REGIONS.filter((r) => r !== region && places.some((p) => p.region === r));
  if (origin) {
    const d = (r) => Math.min(...places.filter((p) => p.region === r && hasCoords(p)).map((p) => distanceKm(origin, p)));
    regions = regions.sort((a, b) => d(a) - d(b));
  }
  for (const r of regions) {
    const a = tryOne({ region: r, duration });
    if (a) return { kind: 'region', region: r, duration, level, title: a.title, totalMinutes: a.plan.totalMinutes, stops: a.stops.length };
  }
  // משך ארוך יותר: קודם באותו אזור, ואחר כך באזורים האחרים (הקרובים קודם)
  for (const d of DURATIONS.slice(DURATIONS.indexOf(duration) + 1)) {
    for (const r of [region, ...regions]) {
      const a = tryOne({ region: r, duration: d, placeId: r === region ? placeId : undefined });
      if (a) return { kind: r === region ? 'duration' : 'both', region: r, duration: d, level, placeId: r === region ? placeId : undefined, title: a.title, totalMinutes: a.plan.totalMinutes, stops: a.stops.length };
    }
  }
  return null;
}

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
    if (!p.location) errors.push(`${where}: חסר מיקום בגוגל מפס (הדביקו קישור שיתוף מגוגל מפס, או כתבו שם מקום או כתובת)`);
  });
  return errors;
}

function distanceKm(a, b) {
  // מקום שלא הצלחנו לזהות את המיקום שלו נשלח לסוף המסלול
  if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number') return Infinity;
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

// מסדרת את התחנות כך שכל תחנה היא הקרובה ביותר לקודמת.
// עם נקודת יציאה (origin) – מתחילים בתחנה הקרובה אליה.
function orderByRoute(stops, origin = null) {
  if (stops.length < 2) return stops;
  const left = [...stops];
  if (hasCoords(origin)) left.sort((a, b) => distanceKm(origin, where(a)) - distanceKm(origin, where(b)) || 0);
  const route = [left.shift()];
  while (left.length) {
    const last = route[route.length - 1];
    left.sort((a, b) => distanceKm(where(last), where(a)) - distanceKm(where(last), where(b)) || 0);
    route.push(left.shift());
  }
  return route;
}

/**
 * בונה הרפתקה.
 * choice: { mode: 'surprise' | 'custom', region, duration, level, placeId }
 * placeId: כשבוחרים הרפתקה מומלצת – ההרפתקה תיבנה סביב המקום הזה.
 * origin: { lat, lng, label } – מאיפה יוצאים (המיקום שלי או עיר). לפיו מחושבות הנסיעות הלוך וחזור.
 */
export function findAdventure(places, choice = {}, random = Math.random) {
  let { region, duration, level, placeId } = choice;
  const origin = hasCoords(choice.origin) ? choice.origin : null;
  setCentroids(places);

  const start = placeId ? places.find((p) => p.id === placeId) : null;
  if (start) {
    region = start.region;
    level = level || start.difficulty;
  }

  if (choice.mode === 'surprise' || !region) {
    let withPlaces = REGIONS.filter((r) => places.some((p) => p.region === r));
    // כשיודעים מאיפה יוצאים – מעדיפים את האזורים הקרובים
    if (origin && !region) {
      const nearest = (r) => Math.min(...places.filter((p) => p.region === r && hasCoords(p)).map((p) => distanceKm(origin, p)));
      withPlaces = [...withPlaces].sort((a, b) => nearest(a) - nearest(b)).slice(0, duration === 'שעתיים' ? 1 : 2);
    }
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

  // בחירת התחנות בתוך הזמן שבחרו. כשיודעים מאיפה יוצאים, הנסיעה הלוך וחזור נכללת:
  // לתחנה הראשונה מוסיפים את הדרך אליה ובחזרה, ולכל תחנה נוספת את הנסיעה מהתחנה הקרובה שכבר נבחרה.
  const budget = DURATION_MINUTES[duration];
  const roundTrip = (p) => (origin ? legMinutes(origin, p) + legMinutes(p, origin) : 0);
  const stops = start ? [start] : [];
  let used = start ? start.visitMinutes + roundTrip(start) : 0;
  for (const p of ranked) {
    if (stops.length >= MAX_STOPS) break;
    const travel = stops.length ? Math.min(...stops.map((q) => legMinutes(q, p))) : roundTrip(p);
    const cost = p.visitMinutes + travel;
    if (used + cost <= budget) {
      stops.push(p);
      used += cost;
    }
  }
  // אם שום מקום לא נכנס בזמן, לוקחים לפחות את זה שלוקח הכי פחות זמן
  if (!stops.length && candidates.length) {
    const cost = (p) => p.visitMinutes + roundTrip(p);
    stops.push([...candidates].sort((a, b) => cost(a) - cost(b))[0]);
  }

  const ordered = start ? [start, ...orderByRoute(stops.slice(1))] : orderByRoute(stops, origin);

  const plan = planFor(ordered, origin);
  const { visitMinutes, betweenMinutes } = plan;
  const types = [...new Set(ordered.map((p) => p.type))].map((t) => TYPE_WORDS[t]);
  const title = types.length
    ? `${types.slice(0, 2).join(' ו')} ב${region}`
    : `הרפתקה ב${region}`;

  // האם ההרפתקה (כולל הנסיעות) נכנסת בזמן שבחרו? אם לא – מחפשים חלופה שכן
  const limit = DURATION_MINUTES[duration];
  const fits = plan.totalMinutes <= limit + FIT_TOLERANCE;
  const fit = {
    fits,
    limitMinutes: limit,
    totalMinutes: plan.totalMinutes,
    suggestion: fits || choice.noSuggestion ? null : suggestAlternative(places, { region, duration, level, origin, placeId: start?.id }, random),
  };

  return {
    title,
    fit,
    region,
    duration,
    difficulty: level,
    // זמן באזור ההרפתקה: ביקורים ונסיעות בין התחנות
    totalMinutes: visitMinutes + betweenMinutes,
    plan,
    stops: ordered.map(stopOut),
  };
}

// לוח הזמנים: נסיעה אל התחנה הראשונה, ביקורים ונסיעות ביניהן, וחזרה
function planFor(ordered, origin) {
  const between = ordered.slice(1).map((p, i) => leg(ordered[i], p));
  const visitMinutes = ordered.reduce((n, p) => n + p.visitMinutes, 0);
  const betweenMinutes = between.reduce((n, l) => n + l.minutes, 0);
  const toStart = origin && ordered.length ? leg(origin, ordered[0]) : null;
  const back = origin && ordered.length ? leg(ordered[ordered.length - 1], origin) : null;
  return {
    origin,
    toStart,
    between,
    back,
    visitMinutes,
    betweenMinutes,
    outsideMinutes: (toStart?.minutes || 0) + (back?.minutes || 0),
    totalMinutes: visitMinutes + betweenMinutes + (toStart?.minutes || 0) + (back?.minutes || 0),
  };
}

function stopOut(p) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    difficulty: p.difficulty,
    image: p.image || '',
    description: p.description,
    visitTime: `${p.visitMinutes} דקות`,
    mapsLink: mapsLinkFor(p),
    lat: p.lat,
    lng: p.lng,
    hours: p.hours || '',
    tips: p.tips || '',
    parking: p.parking || '',
    equipment: p.equipment || '',
    region: p.region,
  };
}

// ---- הרפתקאות שבניתי בעצמי (לשונית "הרפתקאות" בטבלה) ----
// curated: { id, name, description, image, stops: [placeId, ...] } – התחנות בסדר שבחרתי

// משך לפי הזמן באזור (ביקורים + נסיעות בין התחנות)
function durationLabel(minutes) {
  if (minutes <= 150) return 'שעתיים';
  if (minutes <= 330) return 'חצי יום';
  return 'יום שלם';
}
function regionLabel(stops) {
  const rs = [...new Set(stops.map((p) => p.region))];
  return rs.length <= 2 ? rs.join(' ו') : `${rs.slice(0, 2).join(', ')} ועוד`;
}

export function curatedSummary(places, curated) {
  setCentroids(places);
  const stops = curated.stops.map((id) => places.find((p) => p.id === id)).filter(Boolean);
  const plan = planFor(stops, null);
  return {
    id: curated.id,
    name: curated.name,
    description: curated.description || '',
    image: curated.image || '',
    stopCount: stops.length,
    region: regionLabel(stops),
    duration: durationLabel(plan.visitMinutes + plan.betweenMinutes),
    difficulty: LEVELS[Math.max(0, ...stops.map((p) => LEVELS.indexOf(p.difficulty)))],
    areaMinutes: plan.visitMinutes + plan.betweenMinutes,
  };
}

export function buildCurated(places, curated, origin = null) {
  setCentroids(places);
  const o = hasCoords(origin) ? origin : null;
  const stops = curated.stops.map((id) => places.find((p) => p.id === id)).filter(Boolean);
  const plan = planFor(stops, o);
  const sum = curatedSummary(places, curated);
  return {
    title: curated.name,
    description: curated.description || '',
    curatedId: curated.id,
    fit: null, // הרפתקה שבניתי – לא בודקים מול זמן שנבחר
    region: sum.region,
    duration: sum.duration,
    difficulty: sum.difficulty,
    totalMinutes: plan.visitMinutes + plan.betweenMinutes,
    plan,
    stops: stops.map(stopOut),
  };
}

// בודק את לשונית ההרפתקאות: כל תחנה צריכה להיות מקום שקיים ברשימה
export function validateCurated(curatedList, places, label = (i) => `הרפתקה ${i + 1}`) {
  const errors = [];
  curatedList.forEach((c, i) => {
    const where = `${label(i)}${c.name ? ` (${c.name})` : ''}`;
    if (!c.name) errors.push(`${where}: חסר שם להרפתקה`);
    if (!c.stops.length) errors.push(`${where}: צריך לפחות תחנה אחת`);
    (c.missing || []).forEach((n) => errors.push(`${where}: התחנה "${n}" לא נמצאה ברשימת המקומות`));
  });
  return errors;
}
