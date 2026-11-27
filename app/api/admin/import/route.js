import { requireAdmin } from '../../../../lib/admin';
import { loadSourcePlaces, loadSourceCurated } from '../../../../lib/places';
import { importAll } from '../../../../lib/content';

// מעבר חד-פעמי: כל המקומות וההרפתקאות מהטבלה/מהקובץ עוברים לעריכה באתר
export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const places = await loadSourcePlaces();
    const curated = (await loadSourceCurated()).map((c) => ({ ...c, stops: c.stops.filter((id) => places.some((p) => p.id === id)) }));
    await importAll(places, curated);
    return Response.json({ ok: true, places: places.length, adventures: curated.length });
  } catch (e) {
    console.error('⚠️ ההעברה נכשלה:', e.message);
    return Response.json({ error: `ההעברה נכשלה: ${e.message}` }, { status: 500 });
  }
}
