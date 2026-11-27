-- THV: מצב מנהל (עריכת מקומות, הרפתקאות, טקסטים ותמונות) והמלצות גלויות לכולם.
-- מריצים פעם אחת ב-Supabase: SQL Editor > New query > מדביקים > Run.
-- (אם עוד לא הרצתם את 001 ו-002 – מריצים אותם קודם.)

-- 1. מקומות: הסתרה, סדר, ותאריך עדכון
alter table places add column if not exists hidden boolean not null default false;
alter table places add column if not exists sort int not null default 0;
alter table places add column if not exists updated_at timestamptz not null default now();

-- 2. הרפתקאות שבונים (מה שמוצג בכרטיסים במסך הבית)
create table if not exists curated_adventures (
  id text primary key,
  name text not null,
  description text not null default '',
  image text not null default '',
  show boolean not null default true,
  stops text[] not null default '{}',
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
alter table curated_adventures enable row level security;
drop policy if exists "curated: everyone reads" on curated_adventures;
create policy "curated: everyone reads" on curated_adventures for select using (true);

-- 3. טקסטים באתר שהמנהל שינה (השאר – הטקסט המקורי מהקוד)
create table if not exists site_texts (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table site_texts enable row level security;
drop policy if exists "texts: everyone reads" on site_texts;
create policy "texts: everyone reads" on site_texts for select using (true);

-- 4. המלצות: גלויות לכולם כברירת מחדל; המטייל יכול לבחור לא לשתף, והמנהל יכול להסתיר
alter table stop_reviews add column if not exists is_public boolean not null default true;
alter table stop_reviews add column if not exists hidden boolean not null default false;

-- 5. דלי תמונות ציבורי (ההעלאה עצמה נעשית רק דרך השרת, עם service role)
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;
