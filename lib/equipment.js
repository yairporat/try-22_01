// ציוד מומלץ לתחנה. אם בטבלה מילאו "ציוד מומלץ" – משתמשים בזה.
// אחרת – רשימה כללית לפי סוג המקום, רמת הקושי והאזור.

export function equipmentFor(stop) {
  if (stop.equipment) {
    return { items: stop.equipment.split(/[,\n،]/).map((s) => s.trim()).filter(Boolean), general: false };
  }
  const items = ['מים'];
  const hot = ['מדבר יהודה', 'נגב'].includes(stop.region);
  if (stop.difficulty === 'מאתגר') items[0] = 'לפחות 3 ליטר מים לאדם';
  else if (hot) items[0] = 'לפחות 2 ליטר מים לאדם';
  if (stop.type === 'מעיין') items.push('נעליים שמתאימות למים', 'בגד ים ומגבת');
  if (stop.type === 'מסלול' || stop.difficulty !== 'קל') items.push('נעלי הליכה סגורות');
  if (hot || stop.type === 'מסלול' || stop.type === 'תצפית') items.push('כובע וקרם הגנה');
  if (stop.difficulty === 'מאתגר') items.push('אוכל אנרגטי', 'טלפון טעון');
  return { items: [...new Set(items)], general: true };
}
