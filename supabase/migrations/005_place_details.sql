-- THV: פרטים נוספים על כל מקום: איך מגיעים, עונה/זמן מומלץ, הערות, ומיקום המקום עצמו (בנוסף לחניה).
-- מריצים פעם אחת ב-Supabase: SQL Editor > New query > מדביקים > Run.
alter table places add column if not exists directions text not null default '';
alter table places add column if not exists season text not null default '';
alter table places add column if not exists notes text not null default '';
alter table places add column if not exists spot_location text not null default '';
alter table places add column if not exists spot_lat double precision;
alter table places add column if not exists spot_lng double precision;
