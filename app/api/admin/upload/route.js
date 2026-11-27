import { requireAdmin } from '../../../../lib/admin';
import { saveImage } from '../../../../lib/content';

// העלאת תמונה (טופס עם שדה file). מחזיר { url }
export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const file = (await request.formData()).get('file');
    if (!file || typeof file === 'string') return Response.json({ error: 'לא נבחרה תמונה' }, { status: 400 });
    return Response.json({ url: await saveImage(file) });
  } catch (e) {
    console.error('⚠️ העלאת תמונה נכשלה:', e.message);
    return Response.json({ error: e.message || 'ההעלאה נכשלה' }, { status: 500 });
  }
}
