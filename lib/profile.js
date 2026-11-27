// פרופיל המשתמש והמטבעות. נשמרים במכשיר (localStorage).
// כשנחבר שירות התחברות (למשל Supabase), רק הקובץ הזה יצטרך להשתנות.

const PROFILE_KEY = 'thv-profile';
const WALLET_KEY = 'thv-wallet';

export const START_COINS = 100;
export const ADVENTURE_REWARD = 25;

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---- פרופיל ----
export const loadProfile = () => read(PROFILE_KEY);

export function register({ name, email }) {
  const profile = { name: name.trim(), email: email.trim().toLowerCase(), createdAt: Date.now() };
  write(PROFILE_KEY, profile);
  remember(profile);
  return profile;
}

// עוגייה לשנה בשרת, כדי לזכור את המשתמש גם אם הדפדפן מחק את הנתונים במכשיר
function remember(profile) {
  try {
    fetch('/api/remember', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profile.name, email: profile.email }) }).catch(() => {});
  } catch {}
}

// מחזיר את הפרופיל: מהמכשיר, ואם נמחק – משחזר מהעוגייה. null = משתמש חדש באמת
export async function restoreProfile() {
  const local = loadProfile();
  if (local) {
    remember(local);
    return local;
  }
  try {
    const { user } = await (await fetch('/api/remember', { cache: 'no-store' })).json();
    if (!user) return null;
    const profile = { name: user.name, email: user.email, createdAt: Date.now() };
    write(PROFILE_KEY, profile);
    return profile;
  } catch {
    return null;
  }
}

export function updateProfile(changes) {
  const profile = { ...loadProfile(), ...changes };
  write(PROFILE_KEY, profile);
  return profile;
}

// בהתנתקות שומרים את השם והאימייל, כדי להציע אותם במילוי אוטומטי בהרשמה הבאה
const LAST_KEY = 'thv-last-details';
export function logout() {
  const p = loadProfile();
  if (p) write(LAST_KEY, { name: p.name, email: p.email });
  write(PROFILE_KEY, null);
  try {
    fetch('/api/remember', { method: 'DELETE' }).catch(() => {});
  } catch {}
}
export const loadLastDetails = () => read(LAST_KEY);

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

// ---- מטבעות ----
// history: [{ date, amount, reason }]
export function loadWallet() {
  return read(WALLET_KEY) || { coins: START_COINS, history: [] };
}
export const saveWallet = (wallet) => write(WALLET_KEY, wallet);

// מוסיף מטבעות על סיום הרפתקה. tripId מונע זיכוי כפול של אותה הרפתקה.
export function awardAdventure(tripId, title) {
  const wallet = loadWallet();
  if (wallet.history.some((h) => h.tripId === tripId)) return wallet;
  const next = {
    coins: wallet.coins + ADVENTURE_REWARD,
    history: [{ date: Date.now(), amount: ADVENTURE_REWARD, reason: title, tripId }, ...wallet.history],
  };
  write(WALLET_KEY, next);
  return next;
}
