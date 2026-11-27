import { requireAdmin } from '../../../../lib/admin';
import { saveText } from '../../../../lib/content';
import { TEXT_KEYS } from '../../../../lib/texts';

// שינוי טקסט באתר: { key, value }. value ריק = חזרה לטקסט המקורי
export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  let b;
  try {
    b = await request.json();
  } catch {
    return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const key = String(b.key || '');
  if (!TEXT_KEYS.has(key)) return Response.json({ error: 'טקסט לא מוכר' }, { status: 400 });
  try {
    await saveText(key, String(b.value ?? '').slice(0, 2000));
    return Response.json({ ok: true });
  } catch (e) {
    console.error('⚠️ שמירת טקסט נכשלה:', e.message);
    return Response.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
}
