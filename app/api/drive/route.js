import { estimateDrive, osrmDrive } from '../../../lib/travel';
import { trafficFactor } from '../../../lib/traffic';

export const dynamic = 'force-dynamic';

// זמן נסיעה בין שתי נקודות, כולל פקקים.
// עם GOOGLE_MAPS_API_KEY – גוגל מחשב לפי התנועה בפועל ובתחזית לשעת היציאה.
// בלי מפתח – זמן הנסיעה לפי הכבישים (OSRM) כפול העומס הצפוי בשעה הזו (lib/traffic.js).
// ?from=lat,lng&to=lat,lng&at=<זמן יציאה במילישניות>

const point = (s) => {
  const [lat, lng] = String(s || '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

export async function GET(request) {
  const q = request.nextUrl.searchParams;
  const a = point(q.get('from'));
  const b = point(q.get('to'));
  if (!a || !b) return Response.json({ error: 'נקודות לא תקינות' }, { status: 400 });
  const atMs = Number(q.get('at'));
  const when = Number.isFinite(atMs) && atMs > 0 ? new Date(Math.max(atMs, Date.now())) : new Date();

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
      url.searchParams.set('origins', `${a.lat},${a.lng}`);
      url.searchParams.set('destinations', `${b.lat},${b.lng}`);
      url.searchParams.set('departure_time', String(Math.floor(when.getTime() / 1000)));
      url.searchParams.set('traffic_model', 'best_guess');
      url.searchParams.set('key', key);
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const el = (await res.json()).rows?.[0]?.elements?.[0];
      if (el?.status === 'OK') {
        const secs = (el.duration_in_traffic || el.duration).value;
        return Response.json({ km: el.distance.value / 1000, minutes: Math.max(1, Math.round(secs / 60)), estimated: false, traffic: true, source: 'google' });
      }
    } catch {}
  }

  const factor = trafficFactor(when);
  try {
    const r = await osrmDrive(a, b);
    return Response.json({ ...r, minutes: Math.max(1, Math.round(r.minutes * factor)), traffic: factor > 1, source: 'osrm' });
  } catch {
    const e = estimateDrive(a, b);
    return Response.json({ ...e, minutes: Math.max(1, Math.round(e.minutes * factor)), traffic: factor > 1, source: 'estimate' });
  }
}
