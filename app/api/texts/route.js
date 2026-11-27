import { loadTextOverrides } from '../../../lib/content';
import { isAdmin } from '../../../lib/admin';

export const dynamic = 'force-dynamic';

// הטקסטים שהמנהל שינה (השאר – מ-lib/texts.js), ואם מי שגולש הוא מנהל
export async function GET(request) {
  let texts = {};
  try {
    texts = await loadTextOverrides();
  } catch {}
  return Response.json({ texts, admin: isAdmin(request) });
}
