'use client';

// מסך הבית – לפי עיצוב הרפרנס: ברכה, כותרת גדולה וקרוסלה של הרפתקאות מומלצות עם תמונות,
// ומתחת גיליון לבן עם האזורים, המקומות המדורגים וההמלצות של המטיילים.
// הרפתקה חדשה – בכפתור העגול שבאמצע הסרגל התחתון.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { REGIONS } from '../lib/adventure';
import { restoreProfile, loadWallet, START_COINS } from '../lib/profile';
import TabBar from '../components/TabBar';
import { T, useSite } from '../components/Site';

const REGION_ICON = {
  'גולן': '⛰️',
  'גליל עליון': '🌲',
  'גליל תחתון': '🌾',
  'מרכז': '🏙️',
  'שפלה': '🌳',
  'מדבר יהודה': '🏜️',
  'נגב': '🐪',
};

export default function Home() {
  const router = useRouter();
  const { t, editMode } = useSite();
  const [curated, setCurated] = useState(null);
  const [ratings, setRatings] = useState({ places: {}, adventures: {} });
  const [places, setPlaces] = useState([]);
  const [reviews, setReviews] = useState([]);
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
    fetch('/api/places?all=1').then((r) => r.json()).then(setPlaces).catch(() => {});
    fetch('/api/reviews').then((r) => r.json()).then((d) => setReviews(d.reviews || [])).catch(() => {});
  }, [router]);

  const covers = [t('img.cover1'), t('img.cover2'), t('img.cover3')].filter(Boolean);
  const placeById = Object.fromEntries(places.map((p) => [p.id, p]));
  // המקומות עם הדירוג הממוצע הגבוה ביותר
  const topPlaces = Object.entries(ratings.places || {})
    .filter(([id]) => placeById[id])
    .sort((a, b) => b[1].avg - a[1].avg || b[1].count - a[1].count)
    .slice(0, 6)
    .map(([id, r]) => ({ ...placeById[id], ...r }));
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
                    {r ? (
                      <>
                        <img src="/phoenix-pin.png" alt="" className="pin" />
                        <b>{r.avg}</b> ({r.count}) ·{' '}
                      </>
                    ) : null}
                    {c.region} · {c.duration}
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
        <T k="home.regionsTitle" as="h2" className="sheetTitle" />
        <div className="regions">
          {REGIONS.map((r) => (
            <button key={r} type="button" className="region" onClick={() => router.push(`/new?region=${encodeURIComponent(r)}`)}>
              <span className="ricon" aria-hidden="true">
                {REGION_ICON[r]}
              </span>
              <span className="rname">{r}</span>
            </button>
          ))}
        </div>

        {topPlaces.length > 0 && (
          <>
            <T k="home.topPlacesTitle" as="h2" className="sectionTitle" />
            <div className="top-places">
              {topPlaces.map((p, i) => (
                <button key={p.id} type="button" className="tp" onClick={() => router.push(`/adventure?id=${encodeURIComponent(p.id)}`)}>
                  <span className="tpPic" style={{ backgroundImage: `url(${p.image || covers[i % covers.length]})` }} />
                  <span className="tpName">{p.name}</span>
                  <span className="tpMeta">
                    <img src="/phoenix-pin.png" alt="" className="pin" />
                    <b>{p.avg}</b> ({p.count}) · {p.region}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {reviews.length > 0 && (
          <>
            <T k="adventure.reviewsTitle" as="h2" className="sectionTitle" />
            <ul className="reviews">
              {reviews.slice(0, 5).map((r) => (
                <li key={r.id} className="review">
                  <div className="rvTop">
                    <b>{r.name}</b>
                    <span className="rvPlace">{placeById[r.placeId]?.name || ''}</span>
                    {r.rating ? (
                      <span className="rvRate">
                        <img src="/phoenix-pin.png" alt="" className="pin" />
                        {r.rating}/5
                      </span>
                    ) : null}
                  </div>
                  <p className="rvText">{r.text}</p>
                </li>
              ))}
            </ul>
          </>
        )}
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

        .sheet { max-width: 520px; margin: 6px auto 0; background: #fff; border-radius: 32px 32px 0 0; padding: 10px 0 130px; box-shadow: 0 -8px 30px rgba(20,33,61,.06); display: flex; flex-direction: column; gap: 14px; min-height: 40dvh; box-sizing: border-box; }
        .handle { width: 46px; height: 5px; border-radius: 3px; background: #D5DFEB; align-self: center; }
        .sheetTitle { margin: 6px 0 0; font-size: 20px; font-weight: 800; text-align: center; }
        .regions { display: flex; gap: 14px; overflow-x: auto; padding: 4px 24px 8px; scrollbar-width: none; }
        .regions::-webkit-scrollbar { display: none; }
        .region { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 8px; background: none; border: 0; cursor: pointer; padding: 0; width: 76px; }
        .ricon { width: 64px; height: 64px; border-radius: 50%; background: #fff; box-shadow: 0 6px 16px rgba(20,33,61,.10); display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .rname { font-size: 13px; color: #3A4658; text-align: center; }
        .sectionTitle { margin: 8px 24px 0; font-size: 17px; font-weight: 700; }

        .top-places { display: flex; gap: 12px; overflow-x: auto; padding: 0 24px 6px; scrollbar-width: none; }
        .top-places::-webkit-scrollbar { display: none; }
        .tp { flex: 0 0 150px; background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 8px; display: flex; flex-direction: column; gap: 6px; text-align: start; cursor: pointer; }
        .tpPic { height: 90px; border-radius: 14px; background: #DCEAFB center / cover no-repeat; }
        .tpName { font-size: 14px; font-weight: 600; padding: 0 2px; }
        .tpMeta { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 3px; padding: 0 2px 2px; }

        .reviews { list-style: none; margin: 0; padding: 0 24px; display: grid; gap: 10px; }
        .review { background: #F6F9FC; border-radius: 18px; padding: 12px 14px; }
        .rvTop { display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .rvPlace { color: var(--muted); font-size: 13px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rvRate { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; color: #B4470F; font-weight: 600; }
        .rvText { margin: 6px 0 0; font-size: 14px; line-height: 1.5; color: #3A4658; }

        .card:focus-visible .pic, .region:focus-visible .ricon, .tp:focus-visible, .points:focus-visible { outline: 3px solid var(--orange); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
      `}</style>
    </div>
  );
}
