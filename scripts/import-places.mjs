// ממיר את data/places.xlsx לקובץ data/places.json שהאפליקציה קוראת.
// רץ אוטומטית לפני npm run dev ו-npm run build. אפשר גם ידנית: npm run import-places
import { writeFileSync, existsSync } from 'fs';
import readXlsxFile, { readSheetNames } from 'read-excel-file/node';
import { fileURLToPath } from 'url';
import { validatePlaces } from '../lib/adventure.js';

const XLSX = new URL('../data/places.xlsx', import.meta.url);
const JSON_OUT = new URL('../data/places.json', import.meta.url);

// כותרת העמודה בגיליון -> שם השדה בקובץ
const COLUMNS = {
  'שם המקום': 'name',
  'אזור': 'region',
  'סוג': 'type',
  'רמת קושי': 'difficulty',
  'זמן ביקור (דקות)': 'visitMinutes',
  'תיאור': 'description',
  'קו רוחב (lat)': 'lat',
  'קו אורך (lng)': 'lng',
  'תמונה': 'image',
  'מומלץ': 'recommended',
  'מזהה': 'id',
};

function cellValue(v) {
  if (v == null) return '';
  return v;
}
const text = (v) => String(cellValue(v)).trim();
const num = (v) => {
  const n = Number(String(cellValue(v)).replace(',', '.').trim());
  return Number.isFinite(n) && String(cellValue(v)).trim() !== '' ? n : NaN;
};

if (!existsSync(XLSX)) {
  console.error('❌ לא נמצא הקובץ data/places.xlsx');
  process.exit(1);
}

const file = fileURLToPath(XLSX);
const sheets = await readSheetNames(file);
const rows = await readXlsxFile(file, { sheet: sheets.includes('מקומות') ? 'מקומות' : sheets[0] });

const colOf = {};
(rows[0] || []).forEach((h, i) => {
  const key = COLUMNS[text(h)];
  if (key) colOf[key] = i;
});
const missing = Object.entries(COLUMNS).filter(([, k]) => colOf[k] === undefined && !['image', 'recommended', 'id', 'description'].includes(k));
if (missing.length) {
  console.error(`❌ חסרות עמודות בגיליון: ${missing.map(([h]) => h).join(', ')}. אל תשנו את שורת הכותרות.`);
  process.exit(1);
}

const places = [];
const rowNumbers = [];
rows.slice(1).forEach((row, idx) => {
  const r = idx + 2; // מספר השורה כמו שרואים באקסל
  const get = (k) => (colOf[k] === undefined ? '' : row[colOf[k]]);
  const anything = Object.keys(colOf).some((k) => text(get(k)) !== '');
  if (!anything) return; // שורה ריקה
  const image = text(get('image'));
  const place = {
    id: text(get('id')) || `place-${r}`,
    name: text(get('name')),
    region: text(get('region')),
    type: text(get('type')),
    difficulty: text(get('difficulty')),
    visitMinutes: num(get('visitMinutes')),
    description: text(get('description')),
    lat: num(get('lat')),
    lng: num(get('lng')),
    image: image ? (image.startsWith('/') ? image : `/places/${image}`) : '',
  };
  if (text(get('recommended')) === 'כן') place.recommended = true;
  for (const k of ['lat', 'lng', 'visitMinutes']) if (Number.isNaN(place[k])) place[k] = undefined;
  places.push(place);
  rowNumbers.push(r);
});

const errors = validatePlaces(places, (i) => `שורה ${rowNumbers[i]}`);
if (errors.length) {
  console.error(`❌ נמצאו ${errors.length} טעויות בקובץ data/places.xlsx:`);
  errors.forEach((e) => console.error('   - ' + e));
  console.error('\nתקנו את השורות האלה בגיליון ושמרו את הקובץ. האפליקציה ממשיכה להשתמש ברשימה הקודמת.');
  process.exit(1);
}

writeFileSync(JSON_OUT, JSON.stringify(places, null, 2) + '\n');
console.log(`✅ נטענו ${places.length} מקומות מ-data/places.xlsx`);
