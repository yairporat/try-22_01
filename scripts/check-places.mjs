// בדיקת קובץ המקומות: npm run check-places
import { readFileSync } from 'fs';
import { validatePlaces, findAdventure, REGIONS, LEVELS } from '../lib/adventure.js';

let places;
try {
  places = JSON.parse(readFileSync(new URL('../data/places.json', import.meta.url), 'utf8'));
} catch (e) {
  console.error('❌ הקובץ data/places.json לא תקין. בדרך כלל זה פסיק חסר או מיותר, או מירכאות חסרות.');
  console.error('   ' + e.message);
  process.exit(1);
}

const errors = validatePlaces(places);
if (errors.length) {
  console.error(`❌ נמצאו ${errors.length} שגיאות:`);
  errors.forEach((e) => console.error('   - ' + e));
  process.exit(1);
}

console.log(`✅ הקובץ תקין: ${places.length} מקומות\n`);
for (const r of REGIONS) {
  const inRegion = places.filter((p) => p.region === r);
  const byLevel = LEVELS.map((l) => `${l}: ${inRegion.filter((p) => p.difficulty === l).length}`).join(', ');
  const warn = inRegion.length < 3 ? '   ⚠️ מעט מקומות, ההרפתקאות כאן יהיו קצרות' : '';
  console.log(`${r} – ${inRegion.length} מקומות (${byLevel})${warn}`);
}

const sample = findAdventure(places, { mode: 'custom', region: 'גולן', duration: 'חצי יום', level: 'בינוני' });
console.log(`\nדוגמה (גולן, חצי יום, בינוני): ${sample.title}`);
sample.stops.forEach((s, i) => console.log(`   ${i + 1}. ${s.name} (${s.visitTime})`));
