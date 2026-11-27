import { getRun, saveStopReview, updateRun } from '../../../../../lib/runs';

// הגעה לתחנה: ביקורת (דירוג והערות, אפשר לדלג) והתקדמות לתחנה הבאה
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const run = await getRun(id);
    if (!run) return Response.json({ error: 'ההרפתקה לא נמצאה' }, { status: 404 });
    const b = await request.json();
    const placeId = String(b.place_id || '');
    const index = run.stop_ids.indexOf(placeId);
    if (index < 0) return Response.json({ error: 'התחנה לא שייכת להרפתקה' }, { status: 400 });
    const rating = Number(b.rating);
    await saveStopReview({
      run_id: id,
      place_id: placeId,
      rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
      review: b.review ? String(b.review).slice(0, 1000) : null,
      verified_at: b.verified_at,
      verified_by: b.verified_by,
    });
    await updateRun(id, { current_index: Math.max(run.current_index, index + 1) });
    return Response.json({ ok: true });
  } catch (e) {
    console.error('⚠️ לא הצלחתי לשמור ביקורת:', e.message);
    return Response.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
}
