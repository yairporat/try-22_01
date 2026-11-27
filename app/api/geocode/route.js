export const dynamic = 'force-dynamic';

// חיפוש נקודת יציאה לפי שם (כתובת, יישוב, מקום) בישראל.
// עם GOOGLE_MAPS_API_KEY – דרך גוגל; בלי – דרך OpenStreetMap (Nominatim, חינמי).
// ?q=קיבוץ דן  →  [{ name, detail, lat, lng }]

const cache = new Map();

export async function GET(request) {
  const q = String(request.nextUrl.searchParams.get('q') || '').trim().slice(0, 80);
  if (q.length < 2) return Response.json([]);
  if (cache.has(q)) return Response.json(cache.get(q));

  let results = [];
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (key) {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', q);
      url.searchParams.set('region', 'il');
      url.searchParams.set('language', 'he');
      url.searchParams.set('key', key);
      const data = await (await fetch(url, { signal: AbortSignal.timeout(6000) })).json();
      results = (data.results || []).slice(0, 6).map((r) => ({
        name: r.address_components?.[0]?.long_name || r.formatted_address,
        detail: r.formatted_address,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      }));
    } else {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('countrycodes', 'il');
      url.searchParams.set('limit', '6');
      url.searchParams.set('accept-language', 'he');
      const res = await fetch(url, {
        headers: { 'User-Agent': 'THV-app (the hidden valley)' },
        signal: AbortSignal.timeout(6000),
      });
      results = (await res.json()).map((r) => ({
        name: r.name || String(r.display_name).split(',')[0],
        detail: String(r.display_name).split(',').slice(0, 3).join(','),
        lat: Number(r.lat),
        lng: Number(r.lon),
      }));
    }
  } catch {
    return Response.json({ error: 'החיפוש לא זמין כרגע. נסו שוב בעוד רגע.' }, { status: 502 });
  }
  results = results.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  if (cache.size > 500) cache.clear();
  cache.set(q, results);
  return Response.json(results);
}
