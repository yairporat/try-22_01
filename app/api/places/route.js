import { loadPlaces } from '../../../lib/places';

export const dynamic = 'force-dynamic';

// רשימת ההרפתקאות המומלצות למסך הבית
export async function GET() {
  try {
    const places = await loadPlaces();
    return Response.json(
      places.filter((p) => p.recommended).map((p) => ({ id: p.id, name: p.name, image: p.image || '' })),
    );
  } catch {
    return Response.json([]);
  }
}
