// שמירת "הרפתקאות של משתמשים" (adventure_runs) וביקורות לתחנות (stop_reviews).
// כשמוגדרים SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY – נשמר ב-Supabase.
// אחרת – בקובץ data/runs.json בפרויקט (כדי שהכל יעבוד גם בלי Supabase).

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = !!(SUPABASE_URL && SUPABASE_KEY);
const FILE = path.join(process.cwd(), 'data', 'runs.json');

// ---- Supabase (REST, בלי ספריות נוספות) ----
async function sb(method, table, { query = '', body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// ---- קובץ מקומי ----
async function readStore() {
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return { runs: [], reviews: [] };
  }
}
async function writeStore(store) {
  await writeFile(FILE, JSON.stringify(store, null, 2) + '\n');
}

export async function createRun(run) {
  const row = {
    id: randomUUID(),
    user_name: run.user_name || null,
    user_email: run.user_email || null,
    adventure_title: run.adventure_title,
    adventure_ref: run.adventure_ref || null,
    stop_ids: run.stop_ids,
    status: 'active',
    current_index: 0,
    started_at: new Date().toISOString(),
  };
  if (useSupabase) return (await sb('POST', 'adventure_runs', { body: row }))[0];
  const store = await readStore();
  store.runs.push(row);
  await writeStore(store);
  return row;
}

export async function getRun(id) {
  if (useSupabase) return (await sb('GET', 'adventure_runs', { query: `?id=eq.${encodeURIComponent(id)}` }))[0] || null;
  return (await readStore()).runs.find((r) => r.id === id) || null;
}

export async function updateRun(id, changes) {
  if (useSupabase) return (await sb('PATCH', 'adventure_runs', { query: `?id=eq.${encodeURIComponent(id)}`, body: changes }))[0];
  const store = await readStore();
  const run = store.runs.find((r) => r.id === id);
  if (!run) return null;
  Object.assign(run, changes);
  await writeStore(store);
  return run;
}

// ביקורת אחת לכל תחנה בהרפתקה (שמירה חוזרת מחליפה)
export async function saveStopReview(review) {
  const row = {
    run_id: review.run_id,
    place_id: review.place_id,
    rating: review.rating || null,
    review: review.review || null,
    verified_at: review.verified_at || new Date().toISOString(),
    verified_by: review.verified_by === 'manual' ? 'manual' : 'gps',
  };
  if (useSupabase) return (await sb('POST', 'stop_reviews', { query: '?on_conflict=run_id,place_id', body: row }))[0];
  const store = await readStore();
  store.reviews = store.reviews.filter((r) => !(r.run_id === row.run_id && r.place_id === row.place_id));
  store.reviews.push({ id: randomUUID(), ...row });
  await writeStore(store);
  return row;
}

export async function getStopReviews(runId) {
  if (useSupabase) return sb('GET', 'stop_reviews', { query: `?run_id=eq.${encodeURIComponent(runId)}&order=verified_at.asc` });
  return (await readStore()).reviews.filter((r) => r.run_id === runId);
}

// דירוג ממוצע ציבורי: ממוצע ומספר מדרגים לכל מקום ולכל הרפתקה (בלי הטקסט של הביקורות)
export async function getPublicRatings() {
  const round = (n) => Math.round(n * 10) / 10;
  if (useSupabase) {
    const [places, advs] = await Promise.all([sb('GET', 'public_place_ratings'), sb('GET', 'public_adventure_ratings')]);
    return {
      places: Object.fromEntries(places.map((r) => [r.place_id, { avg: Number(r.avg_rating), count: r.ratings }])),
      adventures: Object.fromEntries(advs.map((r) => [r.adventure_key, { avg: Number(r.avg_rating), count: r.ratings }])),
    };
  }
  const { runs, reviews } = await readStore();
  const agg = (pairs) => {
    const m = {};
    for (const [k, v] of pairs) {
      if (!v) continue;
      (m[k] ||= []).push(v);
    }
    return Object.fromEntries(Object.entries(m).map(([k, a]) => [k, { avg: round(a.reduce((x, y) => x + y, 0) / a.length), count: a.length }]));
  };
  return {
    places: agg(reviews.map((r) => [r.place_id, r.rating])),
    adventures: agg(runs.map((r) => [r.adventure_ref || r.adventure_title, r.final_rating])),
  };
}
