import { mapsLinkFor } from './sheet.js';
import { estimateDrive, hasCoords } from './travel.js';
import { withTraffic, breakMinutes, trafficFactor } from './traffic.js';

// לוגיקת ההתאמה: מקבלת את רשימת המקומות ואת הבחירות של המשתמש,
// ומחזירה הרפתקה (רשימת תחנות מסודרת).

export const REGIONS = ['גולן', 'גליל עליון', 'גליל תחתון', 'מרכז', 'שפלה', 'מדבר יהודה', 'נגב'];
export const DURATIONS = ['שעתיים', 'חצי יום', 'יום שלם'];
export const LEVELS = ['קל', 'בינוני', 'מאתגר'];
export const TYPES = ['מעיין', 'תצפית', 'מסלול', 'היסטוריה'];

// סגנון ההרפתקה (במקום רמת קושי):
// ברגוע – רק מקומות קלים. קצת מזיעים – קלים, בינוניים או שילוב. באים לעבוד – לפחות תחנה מאתגרת אחת, עם קלות או בינוניות.
export const STYLES = ['ברגוע', 'קצת מזיעים', 'באים לעבוד'];
const STYLE_LEVELS = { 'ברגוע': ['קל'], 'קצת מזיעים': ['קל', 'בינוני'], 'באים לעבוד': ['קל', 'בינוני', 'מאתגר'] };
// קישורים ישנים עם רמת קושי
const LEVEL_TO_STYLE = { 'קל': 'ברגוע', 'בינוני': 'קצת מזיעים', 'מאתגר': 'באים לעבוד' };
export const styleFrom = (style, level) => (STYLES.includes(style) ? style : LEVEL_TO_STYLE[level] || null);

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

