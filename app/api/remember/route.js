// "לזכור אותי": אחרי הרשמה או התחברות נשמרת עוגייה לשנה עם השם והאימייל.
// כך, גם אם הדפדפן מחק את הנתונים במכשיר (ספארי מוחק אחרי כמה ימים בלי שימוש), מי שכבר נרשם
// נכנס ישר למסך הבית ולא צריך להירשם שוב.

const COOKIE = 'thv_user';
const YEAR = 60 * 60 * 24 * 365;
const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const raw = request.cookies.get(COOKIE)?.value;
  if (!raw) return Response.json({ user: null });
  try {
    const u = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!u.name || !u.email) throw new Error('bad');
    // מאריכים לעוד שנה בכל כניסה
    return Response.json({ user: { name: u.name, email: u.email } }, { headers: { 'Set-Cookie': `${COOKIE}=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${YEAR}${secure}` } });
  } catch {
    return Response.json({ user: null });
  }
}

export async function POST(request) {
  let b = {};
  try {
    b = await request.json();
  } catch {}
  const name = String(b.name || '').trim().slice(0, 60);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: 'שם או אימייל לא תקינים' }, { status: 400 });
  const value = Buffer.from(JSON.stringify({ name, email }), 'utf8').toString('base64url');
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${YEAR}${secure}` } });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` } });
}
