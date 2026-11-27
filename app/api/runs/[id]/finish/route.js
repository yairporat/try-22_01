import { getRun, getStopReviews, updateRun } from '../../../../../lib/runs';
import { loadPlaces } from '../../../../../lib/places';
import { sendOwnerEmail } from '../../../../../lib/email';

const REASONS = ['חסר לי זמן', 'הייתי צריך לחזור', 'לא מצאנו את המקומות', 'אחר'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const birds = (n) => (n ? `${'🐦'.repeat(n)} (${n}/5)` : 'לא דורג');

// סיום הרפתקה (רגיל או מוקדם): שמירת הדירוג הסופי ושליחת מייל סיכום אחד לבעלים
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const run = await getRun(id);
    if (!run) return Response.json({ error: 'ההרפתקה לא נמצאה' }, { status: 404 });
    // הרפתקה שכבר הסתיימה לא מתעדכנת שוב (והמייל לא נשלח פעמיים)
    if (run.finished_at) return Response.json({ ok: true, status: run.status, emailed: 'already' });
    const b = await request.json();
    const reviews = await getStopReviews(id);
    const done = new Set(reviews.map((r) => r.place_id));
    const complete = run.stop_ids.every((p) => done.has(p));
    const status = complete ? 'completed' : 'ended_early';
    let reason = null;
    if (!complete) {
      reason = REASONS.includes(b.early_end_reason) ? b.early_end_reason : 'אחר';
      if (reason === 'אחר' && b.early_end_other) reason = `אחר: ${String(b.early_end_other).slice(0, 300)}`;
    }
    const rating = Number(b.final_rating);
    const changes = {
      status,
      early_end_reason: reason,
      final_rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
      final_review: b.final_review ? String(b.final_review).slice(0, 2000) : null,
      points_awarded: complete ? Number(b.points) || 0 : 0,
      finished_at: run.finished_at || new Date().toISOString(),
    };
    await updateRun(id, changes);

    // מייל אחד בלבד, בסוף ההרפתקה
    if (run.summary_sent_at) return Response.json({ ok: true, status, emailed: 'already' });
    const places = await loadPlaces();
    const nameOf = (pid) => places.find((p) => p.id === pid)?.name || pid;
    const date = new Date(changes.finished_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const who = run.user_name ? `${run.user_name}${run.user_email ? ` (${run.user_email})` : ''}` : 'משתמש לא רשום';
    const stopRows = run.stop_ids.map((pid, i) => {
      const r = reviews.find((x) => x.place_id === pid);
      return `<tr><td>${i + 1}. ${esc(nameOf(pid))}</td><td>${r ? (r.verified_by === 'manual' ? '✓ אישור ידני' : '✓ אומת ב-GPS') : '✗ לא הגיע'}</td><td>${r ? birds(r.rating) : ''}</td><td>${esc(r?.review || '')}</td></tr>`;
    }).join('');
    const subject = `THV: ${status === 'completed' ? 'הרפתקה הושלמה' : 'הרפתקה הסתיימה מוקדם'} – ${run.adventure_title}`;
    const html = `<div dir="rtl" style="font-family:Arial,sans-serif;color:#14213D;line-height:1.5">
      <h2 style="margin:0 0 8px">${esc(run.adventure_title)}</h2>
      <p style="margin:0">משתמש: ${esc(who)}<br>תאריך: ${esc(date)}<br>סטטוס: ${status === 'completed' ? 'הושלמה' : 'הסתיימה מוקדם'}${
        reason ? `<br>סיבת הסיום המוקדם: ${esc(reason)}<br>תחנות שהושלמו: ${done.size} מתוך ${run.stop_ids.length}` : ''}</p>
      <h3 style="margin:16px 0 6px">דירוג סופי</h3>
      <p style="margin:0">${birds(changes.final_rating)}${changes.final_review ? `<br>"${esc(changes.final_review)}"` : ''}</p>
      <h3 style="margin:16px 0 6px">תחנות</h3>
      <table cellpadding="6" style="border-collapse:collapse;border:1px solid #E3EAF3"><tr style="background:#F6F9FC"><th>תחנה</th><th>הגעה</th><th>דירוג</th><th>הערות</th></tr>${stopRows}</table>
    </div>`;
    const result = await sendOwnerEmail({ subject, html });
    await updateRun(id, { summary_sent_at: new Date().toISOString() });
    return Response.json({ ok: true, status, emailed: result.sent ? 'sent' : 'saved', savedTo: result.savedTo });
  } catch (e) {
    console.error('⚠️ לא הצלחתי לסיים הרפתקה:', e.message);
    return Response.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
}
