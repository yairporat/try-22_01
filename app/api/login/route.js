import { readFile } from 'fs/promises';
import { dataFile } from '../../../lib/storage';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// "כבר יש לי חשבון": מחפש את החשבון לפי האימייל ומחזיר את השם.
// עם Supabase – מטבלת profiles; אחרת – מרשימת ההרשמות המקומית.
export async function POST(request) {
  let email = '';
  try {
    email = String((await request.json()).email || '').trim().toLowerCase();
  } catch {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: 'כתבו כתובת אימייל תקינה' }, { status: 400 });
  }
  let found = null;
  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=name,email,points&email=eq.${encodeURIComponent(email)}&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) found = (await res.json())[0] || null;
    }
    if (!found) {
      const all = JSON.parse(await readFile(await dataFile('signups.json'), 'utf8'));
      found = all.find((e) => e.email === email) || null;
    }
  } catch {}
  if (!found) return Response.json({ error: 'לא מצאנו חשבון עם האימייל הזה' }, { status: 404 });
  return Response.json({ name: found.name, email: found.email });
}
