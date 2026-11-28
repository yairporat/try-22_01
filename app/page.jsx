'use client';

// מסך הבית – לפי עיצוב הרפרנס: ברכה, כותרת גדולה וקרוסלה של הרפתקאות מומלצות עם תמונות,
// ומתחת גיליון לבן עם האזורים, המקומות המדורגים וההמלצות של המטיילים.
// הרפתקה חדשה – בכפתור העגול שבאמצע הסרגל התחתון.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { restoreProfile, loadWallet, START_COINS } from '../lib/profile';
import TabBar from '../components/TabBar';
import { T, useSite } from '../components/Site';
import Birds from '../components/Birds';
import { activeTrip } from '../lib/history';


export default function Home() {
  const router = useRouter();
  const { t, editMode } = useSite();
  const [curated, setCurated] = useState(null);
  const [ratings, setRatings] = useState({ places: {}, adventures: {} });
  const [trip, setTrip] = useState(null); // הרפתקה שעצרתי באמצע
  const [userName, setUserName] = useState('');
  const [coins, setCoins] = useState(START_COINS);

  useEffect(() => {
    // משתמש חדש – קודם מסך הפתיחה וההרשמה. מי שכבר נרשם נכנס ישר
    restoreProfile().then((p) => {
      if (!p) router.replace('/welcome');
      else setUserName(p.name || '');
    });
    setCoins(loadWallet().coins);
    fetch('/api/curated').then((r) => r.json()).then(setCurated).catch(() => setCurated([]));
    fetch('/api/ratings').then((r) => r.json()).then(setRatings).catch(() => {});
    setTrip(activeTrip());
  }, [router]);

  const covers = [t('img.cover1'), t('img.cover2'), t('img.cover3')].filter(Boolean);
  const firstName = userName.trim().split(/\s+/)[0];

  return (
    <div dir="rtl" className="app">
      <main className="screen">
        <header className="top">
          <div>
            <p className="hello">
              <T k="home.hello" /> {firstName || 'מטייל'}
            </p>
            <T k="home.title" as="h1" className="title" />
          </div>
          <button type="button" className="points" onClick={() => router.push('/profile')} aria-label={`${coins} מטבעות`}>
            <img src="/coin.png" alt="" />
            {coins}
          </button>
        </header>

        {curated === null ? (
          <div className="cards" aria-hidden="true">
            <div className="card skeleton" />
            <div className="card skeleton" />
          </div>
        ) : curated.length ? (
          <div className="cards" aria-label="הרפתקאות מומלצות">
            {curated.map((c, i) => {
              const img = c.image || covers[i % covers.length];
              const r = ratings.adventures?.[c.id];
              return (
                <button key={c.id} type="button" className="card" onClick={() => router.push(`/adventure?curated=${encodeURIComponent(c.id)}`)}>
                  <span className="pic" style={{ backgroundImage: `url(${img})` }}>
                    <span className="badge">{c.stopCount} תחנות</span>
                  </span>
                  <span className="cname">{c.name}</span>
                  <span className="cmeta">
                    {r ? <Birds value={r.avg} size={15} /> : null}
                    <span>
                      {c.region} · {c.duration}
                    </span>
                  </span>
                </button>
              );
            })}
            {editMode && (
              <a className="card add" href="/admin?tab=adventures">
                <span className="pic addPic">+</span>
                <span className="cname">הוספת הרפתקה</span>
              </a>
            )}
          </div>
        ) : (
          <T k="home.empty" as="p" className="empty" />
        )}
      </main>

      <section className="sheet">
        <div className="handle" aria-hidden="true" />
        {trip && (
          <button type="button" className="resume" onClick={() => router.push('/adventure/go')}>
            <span className="resumeIcon" aria-hidden="true">▶</span>
            <span className="resumeText">
              <T k="home.resume" as="b" />
              <span>
                {trip.adventure.title} · {trip.adventure.stops.filter((x) => trip.verified?.[x.id]).length}/{trip.adventure.stops.length} תחנות
              </span>
            </span>
            <span className="resumeGo">להמשיך ›</span>
          </button>
        )}
        <button type="button" className="bigNew" onClick={() => router.push('/new')}>
          <span className="bigPlus" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="bigText">
            <T k="home.newButton" as="b" className="bigTitle" />
            <T k="home.newButtonSub" className="bigSub" />
          </span>
        </button>
      </section>

      <TabBar active="home" />

      <style>{`
        :root { --bg:#EEF4FB; --ink:#14213D; --muted:#5B6677; --blue:#1E6FD9; --orange:#F26B1D; --line:#E3EAF3; }
        html, body { margin: 0; background: var(--bg); color: var(--ink); }
        button { font: inherit; color: inherit; }
        .app { min-height: 100dvh; font-family: "Rubik", system-ui, -apple-system, sans-serif; background: linear-gradient(180deg, #F3E9FB 0%, #EAF2FE 45%, #EEF4FB 100%); }
        .screen { max-width: 520px; margin: 0 auto; padding: 28px 0 8px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; }

        .top { display: flex; align-items: flex-start; justify-content: space-between; padding: 0 24px; gap: 12px; }
        .hello { margin: 0 0 4px; font-size: 17px; color: var(--blue); font-weight: 500; }
        .title { margin: 0; font-size: 30px; line-height: 1.15; font-weight: 800; letter-spacing: -.3px; }
        .points { display: flex; align-items: center; gap: 6px; background: #fff; color: #B4470F; border: 0; border-radius: 999px; padding: 6px 12px 6px 8px; font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; box-shadow: 0 4px 14px rgba(20,33,61,.08); cursor: pointer; margin-top: 4px; }
        .points img { width: 26px; height: 26px; object-fit: contain; }

        .cards { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 4px 24px 10px; scrollbar-width: none; }
        .cards::-webkit-scrollbar { display: none; }
        .card { flex: 0 0 72%; max-width: 300px; scroll-snap-align: start; background: none; border: 0; padding: 0; text-align: start; display: flex; flex-direction: column; gap: 8px; cursor: pointer; text-decoration: none; color: inherit; }
        .pic { display: block; position: relative; aspect-ratio: 1 / 0.82; border-radius: 26px; background: #DCEAFB center / cover no-repeat; box-shadow: 0 14px 30px rgba(20,33,61,.16); }
        .badge { position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,.92); border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #B4470F; }
        .cname { font-size: 17px; font-weight: 600; padding: 0 4px; }
        .cmeta { font-size: 13px; color: var(--muted); padding: 0 4px; display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
        .cmeta b, .tpMeta b { color: var(--ink); }
        .pin { width: 16px; height: 16px; object-fit: contain; }
        .skeleton { aspect-ratio: 1 / 0.82; border-radius: 26px; background: linear-gradient(90deg, #E3EAF3, #F3F6FA, #E3EAF3); background-size: 200% 100%; animation: sk 1.2s linear infinite; }
        @keyframes sk { to { background-position: -200% 0; } }
        .addPic { display: flex !important; align-items: center; justify-content: center; font-size: 48px; color: var(--orange); background: #fff; border: 3px dashed #F7B48A; box-shadow: none; }
        .empty { margin: 0 24px; padding: 24px; background: #fff; border-radius: 22px; color: var(--muted); text-align: center; }

        .sheet { max-width: 520px; margin: 6px auto 0; background: #fff; border-radius: 32px 32px 0 0; padding: 10px 22px 130px; box-shadow: 0 -8px 30px rgba(20,33,61,.06); display: flex; flex-direction: column; gap: 14px; min-height: 34dvh; box-sizing: border-box; }
        .handle { width: 46px; height: 5px; border-radius: 3px; background: #D5DFEB; align-self: center; }
        .bigNew { display: flex; align-items: center; gap: 16px; width: 100%; min-height: 104px; margin-top: 8px; padding: 18px 20px; border: 0; border-radius: 28px; background: linear-gradient(150deg, #F7893F, #F26B1D 60%, #E05A10); color: #fff; text-align: start; cursor: pointer; box-shadow: 0 8px 0 #B8490C, 0 16px 30px rgba(242,107,29,.30); }
        .bigNew:active { transform: translateY(3px); box-shadow: 0 5px 0 #B8490C, 0 10px 20px rgba(242,107,29,.30); }
        .bigPlus { width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,.22); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
        .bigText { display: grid; gap: 4px; }
        .bigTitle { font-size: 22px; font-weight: 800; }
        .bigSub { font-size: 14px; opacity: .92; }
        .resume { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 2px solid #BBD4F7; border-radius: 20px; background: #EAF2FE; color: var(--ink); text-align: start; cursor: pointer; }
        .resumeIcon { width: 38px; height: 38px; border-radius: 50%; background: var(--blue); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; flex: 0 0 auto; }
        .resumeText { flex: 1; min-width: 0; display: grid; gap: 2px; font-size: 13px; color: var(--muted); }
        .resumeText b { font-size: 15px; color: var(--ink); }
        .resumeGo { color: var(--blue); font-weight: 700; font-size: 14px; }
        .bigNew:focus-visible, .resume:focus-visible { outline: 3px solid var(--blue); outline-offset: 3px; }
        .card:focus-visible .pic, .points:focus-visible { outline: 3px solid var(--orange); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
      `}</style>
    </div>
  );
}
