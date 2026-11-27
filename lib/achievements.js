// הישגים: כל הישג מעניק 50 מטבעות, פעם אחת בלבד לכל משתמש.
// ההתקדמות מחושבת מההרפתקאות שהושלמו ומהמקומות שביקרתי בהם.
// עם Supabase, הזיכוי נעשה בצד השרת (supabase/migrations/002_achievements.sql, הפונקציה award_achievement).

import { loadWallet, saveWallet } from './profile';
import { loadVisited } from './visited';

export const ACHIEVEMENT_REWARD = 50;

export const ACHIEVEMENTS = [
  { id: 'first-adventure', icon: '🏆', title: 'ההרפתקה הראשונה', desc: 'מסיימים הרפתקה ראשונה', goal: 1, unit: 'הרפתקאות', progress: (s) => s.adventures },
  { id: 'five-places', icon: '📍', title: 'חמישה מקומות', desc: 'מבקרים בחמישה מקומות', goal: 5, unit: 'מקומות', progress: (s) => s.places },
  { id: 'three-regions', icon: '🧭', title: 'שלושה אזורים', desc: 'מבקרים בשלושה אזורים שונים', goal: 3, unit: 'אזורים', progress: (s) => s.regions },
];

export function currentStats(wallet = loadWallet(), visited = loadVisited()) {
  const places = Object.values(visited);
  return {
    adventures: wallet.history.filter((h) => h.tripId).length,
    places: places.length,
    regions: new Set(places.map((p) => p.region)).size,
  };
}

// בודק את כל ההישגים ומזכה את אלה שהושגו ועוד לא זוכו. מחזיר את ההישגים החדשים.
export function checkAchievements() {
  const wallet = loadWallet();
  const stats = currentStats(wallet);
  const earned = new Set(wallet.history.filter((h) => h.achievementId).map((h) => h.achievementId));
  const fresh = ACHIEVEMENTS.filter((a) => !earned.has(a.id) && a.progress(stats) >= a.goal);
  if (fresh.length) {
    const history = [
      ...fresh.map((a) => ({ date: Date.now(), amount: ACHIEVEMENT_REWARD, reason: `הישג: ${a.title}`, achievementId: a.id })),
      ...wallet.history,
    ];
    saveWallet({ coins: wallet.coins + ACHIEVEMENT_REWARD * fresh.length, history });
  }
  return fresh;
}

export function achievementStatus() {
  const wallet = loadWallet();
  const stats = currentStats(wallet);
  const earned = new Map(wallet.history.filter((h) => h.achievementId).map((h) => [h.achievementId, h.date]));
  return ACHIEVEMENTS.map((a) => ({ ...a, value: Math.min(a.progress(stats), a.goal), earnedAt: earned.get(a.id) || null }));
}
