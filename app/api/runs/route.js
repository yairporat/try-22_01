import { createRun } from '../../../lib/runs';

// התחלת הרפתקה: נוצרת שורה ב-adventure_runs
export async function POST(request) {
  try {
    const b = await request.json();
    const stopIds = Array.isArray(b.stop_ids) ? b.stop_ids.map(String).slice(0, 10) : [];
    if (!b.adventure_title || !stopIds.length) return Response.json({ error: 'חסרים פרטי הרפתקה' }, { status: 400 });
    const run = await createRun({
      adventure_title: String(b.adventure_title).slice(0, 120),
      adventure_ref: b.adventure_ref ? String(b.adventure_ref).slice(0, 80) : null,
      stop_ids: stopIds,
      user_name: b.user_name ? String(b.user_name).slice(0, 60) : null,
      user_email: b.user_email ? String(b.user_email).slice(0, 120) : null,
    });
    return Response.json({ id: run.id });
  } catch (e) {
    console.error('⚠️ לא הצלחתי ליצור הרפתקה:', e.message);
    return Response.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
}
