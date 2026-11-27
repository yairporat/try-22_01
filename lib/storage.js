// איפה שומרים קבצים בצד השרת כשאין Supabase.
// במחשב שלך – בתיקיית data של הפרויקט. בשרת כמו Vercel אי אפשר לכתוב לתיקיית הפרויקט,
// אז שומרים בתיקייה הזמנית של השרת (המידע שם לא נשמר לאורך זמן – לשמירה קבועה מחברים Supabase).
import { mkdir } from 'fs/promises';
import path from 'path';

const READ_ONLY_HOST = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
export const DATA_DIR = READ_ONLY_HOST ? '/tmp/thv-data' : path.join(process.cwd(), 'data');

export async function dataFile(...parts) {
  const file = path.join(DATA_DIR, ...parts);
  await mkdir(path.dirname(file), { recursive: true });
  return file;
}
