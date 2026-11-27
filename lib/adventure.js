import { mapsLinkFor } from './sheet.js';
import { estimateDrive, hasCoords } from './travel.js';
import { withTraffic, breakMinutes, trafficFactor } from './traffic.js';

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

// שעת היציאה: לפיה מחושבים הפקקים בכל קטע נסיעה (קטע שמתחיל שעתיים אחרי היציאה – לפי השעה שלו)
let DEPART = new Date();
const clockAt = (offsetMinutes = 0) => new Date(DEPART.getTime() + offsetMinutes * 60000);

// זמן נסיעה משוער בין שתי נקודות (בדקות), כולל העומס הצפוי
// offset: כמה דקות אחרי היציאה מתחילים את הקטע הזה
function legMinutes(a, b, offset = 0) {
  const A = where(a), B = where(b);
  if (!A || !B) return withTraffic(TRAVEL_MINUTES, clockAt(offset));
  return withTraffic(estimateDrive(A, B).minutes, clockAt(offset)) + PARK_MINUTES;
}
function leg(a, b, offset = 0) {
  const A = where(a), B = where(b);
  const when = clockAt(offset);
  if (!A || !B) return { minutes: withTraffic(TRAVEL_MINUTES, when), km: null, estimated: true, traffic: trafficFactor(when) > 1 };
  const d = estimateDrive(A, B);
  const free = d.minutes;
  const busy = withTraffic(free, when);
  // כשאחת הנקודות בלי מיקום מדויק – לא מציגים מרחק
  const exact = hasCoords(a) && hasCoords(b);
  return { minutes: busy + PARK_MINUTES, km: exact ? Math.round(d.km * 10) / 10 : null, estimated: true, trafficMinutes: busy - free, at: when.toISOString() };
}
const MAX_STOPS = 5;

const TYPE_WORDS = { 'מעיין': 'מעיינות', 'תצפית': 'תצפיות', 'מסלול': 'מסלולים', 'היסטוריה': 'היסטוריה' };

// כמה דקות מעבר לזמן שבחרו עוד נחשבות "מתאים"
const FIT_TOLERANCE = 15;

