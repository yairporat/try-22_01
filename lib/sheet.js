// המרה של שורות מהטבלה (אקסל או Google Sheets) לרשימת מקומות.
// משמש גם את סקריפט הייבוא מהאקסל וגם את הקריאה מ-Google Sheets.

// כותרת העמודה בטבלה -> שם השדה
export const COLUMNS = {
  'שם המקום': 'name',
  'אזור': 'region',
  'סוג': 'type',
  'רמת קושי': 'difficulty',
  'זמן ביקור (דקות)': 'visitMinutes',
  'תיאור': 'description',
  'שעות פתיחה': 'hours',
  'חשוב לדעת': 'tips',
  'חניה': 'parking',
  'ציוד מומלץ': 'equipment',
  'מיקום בגוגל מפס': 'location',
  'תמונה': 'image',
  'מומלץ': 'recommended',
  'מזהה': 'id',
};
const OPTIONAL = ['description', 'hours', 'tips', 'parking', 'equipment', 'image', 'recommended', 'id'];

const text = (v) => (v == null ? '' : String(v).trim());
const num = (v) => {
  const s = text(v).replace(',', '.');
  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? n : undefined;
};

// מוציא קואורדינטות מקישור של Google Maps (או מטקסט כמו "32.9, 35.7")
export function parseLatLng(value) {
  const s = decodeURIComponent(text(value));
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // המיקום המדויק של הנעץ
    /[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // מרכז המפה
    /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

// קישור שיתוף מקוצר (maps.app.goo.gl) לא מכיל קואורדינטות, אז עוקבים אחרי ההפניה שלו.
// מחזיר { lat, lng } או null (למשל כשאין אינטרנט).
export async function resolveShortLink(url) {
  let current = url;
  try {
    for (let i = 0; i < 5; i++) {
      const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      const next = res.headers.get('location');
      if (!next) break;
      current = new URL(next, current).toString();
      const coords = parseLatLng(current);
      if (coords) return coords;
    }
  } catch {}
  return null;
}

export const isUrl = (s) => /^https?:\/\//i.test(text(s));

// קישור ניווט: אם בתא יש קישור – משתמשים בו. אם יש שם/כתובת – מחפשים אותם בגוגל מפס.
export function mapsLinkFor(place) {
  if (isUrl(place.location)) return place.location;
  const query = place.location || place.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// rows: מערך של שורות, השורה הראשונה היא הכותרות
export function rowsToPlaces(rows) {
  const colOf = {};
  (rows[0] || []).forEach((h, i) => {
    const key = COLUMNS[text(h)];
    if (key) colOf[key] = i;
  });
  const missing = Object.entries(COLUMNS)
    .filter(([, k]) => colOf[k] === undefined && !OPTIONAL.includes(k))
    .map(([h]) => h);
  if (missing.length) {
    return { error: `חסרות עמודות בטבלה: ${missing.join(', ')}. אל תשנו את שורת הכותרות.` };
  }

  const places = [];
  const rowNumbers = [];
  rows.slice(1).forEach((row, idx) => {
    const r = idx + 2; // מספר השורה כמו שרואים בטבלה
    const get = (k) => (colOf[k] === undefined ? '' : row[colOf[k]]);
    if (!Object.keys(colOf).some((k) => text(get(k)) !== '')) return; // שורה ריקה

    const image = text(get('image'));
    const location = text(get('location'));
    const place = {
      id: text(get('id')) || `place-${r}`,
      name: text(get('name')),
      region: text(get('region')),
      type: text(get('type')),
      difficulty: text(get('difficulty')),
      visitMinutes: num(get('visitMinutes')),
      description: text(get('description')),
      hours: text(get('hours')),
      tips: text(get('tips')),
      parking: text(get('parking')),
      equipment: text(get('equipment')),
      location,
      image: !image ? '' : isUrl(image) || image.startsWith('/') ? image : `/places/${image}`,
    };
    const coords = parseLatLng(location);
    if (coords) Object.assign(place, coords);
    if (text(get('recommended')) === 'כן') place.recommended = true;
    places.push(place);
    rowNumbers.push(r);
  });
  return { places, rowNumbers };
}

// קורא קובץ CSV (כמו ש-Google Sheets מפרסם) לשורות
export function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const s = csv.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---- לשונית "הרפתקאות": הרפתקאות שבונים בעצמנו ----
export const CURATED_COLUMNS = {
  'שם ההרפתקה': 'name',
  'תיאור': 'description',
  'תחנה 1': 's1',
  'תחנה 2': 's2',
  'תחנה 3': 's3',
  'תחנה 4': 's4',
  'תחנה 5': 's5',
  'תמונה': 'image',
  'להציג בדף הראשי': 'show',
  'מזהה': 'id',
};

// rows: השורה הראשונה היא הכותרות. התחנות נכתבות בשם המקום, כמו בגיליון "מקומות".
export function rowsToCurated(rows, places) {
  const colOf = {};
  (rows[0] || []).forEach((h, i) => {
    const key = CURATED_COLUMNS[text(h)];
    if (key) colOf[key] = i;
  });
  if (colOf.name === undefined || colOf.s1 === undefined) {
    return { error: 'בלשונית "הרפתקאות" חסרות העמודות "שם ההרפתקה" ו"תחנה 1". אל תשנו את שורת הכותרות.' };
  }
  const byName = new Map(places.map((p) => [p.name.trim(), p.id]));
  const list = [];
  const rowNumbers = [];
  rows.slice(1).forEach((row, idx) => {
    const r = idx + 2;
    const get = (k) => (colOf[k] === undefined ? '' : text(row[colOf[k]]));
    if (!Object.keys(colOf).some((k) => get(k) !== '')) return; // שורה ריקה
    const names = ['s1', 's2', 's3', 's4', 's5'].map(get).filter(Boolean);
    const image = get('image');
    list.push({
      id: get('id') || `adventure-${r}`,
      name: get('name'),
      description: get('description'),
      image: !image ? '' : isUrl(image) || image.startsWith('/') ? image : `/places/${image}`,
      show: get('show') !== 'לא',
      stops: names.map((n) => byName.get(n)).filter(Boolean),
      missing: names.filter((n) => !byName.has(n)),
    });
    rowNumbers.push(r);
  });
  return { list, rowNumbers };
}
