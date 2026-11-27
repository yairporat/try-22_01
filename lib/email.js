// שליחת מייל לבעלי האפליקציה דרך Resend.
// משתני סביבה: RESEND_API_KEY, OWNER_EMAIL, ואופציונלית EMAIL_FROM.
// כשאין מפתח – המייל נשמר כקובץ בתיקייה data/outbox, כדי שאפשר יהיה לראות מה היה נשלח.

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export async function sendOwnerEmail({ subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_EMAIL;
  if (key && to) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'THV <onboarding@resend.dev>', to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return { sent: true };
  }
  const dir = path.join(process.cwd(), 'data', 'outbox');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
  await writeFile(file, `<!doctype html><meta charset="utf-8"><title>${subject}</title>${html}`);
  return { sent: false, savedTo: path.relative(process.cwd(), file) };
}
