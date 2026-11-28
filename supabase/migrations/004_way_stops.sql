-- THV: "עצירה בדרך" – מקומות שהמנהל מסמן כמתאימים לעצירה בדרך, ועל אילו כבישים הם נמצאים.
-- מריצים פעם אחת ב-Supabase: SQL Editor > New query > מדביקים > Run.
alter table places add column if not exists way_stop boolean not null default false;
alter table places add column if not exists roads text not null default '';
