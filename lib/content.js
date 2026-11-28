// התוכן שהמנהל עורך: מקומות, הרפתקאות, טקסטים באתר ותמונות.
// עם Supabase – נשמר בטבלאות places, curated_adventures ו-site_texts (ראו supabase/migrations/003_admin.sql)
// ותמונות בדלי "images". בלי Supabase – בקבצים בתיקייה data/admin (מתאים רק להרצה במחשב:
// ב-Vercel הקבצים נמחקים מדי פעם, ולכן שם צריך Supabase).

import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { hasSupabase, sb, uploadToStorage } from './db.js';
import { dataFile } from './storage.js';

const READ_ONLY_HOST = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

// איפה נשמר: 'supabase' | 'local' (במחשב) | 'temporary' (שרת בלי Supabase – לא נשמר לאורך זמן)
export const storageMode = hasSupabase ? 'supabase' : READ_ONLY_HOST ? 'temporary' : 'local';

// ---- קבצים מקומיים ----
async function readJson(name, fallback) {
  try {
    return JSON.parse(await readFile(await dataFile('admin', name), 'utf8'));
  } catch {
    return fallback;
  }
}
async function writeJson(name, value) {
  await writeFile(await dataFile('admin', name), JSON.stringify(value, null, 2) + '\n');
}

// ---- מטמון קצר, כדי לא לפנות ל-Supabase בכל בקשה ----
const CACHE_MS = 20000;
const cache = {};
async function cached(key, load) {
  const c = cache[key];
  if (c && Date.now() - c.at < CACHE_MS) return c.value;
  const value = await load();
  cache[key] = { at: Date.now(), value };
  return value;
}
const invalidate = (key) => delete cache[key];

// ======================= מקומות =======================
// שורה בטבלה <-> מקום באפליקציה (אותם שדות כמו ב-places.json)
const placeFromRow = (r) => {
  const p = {
    id: r.id,
    name: r.name,
    region: r.region,
    type: r.type,
    difficulty: r.difficulty,
    visitMinutes: r.visit_minutes,
    description: r.description || '',
    hours: r.hours || '',
    tips: r.tips || '',
    parking: r.parking || '',
    equipment: r.equipment || '',
    directions: r.directions || '',
    season: r.season || '',
    notes: r.notes || '',
    spotLocation: r.spot_location || '',
    location: r.location || '',
    image: r.image || '',
  };
  if (typeof r.lat === 'number' && typeof r.lng === 'number') Object.assign(p, { lat: r.lat, lng: r.lng });
  if (r.gallery_images?.length) p.gallery = r.gallery_images;
  if (r.arrival_radius_m) p.radius = r.arrival_radius_m;
  if (r.recommended) p.recommended = true;
  if (r.way_stop) p.wayStop = true;
  if (typeof r.spot_lat === 'number' && typeof r.spot_lng === 'number') Object.assign(p, { spotLat: r.spot_lat, spotLng: r.spot_lng });
  if (r.roads) p.roads = r.roads;
  if (r.hidden) p.hidden = true;
  return p;
};
const placeToRow = (p, sort = 0) => ({
  id: p.id,
  name: p.name,
  region: p.region,
  type: p.type,
  difficulty: p.difficulty,
  visit_minutes: Number(p.visitMinutes) || 60,
  description: p.description || '',
  hours: p.hours || '',
  tips: p.tips || '',
  parking: p.parking || '',
  equipment: p.equipment || '',
  directions: p.directions || '',
  season: p.season || '',
  notes: p.notes || '',
  spot_location: p.spotLocation || '',
  spot_lat: typeof p.spotLat === 'number' ? p.spotLat : null,
  spot_lng: typeof p.spotLng === 'number' ? p.spotLng : null,
  location: p.location || '',
  lat: typeof p.lat === 'number' ? p.lat : null,
  lng: typeof p.lng === 'number' ? p.lng : null,
  image: p.image || '',
  gallery_images: p.gallery || [],
  arrival_radius_m: p.radius || null,
  recommended: !!p.recommended,
  hidden: !!p.hidden,
  way_stop: !!p.wayStop,
  roads: p.roads || '',
  sort,
  updated_at: new Date().toISOString(),
});

