import { findAdventure, validatePlaces, buildCurated, replaceStop } from '../../../lib/adventure';
import { loadPlaces, loadCurated } from '../../../lib/places';
import { departureDate } from '../../../lib/traffic';

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
  // שעת היציאה (?depart=08:30), לפיה מחושבים הפקקים. בלי – יוצאים עכשיו
  const departAt = departureDate(q.get('depart')).toISOString();
  const list = (k, n) => (q.get(k) || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, n);
  // מקומות שכבר ביקרתי בהם (כשמסומן "רק מקומות חדשים")
  const exclude = (q.get('exclude') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 500);

  // החלפת תחנה: ?stops=a,b,c&replace=1&title=...&level=&duration=&tried=x,y
  const replaceAt = q.get('replace');
  if (replaceAt !== null && q.get('stops')) {
    const ids = q.get('stops').split(',').filter((id) => places.some((p) => p.id === id)).slice(0, 10);
    const tried = (q.get('tried') || '').split(',').filter(Boolean).slice(0, 50);
    const region = q.get('region') || null;
    const next = replaceStop(places, { stopIds: ids, index: Number(replaceAt), level: q.get('level'), style: q.get('style'), region, duration: q.get('duration'), origin, exclude, tried });
    if (!next) return Response.json({ error: 'לא מצאנו מקום אחר שמתאים להרפתקה הזו באזור.' }, { status: 404 });
    const a = buildCurated(places, { id: `custom-${next.join('-')}`, name: q.get('title') || 'ההרפתקה שלי', stops: next }, origin, departAt);
    // תחנה מחוץ לאזור שנבחר – "תחנה בדרך"
    const stops = a.stops.map((s) => ({ ...s, onTheWay: !!(region && s.region !== region) }));
    return Response.json({ ...a, stops, region: region || a.region, curatedId: null });
  }

  // הרפתקה שמורה (מהמועדפים): אותן תחנות באותו סדר
  const stopsParam = q.get('stops');
  if (stopsParam) {
    const ids = stopsParam.split(',').filter((id) => places.some((p) => p.id === id)).slice(0, 10);
    if (!ids.length) return Response.json({ error: 'ההרפתקה הזו כבר לא זמינה.' }, { status: 404 });
    return Response.json(buildCurated(places, { id: `saved-${ids.join('-')}`, name: q.get('title') || 'ההרפתקה השמורה שלי', stops: ids }, origin, departAt));
  }

  // הרפתקה שבניתי בעצמי (מהלשונית "הרפתקאות")
  const curatedId = q.get('curated');
  if (curatedId) {
    const c = (await loadCurated()).find((a) => a.id === curatedId);
    if (!c) return Response.json({ error: 'ההרפתקה הזו לא נמצאה. אולי היא נמחקה מהטבלה.' }, { status: 404 });
    return Response.json(buildCurated(places, c, origin, departAt));
  }

  return Response.json(
    findAdventure(places, {
      mode: q.get('mode'),
      region: q.get('region'),
      duration: q.get('duration'),
      level: q.get('level'),
      style: q.get('style'),
      placeId: q.get('id'),
      // "הפתע אותי": מה יצא לאחרונה במכשיר הזה, כדי לא לחזור על זה
      recentRegions: list('recentRegions', 5),
      recentAnchors: list('recentAnchors', 20),
      recentCombos: list('recentCombos', 20),
      lastCount: q.get('lastCount'),
      origin,
      departAt,
      exclude,
    }),
  );
}
