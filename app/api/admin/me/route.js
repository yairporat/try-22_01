import { adminEnabled, isAdmin } from '../../../../lib/admin';
import { storageMode, loadAdminPlaces } from '../../../../lib/content';
import { supabaseProblem } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// מצב המנהל: מחובר? איפה נשמר התוכן? האם המקומות כבר עברו לעריכה באתר?
export async function GET(request) {
  const admin = isAdmin(request);
  return Response.json({
    enabled: adminEnabled,
    // לבדיקה כשהכניסה לא עובדת: באיזו סביבה וענף השרת רץ, והאם הוא רואה את ההגדרות (בלי הערכים עצמם)
    env: process.env.VERCEL_ENV || 'local',
    branch: process.env.VERCEL_GIT_COMMIT_REF || '',
    hasPassword: !!process.env.ADMIN_PASSWORD,
    hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    admin,
    storage: storageMode,
    supabaseProblem: admin ? supabaseProblem : undefined,
    imported: admin ? !!(await loadAdminPlaces()) : undefined,
  });
}