// שמירה בטבלה. עמודות שעוד לא קיימות (לא הורצו 004/005) – שומרים בלעדיהן, ומדווחים למנהל
export let missingColumns = [];
export let wayColumnsMissing = false;
async function upsertPlaces(rows) {
  let body = rows;
  const dropped = [];
  for (let i = 0; i < 12; i++) {
    try {
      await sb('POST', 'places', { query: '?on_conflict=id', body });
      missingColumns = dropped;
      wayColumnsMissing = dropped.includes('way_stop') || dropped.includes('roads');
      return;
    } catch (e) {
      const col = /'([a-z_]+)' column/.exec(e.message)?.[1] || /column "?([a-z_]+)"? of relation/.exec(e.message)?.[1];
      if (!col || !(col in body[0])) throw e;
      dropped.push(col);
      body = body.map(({ [col]: _, ...r }) => r);
    }
  }
}

// null = המנהל עוד לא העביר את המקומות לעריכה באתר (ואז קוראים מהטבלה/מהקובץ כמו קודם)
export async function loadAdminPlaces() {
  return cached('places', async () => {
    if (hasSupabase) {
      try {
        const rows = await sb('GET', 'places', { query: '?select=*&order=sort.asc,name.asc' });
        return rows.length ? rows.map(placeFromRow) : null;
      } catch (e) {
        console.error('⚠️ לא הצלחתי לקרוא מקומות מ-Supabase:', e.message);
        return null;
      }
    }
    return readJson('places.json', null);
  });
}

export async function savePlace(place) {
  const p = { ...place, id: place.id || `place-${randomUUID().slice(0, 8)}` };
  if (hasSupabase) {
    const existing = await sb('GET', 'places', { query: `?select=sort&id=eq.${encodeURIComponent(p.id)}` });
    let sort = existing[0]?.sort;
    if (sort === undefined) {
      const last = await sb('GET', 'places', { query: '?select=sort&order=sort.desc&limit=1' });
      sort = (last[0]?.sort || 0) + 1;
    }
    await upsertPlaces([placeToRow(p, sort)]);
  } else {
    const all = (await readJson('places.json', null)) || [];
    const i = all.findIndex((x) => x.id === p.id);
    if (i >= 0) all[i] = p;
    else all.push(p);
    await writeJson('places.json', all);
  }
  invalidate('places');
  return p;
}

export async function deletePlace(id) {
  if (hasSupabase) await sb('DELETE', 'places', { query: `?id=eq.${encodeURIComponent(id)}`, prefer: 'return=minimal' });
  else await writeJson('places.json', ((await readJson('places.json', null)) || []).filter((p) => p.id !== id));
  invalidate('places');
}

// ======================= הרפתקאות שבונים =======================
const advFromRow = (r) => ({ id: r.id, name: r.name, description: r.description || '', image: r.image || '', show: r.show !== false, stops: r.stops || [] });
const advToRow = (a, sort = 0) => ({
  id: a.id,
  name: a.name,
  description: a.description || '',
  image: a.image || '',
  show: a.show !== false,
  stops: a.stops || [],
  sort,
  updated_at: new Date().toISOString(),
});

export async function loadAdminCurated() {
  return cached('curated', async () => {
    if (hasSupabase) {
      try {
        const rows = await sb('GET', 'curated_adventures', { query: '?select=*&order=sort.asc' });
        return rows.length ? rows.map(advFromRow) : null;
      } catch (e) {
        console.error('⚠️ לא הצלחתי לקרוא הרפתקאות מ-Supabase:', e.message);
        return null;
      }
    }
    return readJson('adventures.json', null);
  });
}

