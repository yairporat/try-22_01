import { loadPlaces } from '../../../lib/places';
import { mapsLinkFor } from '../../../lib/sheet';

export const dynamic = 'force-dynamic';

// רשימת ההרפתקאות המומלצות למסך הבית. עם ?all=1 – כל המקומות (למפה)
export async function GET(request) {
  try {
    const places = await loadPlaces();
    // פרטים מלאים על מקום אחד (?id=...), למשל כשחוזרים למקום שביקרתי בו
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const p = places.find((x) => x.id === id);
      if (!p) return Response.json({ error: 'המקום הזה כבר לא זמין' }, { status: 404 });
      return Response.json({ ...p, mapsLink: mapsLinkFor(p) });
    }
    if (request.nextUrl.searchParams.get('all')) {
      return Response.json(places.map((p) => ({ id: p.id, name: p.name, region: p.region, type: p.type, image: p.image || '' })));
    }
    return Response.json(
      places.filter((p) => p.recommended).map((p) => ({ id: p.id, name: p.name, image: p.image || '', region: p.region, type: p.type })),
    );
  } catch {
    return Response.json([]);
  }
}
