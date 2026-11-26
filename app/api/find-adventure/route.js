import { findAdventure, validatePlaces } from '../../../lib/adventure';
import { loadPlaces } from '../../../lib/places';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let places;
  try {
    places = await loadPlaces();
  } catch (e) {
    return Response.json({ error: 'לא הצלחתי לטעון את רשימת המקומות.' }, { status: 500 });
  }
  const errors = validatePlaces(places);
  if (errors.length) {
    return Response.json({ error: 'יש שגיאות ברשימת המקומות', details: errors }, { status: 500 });
  }

  const q = request.nextUrl.searchParams;
  // נקודת היציאה (המיקום שלי או עיר), אם ידועה
  const olat = Number(q.get('olat'));
  const olng = Number(q.get('olng'));
  const origin =
    q.get('olat') && Number.isFinite(olat) && Number.isFinite(olng)
      ? { lat: olat, lng: olng, label: (q.get('olabel') || 'המיקום שלך').slice(0, 40) }
      : null;
  return Response.json(
    findAdventure(places, {
      mode: q.get('mode'),
      region: q.get('region'),
      duration: q.get('duration'),
      level: q.get('level'),
      placeId: q.get('id'),
      origin,
    }),
  );
}
