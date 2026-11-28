'use client';

// חזרה אחורה רק בכפתור "חזרה" של האפליקציה, לא בהחלקה מהקצה של הדפדפן.
// 1. מעברי מסך לא נכנסים להיסטוריה של הדפדפן (pushState הופך ל-replaceState), אז להחלקה אחורה
//    אין לאן לחזור בתוך האתר. את רשימת המסכים שומרים בעצמנו (lib/nav.js).
// 2. overscroll-behavior-x: none – בלי "משיכה" הצידה בכרום/אנדרואיד.
// 3. מגע שמתחיל ממש בקצה המסך נחסם (עוזר בחלק מגרסאות ספארי).

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordNav } from '../lib/nav';

const EDGE = 18;

function Recorder() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const q = search?.toString();
    recordNav(q ? `${pathname}?${q}` : pathname);
  }, [pathname, search]);
  return null;
}

export default function EdgeSwipeGuard() {
  useEffect(() => {
    const h = window.history;
    if (!h.__thvPatched) {
      h.__thvPatched = true;
      h.pushState = function (state, title, url) {
        return h.replaceState(state, title, url);
      };
    }
    const onStart = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) e.preventDefault();
    };
    document.addEventListener('touchstart', onStart, { passive: false });
    return () => document.removeEventListener('touchstart', onStart);
  }, []);
  return (
    <>
      <style>{`html, body { overscroll-behavior-x: none; }`}</style>
      <Suspense fallback={null}>
        <Recorder />
      </Suspense>
    </>
  );
}
