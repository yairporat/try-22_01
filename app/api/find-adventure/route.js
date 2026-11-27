import { findAdventure, validatePlaces, buildCurated } from '../../../lib/adventure';
import { loadPlaces, loadCurated } from '../../../lib/places';

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
  // הרפתקה שמורה (מהמועדפים): אותן תחנות באותו סדר
  const stopsParam = q.get('stops');
  if (stopsParam) {
    const ids = stopsParam.split(',').filter((id) => places.some((p) => p.id === id)).slice(0, 10);
    if (!ids.length) return Response.json({ error: 'ההרפתקה הזו כבר לא זמינה.' }, { status: 404 });
    return Response.json(buildCurated(places, { id: `saved-${ids.join('-')}`, name: q.get('title') || 'ההרפתקה השמורה שלי', stops: ids }, origin));
  }

  // הרפתקה שבניתי בעצמי (מהלשונית "הרפתקאות")
  const curatedId = q.get('curated');
  if (curatedId) {
    const c = (await loadCurated()).find((a) => a.id === curatedId);
    if (!c) return Response.json({ error: 'ההרפתקה הזו לא נמצאה. אולי היא נמחקה מהטבלה.' }, { status: 404 });
    return Response.json(buildCurated(places, c, origin));
  }

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
