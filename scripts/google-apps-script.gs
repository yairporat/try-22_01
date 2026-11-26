// סקריפט Google אחד שעושה שני דברים:
// 1. שולח לך אימייל בכל פעם שמישהו נרשם לאפליקציה, ושומר אותו בלשונית "נרשמים".
// 2. שומר דירוגי הרפתקאות בלשונית "דירוגים".
//
// התקנה (פעם אחת, כ-3 דקות):
// 1. פותחים גיליון Google Sheets (למשל טבלת המקומות, או גיליון חדש) > תוספים > Apps Script.
// 2. מוחקים את מה שכתוב שם ומדביקים את כל הקובץ הזה. שומרים.
// 3. פריסה > פריסה חדשה > סוג: אפליקציית אינטרנט.
//    "הפעלה בתור": אני. "למי יש גישה": כל אחד. לוחצים פריסה ומאשרים הרשאות
//    (Google תבקש אישור לשלוח אימייל בשמך ולערוך את הגיליון).
// 4. מעתיקים את כתובת אפליקציית האינטרנט ומדביקים ב-lib/config.js בשורה GOOGLE_SCRIPT_URL.
//
// האימייל נשלח לחשבון Google שפרס את הסקריפט (כלומר אליך).

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.kind === 'signup') return signup(d);
  return feedback(d);
}

function sheetNamed(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.setRightToLeft(true);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function signup(d) {
  const owner = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: owner,
    subject: 'THV: נרשם/ה משתמש/ת חדש/ה – ' + d.name,
    body:
      'מישהו נרשם לאפליקציה THV.\n\n' +
      'שם: ' + d.name + '\n' +
      'אימייל: ' + d.email + '\n' +
      'תאריך: ' + new Date(d.date).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }) + '\n',
  });
  sheetNamed('נרשמים', ['תאריך', 'שם', 'אימייל']).appendRow([new Date(d.date), d.name, d.email]);
  return ok();
}

function feedback(d) {
  sheetNamed('דירוגים', ['תאריך', 'דירוג', 'הערות', 'הרפתקה', 'אזור', 'משך', 'רמת קושי', 'תחנות שבוקרו', 'סה"כ תחנות', 'תחנות', 'משך בפועל (דקות)'])
    .appendRow([new Date(d.date), d.rating, d.comment, d.title, d.region, d.duration, d.difficulty, d.visited, d.total, d.stops, d.minutes]);
  return ok();
}

function ok() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
