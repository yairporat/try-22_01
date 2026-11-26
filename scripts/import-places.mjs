// ממיר את data/places.xlsx לקובץ data/places.json שהאפליקציה קוראת
// (כשלא מחוברת טבלת Google Sheets).
// רץ אוטומטית לפני npm run dev ו-npm run build. אפשר גם ידנית: npm run import-places
import { writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import readXlsxFile, { readSheetNames } from 'read-excel-file/node';
import { validatePlaces } from '../lib/adventure.js';
import { rowsToPlaces, resolveShortLink, isUrl } from '../lib/sheet.js';
import { PLACES_SHEET_CSV_URL } from '../lib/config.js';

const XLSX = fileURLToPath(new URL('../data/places.xlsx', import.meta.url));
const JSON_OUT = fileURLToPath(new URL('../data/places.json', import.meta.url));

if (PLACES_SHEET_CSV_URL) {
  console.log('ℹ️ האפליקציה מחוברת ל-Google Sheets, המקומות נטענים משם.');
}
if (!existsSync(XLSX)) {
  console.error('❌ לא נמצא הקובץ data/places.xlsx');
  process.exit(1);
}

const sheets = await readSheetNames(XLSX);
const rows = await readXlsxFile(XLSX, { sheet: sheets.includes('מקומות') ? 'מקומות' : sheets[0] });
const result = rowsToPlaces(rows);
if (result.error) {
  console.error('❌ ' + result.error);
  process.exit(1);
}

const errors = validatePlaces(result.places, (i) => `שורה ${result.rowNumbers[i]}`);
if (errors.length) {
  console.error(`❌ נמצאו ${errors.length} טעויות בקובץ data/places.xlsx:`);
  errors.forEach((e) => console.error('   - ' + e));
  console.error('\nתקנו את השורות האלה בגיליון ושמרו את הקובץ. האפליקציה ממשיכה להשתמש ברשימה הקודמת.');
  process.exit(1);
}

// מקומות עם קישור מקוצר מגוגל מפס: מוצאים את המיקום שלהם (צריך אינטרנט)
const unresolved = result.places.filter((p) => p.lat === undefined && isUrl(p.location));
for (const p of unresolved) {
  const coords = await resolveShortLink(p.location);
  if (coords) Object.assign(p, coords);
  else console.warn(`⚠️ לא הצלחתי לזהות את המיקום של "${p.name}" מהקישור. הניווט יעבוד, אבל המקום לא יופיע במפה.`);
}

writeFileSync(JSON_OUT, JSON.stringify(result.places, null, 2) + '\n');
console.log(`✅ נטענו ${result.places.length} מקומות מ-data/places.xlsx`);
