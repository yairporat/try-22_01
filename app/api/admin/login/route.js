import { adminCookie, adminEnabled, checkPassword } from '../../../../lib/admin';

// כניסה כמנהל: { password }
export async function POST(request) {
  if (!adminEnabled) {
    return Response.json({ error: 'כניסת מנהל עוד לא הופעלה. צריך להגדיר ADMIN_PASSWORD ב-Vercel (ראו README).' }, { status: 503 });
  }
  let password = '';
  try {
    password = String((await request.json()).password || '');
  } catch {}
  // השהיה קטנה נגד ניחוש סיסמאות
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(password)) return Response.json({ error: 'הסיסמה לא נכונה' }, { status: 401 });
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': adminCookie() } });
}
