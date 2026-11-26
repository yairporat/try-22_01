// הקישור לטבלת המקומות ב-Google Sheets, בפורמט CSV.
// איך משיגים אותו: ב-Google Sheets > קובץ > שיתוף > פרסום באינטרנט >
// בוחרים את הגיליון "מקומות" ואת הפורמט "ערכים מופרדים בפסיקים (csv.)" > פרסום, ומעתיקים את הקישור לכאן.
//
// כשהשדה ריק, האפליקציה משתמשת בקובץ data/places.xlsx שבפרויקט.
export const PLACES_SHEET_CSV_URL = process.env.PLACES_SHEET_CSV_URL || '';

// כל כמה שניות לקרוא שוב את הטבלה (שינויים בטבלה יופיעו באפליקציה תוך הזמן הזה,
// ועוד עד כ-5 דקות שגוגל עצמה לוקחת לעדכן טבלה מפורסמת)
export const SHEET_REFRESH_SECONDS = 60;

// לאן לשלוח דירוגים של הרפתקאות. כשהשדה ריק, הדירוגים נשמרים בקובץ data/feedback.json.
// כדי לשמור אותם בלשונית "דירוגים" ב-Google Sheets: ראו scripts/feedback-apps-script.gs
export const FEEDBACK_WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL || '';