// חלופה כשההרפתקה לא נכנסת בזמן או שאין מקומות מתאימים. תמיד מחזירה משהו, לפי הסדר:
// 1. אותו אזור בסגנון קל יותר (באים לעבוד → קצת מזיעים → ברגוע)
// 2. האזורים הקרובים באותו סגנון, ואז בסגנון קל יותר
// 3. משך ארוך יותר (קודם באותו אזור)
// 4. המקום הקרוב ביותר שאפשר
// בכל שלב בונים כמה אפשרויות ובוחרים אחת באקראי, כדי שלא תוצע כל פעם אותה הרפתקה.
// avoid: התחנות של ההרפתקה הנוכחית – לא להציע את אותו שילוב.
function suggestAlternative(places, { region, duration, style, origin, placeId, departAt, exclude, avoid = [] }, random) {
  const avoidKey = [...avoid].sort().join('+');
  const easier = STYLES.slice(0, Math.max(0, STYLES.indexOf(style))).reverse();
  let regions = REGIONS.filter((r) => r !== region && places.some((p) => p.region === r));
  if (origin) {
    const d = (r) => Math.min(...places.filter((p) => p.region === r && hasCoords(p)).map((p) => distanceKm(origin, p)));
    regions = regions.sort((a, b) => d(a) - d(b));
  }
  const near = regions.slice(0, 3);
  const longer = DURATIONS.slice(DURATIONS.indexOf(duration) + 1);
  const tiers = [
    easier.slice(0, 1).map((st) => ({ kind: 'style', region, duration, style: st })), // סגנון אחד קל יותר באותו אזור
    near.map((r) => ({ kind: 'region', region: r, duration, style })),
    easier.slice(1).map((st) => ({ kind: 'style', region, duration, style: st })),
    near.flatMap((r) => easier.map((st) => ({ kind: 'region', region: r, duration, style: st }))),
    longer.flatMap((d) => [{ kind: 'duration', region, duration: d, style }, ...easier.map((st) => ({ kind: 'duration', region, duration: d, style: st }))]),
    longer.flatMap((d) => near.map((r) => ({ kind: 'both', region: r, duration: d, style }))),
    regions.slice(3).map((r) => ({ kind: 'region', region: r, duration, style: easier[easier.length - 1] || style })),
  ];
  for (const tier of tiers) {
    const found = [];
    for (const c of tier) {
      for (let k = 0; k < 2 && found.length < 4; k++) {
        const a = findAdventure(places, { mode: 'custom', origin, departAt, exclude, ...c, noSuggestion: true }, random);
        if (!a.stops.length || !a.fit.fits) break;
        const key = a.stops.map((x) => x.id).sort().join('+');
        if (key === avoidKey || found.some((f) => f.key === key)) continue;
        found.push({ c, a, key });
      }
      if (found.length >= 4) break;
    }
    if (found.length) {
      const { c, a } = found[Math.floor(random() * found.length)];
      return { kind: c.kind, region: c.region, duration: c.duration, style: c.style, level: c.style, title: a.title, totalMinutes: a.plan.totalMinutes, stops: a.stops.length, stopIds: a.stops.map((x) => x.id), names: a.stops.map((x) => x.name) };
    }
  }
  // אין שום הרפתקה שנכנסת בזמן: המקום הקרוב ביותר (מבין שלושת הקרובים – באקראי)
  const pool = places.filter((p) => !(exclude || []).includes(p.id));
  const dist = (p) => (origin && hasCoords(p) ? distanceKm(origin, p) : p.visitMinutes);
  const closest = [...(pool.length ? pool : places)].sort((a, b) => dist(a) - dist(b)).slice(0, 3);
  if (!closest.length) return null;
  const p = closest[Math.floor(random() * closest.length)];
  return { kind: 'nearest', region: p.region, duration: 'יום שלם', style: LEVEL_TO_STYLE[p.difficulty], level: LEVEL_TO_STYLE[p.difficulty], title: p.name, stops: 1, stopIds: [p.id], names: [p.name] };
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
const SPAN_KM = { 'שעתיים': 8, 'חצי יום': 14, 'יום שלם': 20 };
const HOP_KM = { 'שעתיים': 6, 'חצי יום': 10, 'יום שלם': 15 };
// תחנה "על הדרך" מנקודת היציאה לתחנה הראשונה: עיקוף של עד כמה ק"מ
const DETOUR_KM = 6;

// בונה הרפתקה מתחנה ראשונה אחת: מוסיפים כל פעם את התחנה הטובה ביותר שעוד נכנסת בזמן –
// סוג שעוד אין (מעיין, תצפית, מסלול...), קרובה לתחנות שכבר נבחרו או על הדרך, ובלי שתי תחנות כבדות.
function buildFrom(anchor, { pool, budget, duration, style, region, origin, roundTrip, random, target = MAX_STOPS, pickRandom = false }) {
  const stops = [anchor];
  let used = anchor.visitMinutes + roundTrip(anchor);
  const A = where(anchor);
  const base = origin && A ? distanceKm(origin, A) : null;
  const typeCount = (t) => stops.filter((x) => x.type === t).length;

  for (;;) {
    if (stops.length >= Math.min(MAX_STOPS, target)) break;
    let best = null;
    const options = [];
    for (const p of pool) {
      if (stops.includes(p)) continue;
      if (isHeavy(p) && stops.some(isHeavy)) continue; // לא שני מסלולים ארוכים/מאתגרים
      if (typeCount(p.type) >= 2) continue; // לא שלוש תחנות מאותו סוג
      const P = where(p);
      const nearest = Math.min(...stops.map((q) => distanceKm(where(q), P)));
      const fromAnchor = A && P ? distanceKm(A, P) : 0;
      // זרימה: קרוב לתחנות שכבר נבחרו ובתוך האזור של ההרפתקה, או על הדרך מנקודת היציאה
      const onTheWay = base !== null && P && hasCoords(p) ? distanceKm(origin, P) + distanceKm(P, A) - base <= DETOUR_KM : false;
      // מחוץ לאזור שנבחר – רק אם המקום על הדרך מנקודת היציאה
      if (p.region !== region && !onTheWay) continue;
      if (!onTheWay && (nearest > HOP_KM[duration] || fromAnchor > SPAN_KM[duration])) continue;
      const travel = Math.min(...stops.map((q) => legMinutes(q, p, used)));
      const cost = p.visitMinutes + travel;
      if (used + cost > budget) continue;
      const score =
        (typeCount(p.type) ? -2 : 3) + // גיוון: סוג חדש עדיף
        (style === 'קצת מזיעים' && p.difficulty === 'בינוני' && !stops.some((x) => x.difficulty === 'בינוני') ? 1 : 0) + // שילוב קל ובינוני
        (p.region === region ? 1 : 0) + // עדיף בתוך האזור
        (p.recommended ? 0.5 : 0) -
        (hasCoords(p) ? 0 : 1.5) - // בלי מיקום מדויק אי אפשר לדעת אם הוא על הדרך – פחות עדיף
        nearest / 6 + // קרוב עדיף
        random() * 0.8; // קצת אקראיות, כדי לגוון
      options.push({ p, score, cost });
      if (!best || score > best.score) best = { p, score, cost };
    }
    if (!best) break;
    // ב"הפתע אותי": בחירה אקראית משוקללת מבין האפשרויות הטובות, ולא תמיד הטובה ביותר
    if (pickRandom) best = weightedPick(options.sort((a, b) => b.score - a.score).slice(0, 5), random);
    stops.push(best.p);
    used += best.cost;
  }
  const types = new Set(stops.map((x) => x.type)).size;
  return { stops, score: types * 2 + stops.length + Math.min(used / budget, 1) * 2 };
}

// בחירה אקראית לפי משקל (ציון גבוה = סיכוי גבוה יותר)
function weightedPick(options, random) {
  if (!options.length) return null;
  const min = Math.min(...options.map((o) => o.score));
  const w = options.map((o) => o.score - min + 1);
  let r = random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) {
    r -= w[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

// מנסים כמה תחנות פתיחה שונות ובוחרים את ההרפתקה הטובה ביותר (מגוונת, מלאה וזורמת)
function pickStops({ ranked, anchorPool, extra = [], start, budget, duration, style, region, origin, roundTrip, random }) {
  const pool = [...(start ? [start] : []), ...ranked, ...extra];
  const ctx = { pool, budget, duration, style, region, origin, roundTrip, random };
  if (start) return buildFrom(start, ctx).stops;
  const anchors = (anchorPool || ranked).filter((p) => p.visitMinutes + roundTrip(p) <= budget).slice(0, 8);
  let best = null;
  for (const a of anchors) {
    const r = buildFrom(a, ctx);
    if (!best || r.score > best.score) best = r;
  }
  return best ? best.stops : [];
}

// אם אחרי סידור המסלול ההרפתקה יוצאת ארוכה מהזמן שבחרו – מורידים תחנות מהסוף (התחנה הראשית נשארת)
function trimToFit(stops, origin, limit) {
  const s = [...stops];
  while (s.length > 1 && planFor(orderByRoute(s, origin), origin).totalMinutes > limit + FIT_TOLERANCE) s.pop();
  return s;
}

/**
 * בונה הרפתקה.
 * choice: { mode: 'surprise' | 'custom', region, duration, level, placeId }
 * placeId: כשבוחרים הרפתקה מומלצת – ההרפתקה תיבנה סביב המקום הזה.
 * origin: { lat, lng, label } – מאיפה יוצאים (המיקום שלי או עיר). לפיו מחושבות הנסיעות הלוך וחזור.
 */
export function findAdventure(places, choice = {}, random = Math.random) {
  let { region, duration, placeId } = choice;
  let style = styleFrom(choice.style, choice.level);
  const origin = hasCoords(choice.origin) ? choice.origin : null;
  setCentroids(places);
  DEPART = choice.departAt ? new Date(choice.departAt) : new Date();

  const start = placeId ? places.find((p) => p.id === placeId) : null;
  if (start) {
    region = start.region;
    style = style || LEVEL_TO_STYLE[start.difficulty];
  }

  // "הפתע אותי" (בלי מקום מסוים): בחירה אקראית ומגוונת שלא חוזרת על עצמה
  if (choice.mode === 'surprise' && !start) {
    const s = surprise(places, { ...choice, duration: DURATIONS.includes(duration) ? duration : 'חצי יום', origin }, random);
    if (s) return s;
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
  style = style || (choice.mode === 'surprise' ? 'קצת מזיעים' : 'ברגוע');
  const level = { 'ברגוע': 'קל', 'קצת מזיעים': 'בינוני', 'באים לעבוד': 'מאתגר' }[style];

  // מקומות באזור ברמות שהסגנון מאפשר
  const allowed = STYLE_LEVELS[style];
  const exclude = new Set(choice.exclude || []); // "רק מקומות שעוד לא ביקרתי בהם"
  const inRegion = places.filter((p) => p.region === region && allowed.includes(p.difficulty) && p.id !== start?.id);
  // אם אחרי הסינון לא נשארו מספיק מקומות חדשים – משתמשים גם במוכרים
  const fresh = inRegion.filter((p) => !exclude.has(p.id));
  const candidates = fresh.length >= 2 || !exclude.size ? fresh : inRegion;
  // מקומות מחוץ לאזור – רק כתחנה "על הדרך" מנקודת היציאה
  const extra = origin ? places.filter((p) => p.region !== region && allowed.includes(p.difficulty) && !exclude.has(p.id) && hasCoords(p)) : [];

  const ranked = shuffle(candidates, random);
  // "באים לעבוד": ההרפתקה נבנית סביב תחנה מאתגרת אחת (ואיתה קלות או בינוניות)
  const anchorPool = style === 'באים לעבוד' ? ranked.filter((p) => p.difficulty === 'מאתגר') : ranked;

  // בחירת התחנות בתוך הזמן שבחרו. כשיודעים מאיפה יוצאים, הנסיעה הלוך וחזור נכללת.
  // מהזמן שבחרו מורידים זמן להפסקות (אוכל, עצירות בדרך) בהרפתקה ארוכה
  const budget = DURATION_MINUTES[duration] - breakMinutes(DURATION_MINUTES[duration]);
  // הלוך: לפי הפקקים בשעת היציאה. חזור: לפי השעה המשוערת שבה חוזרים
  const roundTrip = (p, used = 0) => (origin ? legMinutes(origin, p, 0) + legMinutes(p, origin, used + p.visitMinutes + 30) : 0);
  const stops = pickStops({ ranked, anchorPool, extra, start, budget, duration, style, region, origin, roundTrip, random });
  // אם שום מקום לא נכנס בזמן, לוקחים לפחות את זה שלוקח הכי פחות זמן
  if (!stops.length && anchorPool.length) {
    const cost = (p) => p.visitMinutes + roundTrip(p);
    const cheapest = [...anchorPool].sort((a, b) => cost(a) - cost(b)).slice(0, 3);
    stops.push(cheapest[Math.floor(random() * cheapest.length)]); // לא תמיד אותו מקום
  }

  const kept = trimToFit(stops, origin, DURATION_MINUTES[duration]);
  const ordered = start ? [start, ...orderByRoute(kept.slice(1))] : orderByRoute(kept, origin);

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
    suggestion: fits || choice.noSuggestion ? null : suggestAlternative(places, { region, duration, style, origin, placeId: start?.id, departAt: choice.departAt, exclude: choice.exclude, avoid: ordered.map((p) => p.id) }, random),
  };

  return {
    title,
    fit,
    usedVisited: exclude.size > 0 && candidates === inRegion && inRegion.some((p) => exclude.has(p.id)),
    region,
    duration,
    style,
    difficulty: style,
    // זמן באזור ההרפתקה: ביקורים ונסיעות בין התחנות
    totalMinutes: visitMinutes + betweenMinutes,
    plan,
    stops: ordered.map((p) => stopOut(p, region)),
  };
}

// ---- "הפתע אותי" ----
// כל לחיצה: אזור אקראי (לא אחד מהאזורים של ההפתעות האחרונות), תחנה ראשית אקראית מבין המקומות
// הטובים באזור (לא אחת מהאחרונות), ועוד 0–2 תחנות קרובות או על הדרך לפי כללי האיזון.
// recent: { regions: [...], anchors: [...], combos: ['a+b+c', ...] } – מההיסטוריה במכשיר.
function surprise(places, choice, random) {
  const { duration, origin } = choice;
  const exclude = new Set(choice.exclude || []);
  const recentRegions = new Set(choice.recentRegions || []);
  const recentAnchors = new Set(choice.recentAnchors || []);
  const recentCombos = new Set(choice.recentCombos || []);
  const budget = DURATION_MINUTES[duration] - breakMinutes(DURATION_MINUTES[duration]);
  const roundTrip = (p, used = 0) => (origin ? legMinutes(origin, p, 0) + legMinutes(p, origin, used + p.visitMinutes + 30) : 0);
  const fresh = (p) => !exclude.has(p.id);

  // אזורים שיש בהם מקום שנכנס בזמן (כולל הנסיעה). אם אין כזה (למשל שעתיים רחוק מהכל) –
  // שני האזורים הקרובים, והחלון "לא נמצאה הרפתקה מתאימה" יציע מה לעשות
  let fitsTime = (p) => p.visitMinutes + roundTrip(p) <= budget;
  let reachable = REGIONS.filter((r) => places.some((p) => p.region === r && fresh(p) && fitsTime(p)));
  if (!reachable.length) {
    const withPlaces = REGIONS.filter((r) => places.some((p) => p.region === r && fresh(p)));
    if (!withPlaces.length) return null;
    const near = (r) => (origin ? Math.min(...places.filter((p) => p.region === r && hasCoords(p)).map((p) => distanceKm(origin, p))) : 0);
    reachable = withPlaces.sort((a, b) => near(a) - near(b)).slice(0, 2);
    fitsTime = () => true;
  }
  // לא חוזרים לאזורים של ההפתעות האחרונות, אבל משאירים תמיד לפחות שתי אפשרויות (אחרת זה הופך לסבב קבוע)
  const recentList = (choice.recentRegions || []).filter((r) => reachable.includes(r)).slice(0, Math.max(0, reachable.length - 2));
  let regions = reachable.filter((r) => !recentList.includes(r));
  if (!regions.length) regions = reachable;

  // מנסים כמה פעמים עד שיוצא שילוב תחנות שלא היה לאחרונה
  for (let attempt = 0; attempt < 12; attempt++) {
    // אזור: אקראי, כשאזורים קרובים לנקודת היציאה מקבלים משקל גבוה יותר
    const regionOpts = regions.map((r) => {
      const near = origin ? Math.min(...places.filter((p) => p.region === r && hasCoords(p)).map((p) => distanceKm(origin, p))) : 0;
      return { r, score: origin ? Math.max(0, 2 - near / 60) : 1 }; // קרוב – קצת יותר סיכוי, אבל כל אזור אפשרי
    });
    const region = weightedPick(regionOpts, random).r;
    const inRegion = places.filter((p) => p.region === region && fresh(p));
    const scoreOf = (p) => 1 + (p.recommended ? 1 : 0) + (hasCoords(p) ? 0.5 : 0) + (p.image ? 0.3 : 0);
    // תחנה ראשית: מבין המקומות הטובים שנכנסים בזמן, בלי אלה ששימשו לאחרונה
    // כמה תחנות: 1–3 באקראי (בשעתיים 1–2), שונה מההפתעה הקודמת כשאפשר
    const opts = duration === 'שעתיים' ? [1, 2] : [1, 2, 3];
    const lastCount = choice.lastCount ? Number(choice.lastCount) : 0;
    const pickFrom = opts.length > 1 && lastCount ? opts.filter((n) => n !== lastCount) : opts;
    let target = pickFrom[Math.floor(random() * pickFrom.length)];
    // תחנה ראשית שמשאירה זמן לשאר התחנות (בערך שעה לכל תחנה נוספת)
    const roomFor = (p, n) => fitsTime(p) && p.visitMinutes + roundTrip(p) <= budget - 60 * (n - 1);
    let anchors = [];
    for (; target >= 1; target--) {
      anchors = inRegion.filter((p) => roomFor(p, target) && !recentAnchors.has(p.id));
      if (!anchors.length) anchors = inRegion.filter((p) => roomFor(p, target));
      if (anchors.length || target === 1) break;
    }
    if (!anchors.length) anchors = inRegion.filter(fitsTime);
    if (!anchors.length) {
      regions = regions.filter((r) => r !== region);
      if (!regions.length) return null;
      continue;
    }
    const top = anchors.map((p) => ({ p, score: scoreOf(p) + random() })).sort((a, b) => b.score - a.score).slice(0, 8);
    const anchor = weightedPick(top, random).p;
    // עוד 0–2 תחנות: בהרפתקה ארוכה יותר – בדרך כלל יותר תחנות (שעתיים: עד תחנה אחת נוספת)
    const extra = origin ? places.filter((p) => p.region !== region && fresh(p) && hasCoords(p)) : [];
    setCentroids(places);
    const built = buildFrom(anchor, {
      pool: [...shuffle(inRegion, random), ...extra],
      budget,
      duration,
      style: 'קצת מזיעים',
      region,
      origin,
      roundTrip,
      random,
      target,
      pickRandom: true,
    });
    const stops = trimToFit(built.stops, origin, DURATION_MINUTES[duration]);
    const combo = stops.map((p) => p.id).sort().join('+');
    if (recentCombos.has(combo) && attempt < 11) continue;

    const ordered = orderByRoute(stops, origin);
    const plan = planFor(ordered, origin);
    const types = [...new Set(ordered.map((p) => p.type))].map((t) => TYPE_WORDS[t]);
    const hardest = Math.max(...ordered.map((p) => LEVELS.indexOf(p.difficulty)));
    const style = STYLES[Math.max(0, hardest)];
    const limit = DURATION_MINUTES[duration];
    return {
      title: types.length ? `${types.slice(0, 2).join(' ו')} ב${region}` : `הרפתקה ב${region}`,
      fit: (() => {
        const fits = plan.totalMinutes <= limit + FIT_TOLERANCE;
        return {
          fits,
          reason: 'time',
          limitMinutes: limit,
          totalMinutes: plan.totalMinutes,
          suggestion: fits ? null : suggestAlternative(places, { region, duration, style: 'באים לעבוד', origin, departAt: choice.departAt, exclude: choice.exclude, avoid: stops.map((p) => p.id) }, random),
        };
      })(),
      surprise: { region, anchor: anchor.id, combo, count: stops.length },
      region,
      duration,
      style,
      difficulty: style,
      totalMinutes: plan.visitMinutes + plan.betweenMinutes,
      plan,
      stops: ordered.map((p) => stopOut(p, region)),
    };
  }
  return null;
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

// region: האזור שנבחר. תחנה מחוץ לו מסומנת "תחנה בדרך"
function stopOut(p, region = null) {
  return {
    onTheWay: !!(region && p.region !== region),
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

// ---- החלפת תחנה לפני היציאה ----
// מחליפים את התחנה במקום index במקום אחר שמתאים להרפתקה: אותו אזור (או אזורי התחנות האחרות),
// לא קשה יותר, קרוב לשאר התחנות, בלי שתי תחנות כבדות, ונכנס בערך באותו זמן.
// מחזיר את רשימת המזהים החדשה (לפי סדר המסלול), או null אם אין חלופה.
export function replaceStop(places, { stopIds, index, level, style, region = null, duration, origin = null, exclude = [], tried = [] }, random = Math.random) {
  setCentroids(places);
  const current = stopIds.map((id) => places.find((p) => p.id === id)).filter(Boolean);
  const out = current[index];
  if (!out) return null;
  const others = current.filter((_, i) => i !== index);
  const regions = new Set(region ? [region, ...current.map((p) => p.region)] : current.map((p) => p.region));
  const st = styleFrom(style, level);
  const maxLevel = st ? STYLE_LEVELS[st].length - 1 : Math.max(...current.map((p) => LEVELS.indexOf(p.difficulty)));
  // "באים לעבוד": אם מחליפים את התחנה המאתגרת – הבאה צריכה להיות מאתגרת גם היא
  const mustHard = st === 'באים לעבוד' && out.difficulty === 'מאתגר' && !others.some((x) => x.difficulty === 'מאתגר');
  const dur = DURATIONS.includes(duration) ? duration : 'יום שלם';
  const skip = new Set([...stopIds, ...tried]);
  const ex = new Set(exclude);
  const ref = others.length ? others : [out];
  const typeCount = (t) => others.filter((x) => x.type === t).length;

  const options = [];
  for (const p of places) {
    if (skip.has(p.id) || !regions.has(p.region) || LEVELS.indexOf(p.difficulty) > maxLevel) continue;
    if (mustHard && p.difficulty !== 'מאתגר') continue;
    if (isHeavy(p) && others.some(isHeavy)) continue;
    if (typeCount(p.type) >= 2) continue;
    const P = where(p);
    const nearest = Math.min(...ref.map((q) => distanceKm(where(q), P)));
    if (nearest > HOP_KM[dur] * 1.3) continue;
    // זמן דומה לתחנה שיוצאת (עד חצי שעה יותר)
    if (p.visitMinutes > out.visitMinutes + 30) continue;
    const score =
      (p.type !== out.type && !typeCount(p.type) ? 1.5 : 0) +
      (region && p.region === region ? 3 : 0) + // עדיף בתוך האזור שנבחר
      (ex.has(p.id) ? -3 : 0) +
      (hasCoords(p) ? 0 : -1.5) -
      nearest / 6 +
      random() * 1.5;
    options.push({ p, score });
  }
  if (!options.length) return null;
  options.sort((a, b) => b.score - a.score);
  const pick = options[0].p;
  const next = [...others.slice(0, index), pick, ...others.slice(index)];
  return orderByRoute(next, hasCoords(origin) ? origin : null).map((p) => p.id);
}
