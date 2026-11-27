// הרפתקאות מועדפות (כפתור הלב). נשמרות במכשיר; עם Supabase – בטבלה favorites.
const KEY = 'thv-favorites';

export function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
export const isFavorite = (key) => loadFavorites().some((f) => f.key === key);

// fav: { key, title, href, region, stops }
export function toggleFavorite(fav) {
  const all = loadFavorites();
  const next = all.some((f) => f.key === fav.key) ? all.filter((f) => f.key !== fav.key) : [{ ...fav, savedAt: Date.now() }, ...all];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next.some((f) => f.key === fav.key);
}
