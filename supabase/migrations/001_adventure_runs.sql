-- THV: הרפתקאות של משתמשים, ביקורות לתחנות, וגלריית תמונות למקומות.
-- מריצים פעם אחת ב-Supabase: SQL Editor > New query > מדביקים > Run.

-- 1. מקומות: תמונות נוספות (בנוסף לתמונה הראשית) ורדיוס לאימות הגעה
create table if not exists places (
  id text primary key,
  name text not null,
  region text not null,
  type text not null,
  difficulty text not null,
  visit_minutes int not null,
  description text default '',
  location text default '',
  lat double precision,
  lng double precision,
  image text default '',
  gallery_images text[] not null default '{}',
  arrival_radius_m int,            -- ריק = 400 מטר
  parking text default '',
  equipment text default '',
  tips text default '',
  hours text default '',
  recommended boolean not null default false
);
alter table places add column if not exists gallery_images text[] not null default '{}';
alter table places add column if not exists arrival_radius_m int;

-- 2. הרפתקה של משתמש
do $$ begin
  create type run_status as enum ('active', 'completed', 'ended_early');
exception when duplicate_object then null; end $$;

create table if not exists adventure_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,  -- ריק כשאין עדיין התחברות דרך Supabase Auth
  user_name text,
  user_email text,
  adventure_title text not null,
  adventure_ref text,               -- מזהה הרפתקה מוכנה, אם יש
  stop_ids text[] not null,
  status run_status not null default 'active',
  current_index int not null default 0,
  early_end_reason text,
  final_rating int check (final_rating between 1 and 5),
  final_review text,
  points_awarded int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary_sent_at timestamptz
);

-- 3. ביקורת לתחנה
create table if not exists stop_reviews (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references adventure_runs (id) on delete cascade,
  place_id text not null,
  rating int check (rating between 1 and 5),   -- ריק = דילג על הדירוג
  review text,
  verified_at timestamptz not null default now(),
  verified_by text not null default 'gps' check (verified_by in ('gps', 'manual')),
  unique (run_id, place_id)
);

-- 4. הרשאות (RLS): כל משתמש רואה וכותב רק את הנתונים שלו.
--    השרת של האפליקציה עובד עם service role, שעוקף את ההרשאות האלה.
alter table adventure_runs enable row level security;
alter table stop_reviews enable row level security;
alter table places enable row level security;

drop policy if exists "runs: own rows" on adventure_runs;
create policy "runs: own rows" on adventure_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reviews: own runs" on stop_reviews;
create policy "reviews: own runs" on stop_reviews
  for all using (exists (select 1 from adventure_runs r where r.id = run_id and r.user_id = auth.uid()))
  with check (exists (select 1 from adventure_runs r where r.id = run_id and r.user_id = auth.uid()));

drop policy if exists "places: everyone reads" on places;
create policy "places: everyone reads" on places for select using (true);