export async function saveCurated(adv) {
  const a = { ...adv, id: adv.id || `adv-${randomUUID().slice(0, 8)}` };
  if (hasSupabase) {
    const existing = await sb('GET', 'curated_adventures', { query: `?select=sort&id=eq.${encodeURIComponent(a.id)}` });
    let sort = existing[0]?.sort;
    if (sort === undefined) {
      const last = await sb('GET', 'curated_adventures', { query: '?select=sort&order=sort.desc&limit=1' });
      sort = (last[0]?.sort || 0) + 1;
    }
    await sb('POST', 'curated_adventures', { query: '?on_conflict=id', body: advToRow(a, sort) });
  } else {
    const all = (await readJson('adventures.json', null)) || [];
    const i = all.findIndex((x) => x.id === a.id);
    if (i >= 0) all[i] = a;
    else all.push(a);
    await writeJson('adventures.json', all);
  }
  invalidate('curated');
  return a;
}

export async function deleteCurated(id) {
  if (hasSupabase) await sb('DELETE', 'curated_adventures', { query: `?id=eq.${encodeURIComponent(id)}`, prefer: 'return=minimal' });
  else await writeJson('adventures.json', ((await readJson('adventures.json', null)) || []).filter((a) => a.id !== id));
  invalidate('curated');
}

// סדר ההרפתקאות במסך הבית (ids לפי הסדר החדש)
export async function reorderCurated(ids) {
  if (hasSupabase) {
    await Promise.all(ids.map((id, i) => sb('PATCH', 'curated_adventures', { query: `?id=eq.${encodeURIComponent(id)}`, body: { sort: i }, prefer: 'return=minimal' })));
  } else {
    const all = (await readJson('adventures.json', null)) || [];
    all.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    await writeJson('adventures.json', all);
  }
  invalidate('curated');
}

// מעבר חד-פעמי: מעתיק את כל המקומות וההרפתקאות הקיימים (מהטבלה או מהקובץ) לעריכה באתר
export async function importAll(places, curated) {
  if (hasSupabase) {
    if (places.length) await upsertPlaces(places.map((p, i) => placeToRow(p, i)));
    if (curated.length) await sb('POST', 'curated_adventures', { query: '?on_conflict=id', body: curated.map((a, i) => advToRow(a, i)) });
  } else {
    await writeJson('places.json', places);
    await writeJson('adventures.json', curated.map(({ missing, ...a }) => a));
  }
  invalidate('places');
  invalidate('curated');
}

// ======================= טקסטים באתר =======================
// { key: value } – רק מה שהמנהל שינה. השאר נלקח מ-lib/texts.js
export async function loadTextOverrides() {
  return cached('texts', async () => {
    if (hasSupabase) {
      try {
        const rows = await sb('GET', 'site_texts', { query: '?select=key,value' });
        return Object.fromEntries(rows.map((r) => [r.key, r.value]));
      } catch (e) {
        console.error('⚠️ לא הצלחתי לקרוא טקסטים מ-Supabase:', e.message);
        return {};
      }
    }
    return readJson('texts.json', {});
  });
}

// value ריק = חזרה לטקסט המקורי
export async function saveText(key, value) {
  if (hasSupabase) {
    if (value === '' || value == null) await sb('DELETE', 'site_texts', { query: `?key=eq.${encodeURIComponent(key)}`, prefer: 'return=minimal' });
    else await sb('POST', 'site_texts', { query: '?on_conflict=key', body: { key, value, updated_at: new Date().toISOString() } });
  } else {
    const all = await readJson('texts.json', {});
    if (value === '' || value == null) delete all[key];
    else all[key] = value;
    await writeJson('texts.json', all);
  }
  invalidate('texts');
}

// ======================= תמונות =======================
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

export async function saveImage(file) {
  const ext = EXT[file.type];
  if (!ext) throw new Error('אפשר להעלות רק תמונות (jpg, png, webp, gif)');
  if (file.size > 8 * 1024 * 1024) throw new Error('התמונה גדולה מדי (עד 8MB)');
  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${new Date().toISOString().slice(0, 10)}/${randomUUID().slice(0, 12)}.${ext}`;
  if (hasSupabase) return uploadToStorage(name, bytes, file.type);
  if (READ_ONLY_HOST) throw new Error('כדי להעלות תמונות באתר שבאוויר צריך לחבר Supabase (ראו README)');
  // במחשב: שומרים בתיקייה public/uploads
  const { mkdir } = await import('fs/promises');
  const dest = path.join(process.cwd(), 'public', 'uploads', name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  return `/uploads/${name}`;
}
