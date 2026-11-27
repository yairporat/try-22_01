import { getPublicRatings } from '../../../lib/runs';

export const dynamic = 'force-dynamic';

// הדירוג הממוצע ומספר המדרגים – גלויים לכל המשתמשים. הביקורות הכתובות לא נחשפות כאן.
export async function GET() {
  try {
    return Response.json(await getPublicRatings());
  } catch (e) {
    console.error('⚠️ לא הצלחתי לחשב דירוגים:', e.message);
    return Response.json({ places: {}, adventures: {} });
  }
}
