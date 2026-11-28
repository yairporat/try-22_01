// ההרפתקה שמוצגת עכשיו בעמוד ההרפתקה, כולל השינויים (הוספה, הסרה, החלפה).
// כך רענון של העמוד מציג אותה הרפתקה בדיוק ולא בונה חדשה.
// נשמרת לפי הכתובת (query); לחיצה חדשה על "מצא לי הרפתקה" יוצרת כתובת חדשה ולכן הרפתקה חדשה.

const KEY = 'thv-current-adventure';
const MAX_AGE = 24 * 60 * 60 * 1000;

export function loadCurrent(query) {
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    if (c && c.query === query && Date.now() - c.at < MAX_AGE && c.adventure?.stops?.length) return c;
  } catch {}
  return null;
}

export function saveCurrent(query, { adventure, removed = [], origin = null }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ query, adventure, removed, origin, at: Date.now() }));
  } catch {}
}
