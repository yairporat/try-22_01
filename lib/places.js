// טעינת המקומות בצד השרת: מ-Google Sheets אם הוגדר קישור, אחרת מהקובץ שבפרויקט.
// הקבצים נכללים בקוד עצמו, כדי שיעבדו גם בשרת (Vercel) ולא רק במחשב
import localPlaces from '../data/places.json';
import localCurated from '../data/adventures.json';
import { PLACES_SHEET_CSV_URL, SHEET_REFRESH_SECONDS } from './config.js';
import { parseCsv, rowsToPlaces, resolveShortLink, isUrl } from './sheet.js';
import { validatePlaces } from './adventure.js';

let cache = { at: 0, places: null };
const resolvedLinks = new Map(); // קישור מקוצר -> קואורדינטות

async function readLocal() {
  return structuredClone(localPlaces);
}

async function resolveCached(url) {
  if (!resolvedLinks.has(url)) resolvedLinks.set(url, await resolveShortLink(url));
  return resolvedLinks.get(url);
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
      .map(async (p) => Object.assign(p, await resolveCached(p.location))),
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

// הרפתקאות שבניתי (לשונית "הרפתקאות"): מהקובץ data/adventures.json
export async function loadCurated() {
  return structuredClone(localCurated || []);
}
