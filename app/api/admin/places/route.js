import { requireAdmin } from '../../../../lib/admin';
import { loadPlaces } from '../../../../lib/places';
import { savePlace, deletePlace, loadAdminPlaces } from '../../../../lib/content';
import * as content from '../../../../lib/content';
import { validatePlaces } from '../../../../lib/adventure';
import { parseLatLng, resolveShortLink, isUrl } from '../../../../lib/sheet';

export const dynamic = 'force-dynamic';

// כל המקומות, כולל מוסתרים
export async function GET(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return Response.json({ places: await loadPlaces({ includeHidden: true }), imported: !!(await loadAdminPlaces()) });
}

const str = (v, max = 4000) => String(v ?? '').trim().slice(0, max);

// שמירת מקום (חדש או קיים)
export async function POST(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  if (!(await loadAdminPlaces())) {
    return Response.json({ error: 'קודם לוחצים "העברת המקומות לעריכה באתר" בראש מסך הניהול.' }, { status: 409 });
  }
  let b;
  try {
    b = await request.json();
  } catch {
    return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const place = {
    id: str(b.id, 80) || undefined,
    name: str(b.name, 120),
    region: str(b.region, 40),
    type: str(b.type, 40),
    difficulty: str(b.difficulty, 20),
    visitMinutes: Math.round(Number(b.visitMinutes)) || 0,
    description: str(b.description),
    hours: str(b.hours, 300),
    tips: str(b.tips, 1000),
    parking: str(b.parking, 1000),
    equipment: str(b.equipment, 500),
    directions: str(b.directions, 2000),
    season: str(b.season, 500),
    notes: str(b.notes, 2000),
    spotLocation: str(b.spotLocation, 1000),
    location: str(b.location, 1000),
    image: str(b.image, 1000),
    gallery: (Array.isArray(b.gallery) ? b.gallery : []).map((x) => str(x, 1000)).filter(Boolean).slice(0, 20),
    recommended: !!b.recommended,
    hidden: !!b.hidden,
    wayStop: !!b.wayStop,
    roads: str(b.roads, 200),
  };
  const radius = Math.round(Number(b.radius));
  if (radius > 0) place.radius = radius;
  // מיקום: מהקישור של גוגל מפס, או קואורדינטות שנכתבו ידנית
  let coords = parseLatLng(place.location);
  if (!coords && isUrl(place.location)) coords = await resolveShortLink(place.location);
  if (!coords && Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lng)) && b.lat !== '' && b.lng !== '') coords = { lat: Number(b.lat), lng: Number(b.lng) };
  if (coords) Object.assign(place, coords);
  // המיקום של המקום עצמו (למשל המעיין) – מוצג רק בתוך ההרפתקה
  let spot = parseLatLng(place.spotLocation);
  if (!spot && isUrl(place.spotLocation)) spot = await resolveShortLink(place.spotLocation);
  if (spot) Object.assign(place, { spotLat: spot.lat, spotLng: spot.lng });

  const errors = validatePlaces([{ ...place, id: place.id || 'new' }], () => 'המקום');
  if (errors.length) return Response.json({ error: errors.join('\n') }, { status: 400 });
  try {
    const saved = await savePlace(place);
    return Response.json({ place: saved, located: !!coords, missing: content.missingColumns });
  } catch (e) {
    console.error('⚠️ שמירת מקום נכשלה:', e.message);
    return Response.json({ error: 'השמירה נכשלה. נסו שוב.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return Response.json({ error: 'חסר מזהה' }, { status: 400 });
  try {
    await deletePlace(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'המחיקה נכשלה' }, { status: 500 });
  }
}
