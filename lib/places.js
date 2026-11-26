// טעינת המקומות בצד השרת: מ-Google Sheets אם הוגדר קישור, אחרת מהקובץ שבפרויקט.
import { readFile } from 'fs/promises';
import path from 'path';
import { PLACES_SHEET_CSV_URL, SHEET_REFRESH_SECONDS } from './config.js';
import { parseCsv, rowsToPlaces, parseLatLng, isUrl } from './sheet.js';
import { validatePlaces } from './adventure.js';

let cache = { at: 0, places: null };
const resolvedLinks = new Map(); // קישור מקוצר -> קואורדינטות

async function readLocal() {
  const text = await readFile(path.join(process.cwd(), 'data', 'places.json'), 'utf8');
  return JSON.parse(text);
}

// קישור שיתוף מקוצר (maps.app.goo.gl) לא מכיל קואורדינטות, אז עוקבים אחרי ההפניה שלו
async function resolveShortLink(url) {
  if (resolvedLinks.has(url)) return resolvedLinks.get(url);
  let current = url;
  let coords = null;
  try {
    for (let i = 0; i < 4 && !coords; i++) {
      const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(4000) });
      const next = res.headers.get('location');
      if (!next) break;
      current = new URL(next, current).toString();
      coords = parseLatLng(current);
    }
  } catch {
    // אין חיבור – המקום יופיע בלי סידור לפי מרחק, והניווט עדיין יעבוד
  }
  resolvedLinks.set(url, coords);
  return coords;
}

async function readSheet() {
  const res = await fetch(PLACES_SHEET_CSV_URL, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Google Sheets החזיר שגיאה ${res.status}`);
  const result = rowsToPlaces(parseCsv(await res.text()));
  if (result.error) throw new Error(result.error);
  const errors = validatePlaces(result.places, (i) => `שורה ${result.rowNumbers[i]}`);
  if (errors.length) throw new Error(`יש טעויות בטבלה:\n${errors.join('\n')}`);
  await Promise.all(
    result.places
      .filter((p) => p.lat === undefined && isUrl(p.location))
      .map(async (p) => Object.assign(p, await resolveShortLink(p.location))),
  );
  return result.places;
}

export async function loadPlaces() {
  if (!PLACES_SHEET_CSV_URL) return readLocal();
  if (cache.places && Date.now() - cache.at < SHEET_REFRESH_SECONDS * 1000) return cache.places;
  try {
    cache = { at: Date.now(), places: await readSheet() };
    return cache.places;
  } catch (e) {
    // אם הטבלה לא זמינה או שיש בה טעות – ממשיכים עם הרשימה האחרונה שעבדה
    console.error(`⚠️ לא הצלחתי לטעון את טבלת המקומות מ-Google Sheets: ${e.message}`);
    if (cache.places) return cache.places;
    return readLocal();
  }
}
