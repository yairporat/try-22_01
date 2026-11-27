-- THV: פרופיל ונקודות, הישגים, מועדפים ודירוג ממוצע ציבורי.

-- פרופיל לכל משתמש (נוצר בהרשמה דרך Supabase Auth), עם 100 נקודות פתיחה
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  points int not null default 100,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
drop policy if exists "profiles: own row" on profiles;
create policy "profiles: own row" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- הישגים: כל הישג פעם אחת בלבד לכל משתמש
create table if not exists user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table user_achievements enable row level security;
drop policy if exists "achievements: read own" on user_achievements;
create policy "achievements: read own" on user_achievements for select using (auth.uid() = user_id);

-- זיכוי הישג בעסקה אחת: רושמים את ההישג ומוסיפים 50 נקודות, רק אם עוד לא נרשם
create or replace function award_achievement(p_achievement text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into user_achievements (user_id, achievement_id) values (auth.uid(), p_achievement);
  update profiles set points = points + 50 where id = auth.uid();
  return true;
exception when unique_violation then
  return false;
end $$;

-- מועדפים
create table if not exists favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  adventure_key text not null,
  title text,
  created_at timestamptz not null default now(),
  primary key (user_id, adventure_key)
);
alter table favorites enable row level security;
drop policy if exists "favorites: own rows" on favorites;
create policy "favorites: own rows" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- דירוג ממוצע ציבורי: רק הממוצע ומספר המדרגים, בלי הטקסט של הביקורות
create or replace view public_place_ratings as
  select place_id, round(avg(rating)::numeric, 1) as avg_rating, count(*) as ratings
  from stop_reviews where rating is not null group by place_id;
create or replace view public_adventure_ratings as
  select coalesce(adventure_ref, adventure_title) as adventure_key, round(avg(final_rating)::numeric, 1) as avg_rating, count(*) as ratings
  from adventure_runs where final_rating is not null group by 1;
grant select on public_place_ratings, public_adventure_ratings to anon, authenticated;
