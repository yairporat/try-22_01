// כניסת מנהל: סיסמה אחת שמוגדרת במשתנה הסביבה ADMIN_PASSWORD (ב-Vercel: Settings > Environment Variables).
// אחרי כניסה נשמרת עוגייה מוצפנת למשך שנה. רק השרת יודע לבדוק אותה.

import { createHmac, timingSafeEqual } from 'crypto';

export const COOKIE = 'thv_admin';
const PASSWORD = process.env.ADMIN_PASSWORD || '';
export const adminEnabled = PASSWORD.length >= 4;

const token = () => createHmac('sha256', PASSWORD).update('thv-admin-v1').digest('hex');

const same = (a, b) => {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
};

export function checkPassword(password) {
  return adminEnabled && same(password, PASSWORD);
}

export function isAdmin(request) {
  if (!adminEnabled) return false;
  const value = request.cookies.get(COOKIE)?.value;
  return !!value && same(value, token());
}

export function adminCookie() {
  return `${COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

// בתחילת כל נתיב מנהל: const denied = requireAdmin(request); if (denied) return denied;
export function requireAdmin(request) {
  if (isAdmin(request)) return null;
  return Response.json({ error: 'צריך להיכנס כמנהל' }, { status: 401 });
}
