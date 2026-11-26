// שמירת דירוגי הרפתקאות בלשונית "דירוגים" בטבלת Google Sheets.
//
// התקנה (פעם אחת):
// 1. בטבלת המקומות ב-Google Sheets: תוספים > Apps Script.
// 2. מוחקים את מה שכתוב שם ומדביקים את כל הקובץ הזה. שומרים.
// 3. פריסה > פריסה חדשה > סוג: אפליקציית אינטרנט.
//    "הפעלה בתור": אני. "למי יש גישה": כל אחד. לוחצים פריסה ומאשרים הרשאות.
// 4. מעתיקים את כתובת אפליקציית האינטרנט ומדביקים ב-lib/config.js בשורה FEEDBACK_WEBHOOK_URL.

const SHEET_NAME = 'דירוגים';
const HEADERS = ['תאריך', 'דירוג', 'הערות', 'הרפתקה', 'אזור', 'משך', 'רמת קושי', 'תחנות שבוקרו', 'סה"כ תחנות', 'תחנות', 'משך בפועל (דקות)'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.setRightToLeft(true);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(d.date), d.rating, d.comment, d.title, d.region, d.duration, d.difficulty,
    d.visited, d.total, d.stops, d.minutes,
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
