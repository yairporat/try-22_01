// חיבור ל-Supabase דרך ה-REST שלו (בלי ספריות נוספות). רק בצד השרת.
// משתני סביבה: SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY.

export const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/(rest\/v1\/?)?$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
// כתובת תקינה נראית כך: https://abcd1234.supabase.co
const urlOk = /^https:\/\/[^\s/]+$/.test(SUPABASE_URL);
export const hasSupabase = !!(urlOk && SUPABASE_KEY);
// מה לא בסדר בהגדרות (להצגה למנהל, בלי לחשוף את הערכים)
export const supabaseProblem = !process.env.SUPABASE_URL
  ? 'חסר SUPABASE_URL'
  : !urlOk
    ? 'הערך של SUPABASE_URL לא תקין: צריך להיות הכתובת שמתחילה ב-https:// ונגמרת ב-supabase.co (לא המפתח)'
    : !SUPABASE_KEY
      ? 'חסר SUPABASE_SERVICE_ROLE_KEY'
      : '';

// הודעת שגיאה בלי כתובות או מפתחות
export const safeError = (e) => String(e?.message || e).replace(/https?:\/\/\S+|eyJ[\w.-]+|sb_secret_\w+/g, '…').slice(0, 300);

const headers = (extra = {}) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, ...extra });

// sb('GET', 'places', { query: '?select=*' })
export async function sb(method, table, { query = '', body, prefer = 'return=representation,resolution=merge-duplicates' } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: headers({ 'Content-Type': 'application/json', Prefer: prefer }),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// העלאת קובץ ל-Supabase Storage (דלי ציבורי "images"). מחזיר את הקישור הציבורי.
export async function uploadToStorage(path, bytes, contentType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/images/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': contentType, 'x-upsert': 'true', 'cache-control': '31536000' }),
    body: bytes,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Storage: ${res.status} ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/images/${path}`;
}
