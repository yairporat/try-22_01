import { requireAdmin } from '../../../../lib/admin';
import { loadCurated } from '../../../../lib/places';
import { saveCurated, deleteCurated, reorderCurated, loadAdminCurated } from '../../../../lib/content';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return Response.json({ adventures: await loadCurated(), imported: !!(await loadAdminCurated()) });
}

const str = (v, max = 4000) => String(v ?? '').trim().slice(0, max);

// שמירת הרפתקה, או סידור מחדש: { order: [id, ...] }
export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  let b;
  try {
    b = await request.json();
  } catch {
    return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  try {
    if (Array.isArray(b.order)) {
      await reorderCurated(b.order.map((x) => str(x, 80)));
      return Response.json({ ok: true });
    }
    const adv = {
      id: str(b.id, 80) || undefined,
      name: str(b.name, 120),
      description: str(b.description),
      image: str(b.image, 1000),
      show: b.show !== false,
      stops: (Array.isArray(b.stops) ? b.stops : []).map((x) => str(x, 80)).filter(Boolean).slice(0, 8),
    };
    if (!adv.name) return Response.json({ error: 'חסר שם להרפתקה' }, { status: 400 });
    if (!adv.stops.length) return Response.json({ error: 'צריך לפחות תחנה אחת' }, { status: 400 });
    return Response.json({ adventure: await saveCurated(adv) });
  } catch (e) {
    console.error('⚠️ שמירת הרפתקה נכשלה:', e.message);
    return Response.json({ error: 'השמירה נכשלה. נסו שוב.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return Response.json({ error: 'חסר מזהה' }, { status: 400 });
  try {
    await deleteCurated(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'המחיקה נכשלה' }, { status: 500 });
  }
}
