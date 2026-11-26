import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { FEEDBACK_WEBHOOK_URL } from '../../../lib/config';

const FILE = path.join(process.cwd(), 'data', 'feedback.json');
const clip = (v, n) => String(v ?? '').slice(0, n);

// שמירת דירוג של הרפתקה
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: 'הדירוג צריך להיות בין 1 ל-5' }, { status: 400 });
  }
  const stops = Array.isArray(body.stops) ? body.stops.slice(0, 10) : [];
  const entry = {
    date: new Date().toISOString(),
    rating,
    comment: clip(body.comment, 1000),
    title: clip(body.title, 200),
    region: clip(body.region, 50),
    duration: clip(body.duration, 50),
    difficulty: clip(body.difficulty, 50),
    visited: stops.filter((s) => s.result !== 'skipped').length,
    total: stops.length,
    stops: stops.map((s) => clip(s.name, 100)).join(', '),
    minutes:
      Number(body.finishedAt) > Number(body.startedAt)
        ? Math.round((Number(body.finishedAt) - Number(body.startedAt)) / 60000)
        : null,
  };

  try {
    if (FEEDBACK_WEBHOOK_URL) {
      const res = await fetch(FEEDBACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
    } else {
      let all = [];
      try {
        all = JSON.parse(await readFile(FILE, 'utf8'));
      } catch {}
      all.push(entry);
      await writeFile(FILE, JSON.stringify(all, null, 2) + '\n');
    }
  } catch (e) {
    console.error('⚠️ לא הצלחתי לשמור דירוג:', e.message);
    return Response.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
