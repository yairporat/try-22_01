import { readFile } from 'fs/promises';
import path from 'path';
import { findAdventure, validatePlaces } from '../../../lib/adventure';

// קוראים את הקובץ בכל בקשה, כך ששינוי ב-data/places.json נכנס לתוקף מיד
export const dynamic = 'force-dynamic';

export async function GET(request) {
  let places;
  try {
    const text = await readFile(path.join(process.cwd(), 'data', 'places.json'), 'utf8');
    places = JSON.parse(text);
  } catch (e) {
    return Response.json(
      { error: 'לא הצלחתי לקרוא את data/places.json. הריצו npm run check-places כדי לראות מה לא תקין.' },
      { status: 500 },
    );
  }
  const errors = validatePlaces(places);
  if (errors.length) {
    return Response.json({ error: 'יש שגיאות בקובץ המקומות', details: errors }, { status: 500 });
  }

  const q = request.nextUrl.searchParams;
  const adventure = findAdventure(places, {
    mode: q.get('mode'),
    region: q.get('region'),
    duration: q.get('duration'),
    level: q.get('level'),
    placeId: q.get('id'),
  });
  return Response.json(adventure);
}
