import { readFile, writeFile } from 'fs/promises';
import { dataFile } from '../../../lib/storage';
import { GOOGLE_SCRIPT_URL } from '../../../lib/config';


// הודעה על הרשמה חדשה: אימייל אליך (דרך סקריפט Google), או שמירה בקובץ אם הסקריפט לא הוגדר
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  const name = String(body.name || '').trim().slice(0, 60);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 120);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: 'שם או אימייל לא תקינים' }, { status: 400 });
  }
  const entry = { kind: 'signup', date: new Date().toISOString(), name, email };
  try {
    if (GOOGLE_SCRIPT_URL) {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`script ${res.status}`);
    }
    await saveLocal(entry);
  } catch (e) {
    console.error('⚠️ לא הצלחתי לדווח על הרשמה:', e.message);
    return Response.json({ error: 'הדיווח נכשל' }, { status: 500 });
  }
  return Response.json({ ok: true });
}

// רשימת הנרשמים נשמרת גם כאן, כדי ש"כבר יש לי חשבון" ימצא את השם לפי האימייל
async function saveLocal(entry) {
  try {
    let all = [];
    try {
      all = JSON.parse(await readFile(await dataFile('signups.json'), 'utf8'));
    } catch {}
    if (!all.some((e) => e.email === entry.email)) all.push(entry);
    await writeFile(await dataFile('signups.json'), JSON.stringify(all, null, 2) + '\n');
  } catch (e) {
    if (!GOOGLE_SCRIPT_URL) throw e;
  }
}
