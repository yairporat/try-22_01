// אייקון קטן לסוג המקום: טיפה למעיין, עין לתצפית, שביל למסלול, עמודים להיסטוריה

export default function TypeIcon({ type, size = 14 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (type === 'מעיין') return <svg {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></svg>;
  if (type === 'תצפית') return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
  if (type === 'מסלול') return <svg {...p}><path d="M6 21c0-4 4-5 6-8s0-6 4-9" /><circle cx="6" cy="21" r="1" /><circle cx="16" cy="4" r="1" /></svg>;
  return <svg {...p}><path d="M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M3 10l9-6 9 6z" /></svg>;
}
