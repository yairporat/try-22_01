import { requireAdmin } from '../../../../lib/admin';
import { getAllReviews, setReviewHidden } from '../../../../lib/runs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    return Response.json({ reviews: await getAllReviews() });
  } catch (e) {
    return Response.json({ reviews: [], error: 'לא הצלחתי לטעון ביקורות' });
  }
}

// הסתרה או החזרה של המלצה: { id, hidden }
export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const b = await request.json();
    await setReviewHidden(String(b.id), !!b.hidden);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
}