// חלופה שכן נכנסת בזמן: קודם אזור אחר (הקרוב ביותר שמתאים), ואם אין – משך ארוך יותר באותו אזור
function suggestAlternative(places, { region, duration, level, origin, placeId, departAt }, random) {
  const tryOne = (c) => {
    const a = findAdventure(places, { mode: 'custom', level, origin, departAt, ...c, noSuggestion: true }, random);
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

// ---- הרכבת הרפתקה מאוזנת וזורמת ----
// "כבדה" = מסלול ארוך או תחנה מאתגרת. בהרפתקה אחת יש לכל היותר אחת כזו.
const isHeavy = (p) => p.difficulty === 'מאתגר' || (p.type === 'מסלול' && p.visitMinutes >= 90) || p.visitMinutes >= 150;
// כמה רחוק מותר להתרחק מהתחנה הראשונה, וכמה רחוקה יכולה להיות קפיצה בין תחנות (ק"מ, קו אווירי)
const SPAN_KM = { 'שעתיים': 10, 'חצי יום': 18, 'יום שלם': 28 };
const HOP_KM = { 'שעתיים': 8, 'חצי יום': 14, 'יום שלם': 20 };
// תחנה "על הדרך" מנקודת היציאה לתחנה הראשונה: עיקוף של עד כמה ק"מ
const DETOUR_KM = 6;

// בונה הרפתקה מתחנה ראשונה אחת: מוסיפים כל פעם את התחנה הטובה ביותר שעוד נכנסת בזמן –
// סוג שעוד אין (מעיין, תצפית, מסלול...), קרובה לתחנות שכבר נבחרו או על הדרך, ובלי שתי תחנות כבדות.
function buildFrom(anchor, { pool, start, budget, duration, level, origin, roundTrip, random }) {
  const stops = [anchor];
  let used = anchor.visitMinutes + roundTrip(anchor);
  const A = where(anchor);
  const base = origin && A ? distanceKm(origin, A) : null;
  const typeCount = (t) => stops.filter((x) => x.type === t).length;

  for (;;) {
    if (stops.length >= MAX_STOPS) break;
    let best = null;
    for (const p of pool) {
      if (stops.includes(p)) continue;
      if (isHeavy(p) && stops.some(isHeavy)) continue; // לא שני מסלולים ארוכים/מאתגרים
      if (typeCount(p.type) >= 2) continue; // לא שלוש תחנות מאותו סוג
      const P = where(p);
      const nearest = Math.min(...stops.map((q) => distanceKm(where(q), P)));
      const fromAnchor = A && P ? distanceKm(A, P) : 0;
      // זרימה: קרוב לתחנות שכבר נבחרו ובתוך האזור של ההרפתקה, או על הדרך מנקודת היציאה
      const onTheWay = base !== null && P ? distanceKm(origin, P) + distanceKm(P, A) - base <= DETOUR_KM : false;
      if (!onTheWay && (nearest > HOP_KM[duration] || fromAnchor > SPAN_KM[duration])) continue;
      const travel = Math.min(...stops.map((q) => legMinutes(q, p, used)));
      const cost = p.visitMinutes + travel;
      if (used + cost > budget) continue;
      const score =
        (typeCount(p.type) ? -2 : 3) + // גיוון: סוג חדש עדיף
        (p.difficulty === level ? 1 : 0) +
        (p.recommended ? 0.5 : 0) -
        (hasCoords(p) ? 0 : 1.5) - // בלי מיקום מדויק אי אפשר לדעת אם הוא על הדרך – פחות עדיף
        nearest / 6 + // קרוב עדיף
        random() * 0.8; // קצת אקראיות, כדי לגוון
      if (!best || score > best.score) best = { p, score, cost };
    }
    if (!best) break;
    stops.push(best.p);
    used += best.cost;
  }
  const types = new Set(stops.map((x) => x.type)).size;
  return { stops, score: types * 2 + stops.length + Math.min(used / budget, 1) * 2 };
}

// מנסים כמה תחנות פתיחה שונות ובוחרים את ההרפתקה הטובה ביותר (מגוונת, מלאה וזורמת)
function pickStops({ ranked, start, budget, duration, level, origin, roundTrip, random }) {
  const pool = start ? [start, ...ranked] : ranked;
  const ctx = { pool, start, budget, duration, level, origin, roundTrip, random };
  if (start) return buildFrom(start, ctx).stops;
  const anchors = ranked.filter((p) => p.visitMinutes + roundTrip(p) <= budget).slice(0, 8);
  let best = null;
  for (const a of anchors) {
    const r = buildFrom(a, ctx);
    if (!best || r.score > best.score) best = r;
  }
  return best ? best.stops : [];
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
  DEPART = choice.departAt ? new Date(choice.departAt) : new Date();

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

  // בחירת התחנות בתוך הזמן שבחרו. כשיודעים מאיפה יוצאים, הנסיעה הלוך וחזור נכללת.
  // מהזמן שבחרו מורידים זמן להפסקות (אוכל, עצירות בדרך) בהרפתקה ארוכה
  const budget = DURATION_MINUTES[duration] - breakMinutes(DURATION_MINUTES[duration]);
  // הלוך: לפי הפקקים בשעת היציאה. חזור: לפי השעה המשוערת שבה חוזרים
  const roundTrip = (p, used = 0) => (origin ? legMinutes(origin, p, 0) + legMinutes(p, origin, used + p.visitMinutes + 30) : 0);
  const stops = pickStops({ ranked, start, budget, duration, level, origin, roundTrip, random });
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
  const fits = ordered.length > 0 && plan.totalMinutes <= limit + FIT_TOLERANCE;
  const fit = {
    fits,
    reason: ordered.length ? 'time' : 'empty',
    limitMinutes: limit,
    totalMinutes: plan.totalMinutes,
    suggestion: fits || choice.noSuggestion ? null : suggestAlternative(places, { region, duration, level, origin, placeId: start?.id, departAt: choice.departAt }, random),
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

// לוח הזמנים: נסיעה אל התחנה הראשונה, ביקורים ונסיעות ביניהן, וחזרה.
// כל קטע נסיעה מחושב לפי הפקקים הצפויים בשעה שבה עוברים בו, ובהרפתקה ארוכה נוסף זמן להפסקות.
function planFor(ordered, origin) {
  let clock = 0;
  const toStart = origin && ordered.length ? leg(origin, ordered[0], clock) : null;
  clock += toStart?.minutes || 0;
  const between = [];
  ordered.forEach((p, i) => {
    clock += p.visitMinutes;
    if (i < ordered.length - 1) {
      const l = leg(p, ordered[i + 1], clock);
      between.push(l);
      clock += l.minutes;
    }
  });
  const back = origin && ordered.length ? leg(ordered[ordered.length - 1], origin, clock) : null;
  const visitMinutes = ordered.reduce((n, p) => n + p.visitMinutes, 0);
  const betweenMinutes = between.reduce((n, l) => n + l.minutes, 0);
  const outsideMinutes = (toStart?.minutes || 0) + (back?.minutes || 0);
  const moving = visitMinutes + betweenMinutes + outsideMinutes;
  const breaks = breakMinutes(moving);
  const trafficMinutes = [toStart, ...between, back].filter(Boolean).reduce((n, l) => n + (l.trafficMinutes || 0), 0);
  return {
    origin,
    departAt: DEPART.toISOString(),
    toStart,
    between,
    back,
    visitMinutes,
    betweenMinutes,
    outsideMinutes,
    breakMinutes: breaks,
    trafficMinutes,
    totalMinutes: moving + breaks,
  };
}

function stopOut(p) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    difficulty: p.difficulty,
    image: p.image || '',
    gallery: p.gallery || [],
    radius: p.radius || null,
    description: p.description,
    visitMinutes: p.visitMinutes,
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
  DEPART = new Date();
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

export function buildCurated(places, curated, origin = null, departAt = null) {
  setCentroids(places);
  DEPART = departAt ? new Date(departAt) : new Date();
  const o = hasCoords(origin) ? origin : null;
  const stops = curated.stops.map((id) => places.find((p) => p.id === id)).filter(Boolean);
  const sum = curatedSummary(places, curated);
  DEPART = departAt ? new Date(departAt) : new Date();
  const plan = planFor(stops, o);
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
