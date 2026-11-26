import { curatedSummary } from '../../../lib/adventure';
import { loadCurated, loadPlaces } from '../../../lib/places';

export const dynamic = 'force-dynamic';

// ההרפתקאות שבניתי ומסומנות "להציג בדף הראשי"
export async function GET() {
  try {
    const [places, curated] = await Promise.all([loadPlaces(), loadCurated()]);
    return Response.json(curated.filter((c) => c.show !== false && c.stops.length).map((c) => curatedSummary(places, c)));
  } catch {
    return Response.json([]);
  }
}
