import { loadPlaces } from '../../../lib/places';

export const dynamic = 'force-dynamic';

// רשימת ההרפתקאות המומלצות למסך הבית. עם ?all=1 – כל המקומות (למפה)
export async function GET(request) {
  try {
    const places = await loadPlaces();
    if (request.nextUrl.searchParams.get('all')) {
      return Response.json(places.map((p) => ({ id: p.id, name: p.name, region: p.region })));
    }
    return Response.json(
      places.filter((p) => p.recommended).map((p) => ({ id: p.id, name: p.name, image: p.image || '' })),
    );
  } catch {
    return Response.json([]);
  }
}
