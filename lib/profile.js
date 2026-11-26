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
  return profile;
}

export function updateProfile(changes) {
  const profile = { ...loadProfile(), ...changes };
  write(PROFILE_KEY, profile);
  return profile;
}

export const logout = () => write(PROFILE_KEY, null);

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

// ---- מטבעות ----
// history: [{ date, amount, reason }]
export function loadWallet() {
  return read(WALLET_KEY) || { coins: START_COINS, history: [] };
}

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
