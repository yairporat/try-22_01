// כל הטקסטים שהמנהל יכול לשנות באתר, עם הטקסט המקורי.
// מה שהמנהל שינה נשמר בנפרד (site_texts), ו"חזרה למקור" מחזיר לטקסט שכאן.
// kind: 'text' (שורה), 'long' (פסקה), 'image' (קישור לתמונה)

export const TEXTS = [
  // מסך הבית
  { key: 'home.hello', group: 'מסך הבית', label: 'ברכה (לפני השם)', value: 'היי' },
  { key: 'home.title', group: 'מסך הבית', label: 'כותרת ראשית', value: 'הרפתקאות מומלצות' },
  { key: 'home.regionsTitle', group: 'מסך הבית', label: 'כותרת האזורים', value: 'לאן בא לכם?' },
  { key: 'home.topPlacesTitle', group: 'מסך הבית', label: 'כותרת המקומות המדורגים', value: 'המקומות שמטיילים הכי אוהבים' },
  { key: 'home.empty', group: 'מסך הבית', label: 'כשאין הרפתקאות מומלצות', value: 'עוד אין הרפתקאות מומלצות. לחצו על + כדי למצוא הרפתקה.' },
  { key: 'img.cover1', group: 'מסך הבית', label: 'תמונת ברירת מחדל 1 לכרטיס', value: '/art/phoenix-nature.jpg', kind: 'image' },
  { key: 'img.cover2', group: 'מסך הבית', label: 'תמונת ברירת מחדל 2 לכרטיס', value: '/art/phoenix-desert.jpg', kind: 'image' },
  { key: 'img.cover3', group: 'מסך הבית', label: 'תמונת ברירת מחדל 3 לכרטיס', value: '/art/phoenix-space.jpg', kind: 'image' },

  // סרגל תחתון
  { key: 'tabs.home', group: 'סרגל תחתון', label: 'בית', value: 'בית' },
  { key: 'tabs.map', group: 'סרגל תחתון', label: 'מפה', value: 'מפה' },
  { key: 'tabs.new', group: 'סרגל תחתון', label: 'הכפתור האמצעי', value: 'הרפתקאה חדשה' },
  { key: 'tabs.favorites', group: 'סרגל תחתון', label: 'מועדפים', value: 'מועדפים' },
  { key: 'tabs.profile', group: 'סרגל תחתון', label: 'פרופיל', value: 'פרופיל' },

  // הרפתקאה חדשה
  { key: 'new.title', group: 'הרפתקאה חדשה', label: 'כותרת', value: 'לאן יוצאים היום?' },
  { key: 'new.surprise', group: 'הרפתקאה חדשה', label: 'כפתור "הפתע אותי"', value: 'הפתע אותי' },
  { key: 'new.custom', group: 'הרפתקאה חדשה', label: 'כפתור "התאמה אישית"', value: 'התאמה אישית' },
  { key: 'new.surpriseNote', group: 'הרפתקאה חדשה', label: 'הסבר ל"הפתע אותי"', value: 'נבחר בשבילך הרפתקה שמתאימה לזמן ולמקום שממנו יוצאים', kind: 'long' },
  { key: 'new.find', group: 'הרפתקאה חדשה', label: 'הכפתור הכתום', value: 'מצא לי הרפתקה' },
  { key: 'new.trafficNote', group: 'הרפתקאה חדשה', label: 'הערה על פקקים', value: 'זמני הנסיעה מחושבים לפי עומסי התנועה בשעה שתבחרו', kind: 'long' },

  // אין התאמה
  { key: 'nofit.title', group: 'חלון "לא נמצאה הרפתקה"', label: 'כותרת', value: 'לא נמצאה הרפתקה מתאימה' },
  { key: 'nofit.suggestionLabel', group: 'חלון "לא נמצאה הרפתקה"', label: 'כותרת ההמלצה', value: 'ההמלצה שלנו' },
  { key: 'nofit.toSuggestion', group: 'חלון "לא נמצאה הרפתקה"', label: 'כפתור מעבר להמלצה', value: 'מעבר להמלצה' },
  { key: 'nofit.other', group: 'חלון "לא נמצאה הרפתקה"', label: 'כפתור בחירה אחרת', value: 'בחירה אחרת' },
  { key: 'nofit.origin', group: 'חלון "לא נמצאה הרפתקה"', label: 'כפתור מקום יציאה אחר', value: 'לצאת ממקום אחר' },
  { key: 'nofit.showAnyway', group: 'חלון "לא נמצאה הרפתקה"', label: 'קישור "להציג בכל זאת"', value: 'להציג את ההרפתקה בכל זאת' },

  // עמוד ההרפתקה
  { key: 'adventure.start', group: 'עמוד ההרפתקה', label: 'כפתור היציאה', value: 'יוצאים להרפתקה' },
  { key: 'adventure.reviewsTitle', group: 'עמוד ההרפתקה', label: 'כותרת ההמלצות', value: 'מה מטיילים אומרים' },

  // מסך הפתיחה
  { key: 'welcome.title', group: 'מסך הפתיחה', label: 'כותרת', value: 'ברוכים הבאים ל-' },
  { key: 'welcome.sub', group: 'מסך הפתיחה', label: 'שורת הסבר', value: 'גלו הרפתקאות נסתרות בטבע של ישראל' },
  { key: 'welcome.start', group: 'מסך הפתיחה', label: 'כפתור התחלה', value: 'בואו נתחיל' },
  { key: 'welcome.login', group: 'מסך הפתיחה', label: 'קישור התחברות', value: 'כבר יש לי חשבון' },
];

export const TEXT_DEFAULTS = Object.fromEntries(TEXTS.map((t) => [t.key, t.value]));
export const TEXT_KEYS = new Set(TEXTS.map((t) => t.key));
