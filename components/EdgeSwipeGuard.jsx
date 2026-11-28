'use client';

// מונע את מחוות "החלקה מהקצה" של הדפדפן שמחזירה מסך אחורה (חזרה עושים בכפתור "חזרה").
// overscroll-behavior-x: none עוצר את זה בכרום/אנדרואיד; בספארי באייפון חוסמים מגע שמתחיל ממש בקצה המסך.
// הערה: בספארי אפל לא תמיד מאפשרת לאתר לבטל את המחווה לגמרי. באפליקציה שנוספה למסך הבית אין את המחווה הזו.

import { useEffect } from 'react';

const EDGE = 18;

export default function EdgeSwipeGuard() {
  useEffect(() => {
    const onStart = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) e.preventDefault();
    };
    document.addEventListener('touchstart', onStart, { passive: false });
    return () => document.removeEventListener('touchstart', onStart);
  }, []);
  return <style>{`html, body { overscroll-behavior-x: none; }`}</style>;
}
