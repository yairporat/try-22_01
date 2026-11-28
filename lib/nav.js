// ניווט "חזרה" של האפליקציה עצמה.
// הדפדפן לא שומר היסטוריה של המסכים באתר (ראו components/EdgeSwipeGuard.jsx), כדי שהחלקה מהקצה
// לא תחזיר מסך. במקום זה אנחנו שומרים כאן את רשימת המסכים, וכפתור "חזרה" חוזר למסך הקודם.

const KEY = 'thv-nav-stack';
let skipNext = false;

const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};
const write = (st) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(st.slice(-30)));
  } catch {}
};

// נקרא בכל מעבר מסך
export function recordNav(href) {
  const st = read();
  if (skipNext) {
    skipNext = false;
    if (st[st.length - 1] !== href) st.push(href);
    write(st);
    return;
  }
  if (st[st.length - 1] === href) return;
  // חזרה למסך שכבר ברשימה (למשל דרך הסרגל התחתון) – מקצרים את הרשימה עד אליו
  const i = st.lastIndexOf(href);
  if (i >= 0 && st.length - i <= 2) st.length = i + 1;
  else st.push(href);
  write(st);
}

export function navBack(router) {
  const st = read();
  st.pop();
  const prev = st[st.length - 1] || '/';
  write(st);
  skipNext = true;
  router.replace(prev);
}
