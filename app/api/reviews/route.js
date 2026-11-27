import { getPublicRatings, getPublicReviews } from '../../../lib/runs';

export const dynamic = 'force-dynamic';

// המלצות של מטיילים, גלויות לכולם: ?place=<מזהה מקום> או ?places=a,b,c (בלי – ההמלצות האחרונות מכל המקומות)
// מחזיר גם את הדירוג הממוצע של המקום
export async function GET(request) {
  const q = request.nextUrl.searchParams;
  const placeId = q.get('place') || null;
  const placeIds = (q.get('places') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 10);
  try {
    const [reviews, ratings] = await Promise.all([
      getPublicReviews({ placeId, placeIds: placeIds.length ? placeIds : null, limit: placeId || placeIds.length ? 20 : 30 }),
      getPublicRatings(),
    ]);
    return Response.json({ reviews, rating: placeId ? ratings.places[placeId] || null : null });
  } catch (e) {
    console.error('⚠️ לא הצלחתי לטעון המלצות:', e.message);
    return Response.json({ reviews: [], rating: null });
  }
}
