import { adminEnabled, isAdmin } from '../../../../lib/admin';
import { storageMode, loadAdminPlaces } from '../../../../lib/content';

export const dynamic = 'force-dynamic';

// מצב המנהל: מחובר? איפה נשמר התוכן? האם המקומות כבר עברו לעריכה באתר?
export async function GET(request) {
  const admin = isAdmin(request);
  return Response.json({
    enabled: adminEnabled,
    admin,
    storage: storageMode,
    imported: admin ? !!(await loadAdminPlaces()) : undefined,
  });
}
