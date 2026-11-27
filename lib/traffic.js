// עומסי תנועה צפויים בישראל לפי יום ושעה.
// בלי מפתח של שירות מפות, זמן הנסיעה מוכפל במקדם לפי השעה שבה עוברים בכביש:
// שעות העומס של הבוקר ושל אחר הצהריים בימי חול, שישי בבוקר ומוצאי שבת.
// עם GOOGLE_MAPS_API_KEY בשרת – הזמן נלקח מגוגל, כולל הפקקים של הרגע (ראו app/api/drive).

// היום בשבוע (0 = ראשון) והשעה בדקות, לפי שעון ישראל
export function israelClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

const at = (h, m = 0) => h * 60 + m;

// מקדם העומס: 1 = כביש פנוי
export function trafficFactor(date = new Date()) {
  const { day, minutes: t } = israelClock(date);
  const between = (a, b) => t >= a && t < b;
  if (day >= 0 && day <= 4) {
    // ראשון עד חמישי
    if (between(at(6, 30), at(9, 30))) return 1.45; // עומס בוקר
    if (between(at(15, 0), at(19, 0))) return day === 4 ? 1.5 : 1.4; // עומס ערב (בחמישי חזק יותר)
    if (between(at(9, 30), at(15, 0))) return 1.15;
    if (between(at(19, 0), at(21, 0))) return 1.1;
    return 1;
  }
  if (day === 5) {
    // שישי: בוקר עמוס, אחר הצהריים פנוי
    if (between(at(9, 0), at(14, 0))) return 1.25;
    return 1;
  }
  // שבת: יציאה לטיולים בבוקר וחזרה עמוסה בערב
  if (between(at(9, 0), at(12, 0))) return 1.1;
  if (between(at(15, 30), at(21, 0))) return 1.3;
  return 1;
}

// זמן נסיעה עם העומס הצפוי בשעה שבה נוסעים
export const withTraffic = (minutes, date = new Date()) => Math.max(1, Math.round(minutes * trafficFactor(date)));

// מנוחה והפסקות: בהרפתקה ארוכה מוסיפים זמן לאוכל ולעצירות בדרך
export function breakMinutes(totalMinutes) {
  if (totalMinutes > 360) return 45;
  if (totalMinutes > 210) return 20;
  return 0;
}

// "יוצאים ב-HH:MM" → תאריך היום (או מחר, אם השעה כבר עברה)
export function departureDate(hhmm, now = new Date()) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return now;
  const { minutes } = israelClock(now);
  let diff = at(Number(m[1]), Number(m[2])) - minutes;
  if (diff < -30) diff += 24 * 60;
  return new Date(now.getTime() + Math.max(0, diff) * 60000);
}
