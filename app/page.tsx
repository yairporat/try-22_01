"use client";

// מסך הבית – לפי העיצוב "THE HIDDEN VALLEY – מסך ראשי"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { REGIONS, DURATIONS, LEVELS } from "../lib/adventure";
import { loadProfile, loadWallet, START_COINS } from "../lib/profile";
import { CITIES, MY_LOCATION, loadOriginChoice, saveOriginChoice } from "../lib/origin";

type Mode = "surprise" | "custom" | null;
type Recommended = { id: string; name: string; image: string; region: string; type: string };

// רקע לכרטיס מומלץ בלי תמונה, לפי האזור
const REGION_BG: Record<string, string> = {
  "גולן": "linear-gradient(160deg,#7CC4F5,#2E8B57)",
  "גליל עליון": "linear-gradient(160deg,#9BD8F0,#3BA37A)",
  "גליל תחתון": "linear-gradient(160deg,#A9DCF2,#5BAA6B)",
  "מרכז": "linear-gradient(160deg,#B8E0F7,#4F9BD9)",
  "שפלה": "linear-gradient(160deg,#F3E2B8,#8DB36B)",
  "מדבר יהודה": "linear-gradient(160deg,#FBE3B8,#D9894A)",
  "נגב": "linear-gradient(160deg,#FCD9A8,#E07B3C)",
};

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [region, setRegion] = useState("");
  const [duration, setDuration] = useState("");
  const [level, setLevel] = useState("");
  const [recommended, setRecommended] = useState<Recommended[]>([]);
  const [userName, setUserName] = useState("");
  const [coins, setCoins] = useState(START_COINS);
  const [originChoice, setOriginChoice] = useState(MY_LOCATION);

  useEffect(() => {
    setUserName(loadProfile()?.name || "");
    setCoins(loadWallet().coins);
    setOriginChoice(loadOriginChoice());
    // הרפתקאות מומלצות: המקומות שמסומנים "מומלץ: כן" בטבלה
    fetch("/api/places")
      .then((res) => res.json())
      .then(setRecommended)
      .catch(() => setRecommended([]));
  }, []);

  const ready = mode === "surprise" || (mode === "custom" && region !== "" && duration !== "" && level !== "");

  function findAdventure() {
    if (!ready) return;
    const params = new URLSearchParams({ mode: mode ?? "surprise" });
    if (mode === "custom") {
      params.set("region", region);
      params.set("duration", duration);
      params.set("level", level);
    }
    router.push(`/adventure?${params.toString()}`);
  }

  const chips = (list: string[], value: string, set: (v: string) => void) =>
    list.map((label) => (
      <button key={label} type="button" className={`chip${value === label ? " on" : ""}`} aria-pressed={value === label} onClick={() => set(label)}>
        {label}
      </button>
    ));

  return (
    <div dir="rtl" className="app">
      <main className="screen">
        <header className="top">
          <div className="who">
            <div className="avatar" aria-hidden="true">
              {userName ? userName.trim()[0] : <img src="/phoenix-pin.png" alt="" />}
            </div>
            <div className="names">
              <span className="hello">{userName ? "ברוך שובך" : "שלום"}</span>
              <span className="name">{userName || "מטייל"}</span>
            </div>
          </div>
          <div className="points" aria-label={`${coins} מטבעות`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v10M9 10h6" />
            </svg>
            {coins} נק׳
          </div>
        </header>

        <section className="hero">
          <div className="bird">
            <img src="/phoenix-pin.png" alt="THV" />
          </div>
          <h1 className="q">לאן יוצאים היום?</h1>

          <label className="origin">
            <span aria-hidden="true">📍</span>
            <span>יוצאים מ:</span>
            <select
              value={originChoice}
              onChange={(e) => {
                setOriginChoice(e.target.value);
                saveOriginChoice(e.target.value);
              }}
              aria-label="מאיפה יוצאים להרפתקה"
            >
              <option value={MY_LOCATION}>המיקום שלי עכשיו</option>
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="tiles">
            <button type="button" className={`tile${mode === "surprise" ? " on" : ""}`} aria-pressed={mode === "surprise"} onClick={() => setMode("surprise")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />
              </svg>
              <span>הפתע אותי</span>
            </button>
            <button type="button" className={`tile${mode === "custom" ? " on" : ""}`} aria-pressed={mode === "custom"} onClick={() => setMode("custom")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="10" cy="12" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
              <span>התאמה אישית</span>
            </button>
          </div>

          {mode === "surprise" && <p className="note">נבחר בשבילך הרפתקה שמתאימה לזמן ולמקום שממנו יוצאים</p>}

          {mode === "custom" && (
            <div className="panel">
              <div className="group">
                <span className="label">אזור</span>
                <div className="wrap">{chips(REGIONS, region, setRegion)}</div>
              </div>
              <div className="group">
                <span className="label">משך</span>
                <div className="three">{chips(DURATIONS, duration, setDuration)}</div>
              </div>
              <div className="group">
                <span className="label">רמת קושי</span>
                <div className="three">{chips(LEVELS, level, setLevel)}</div>
              </div>
            </div>
          )}

          <button type="button" className={`find${ready ? " ready" : ""}`} disabled={!ready} onClick={findAdventure}>
            מצא לי הרפתקה
            <span className="arrow" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </span>
          </button>
        </section>

        {recommended.length > 0 && (
          <>
            <h2 className="section">הרפתקאות מומלצות</h2>
            <div className="recs">
              {recommended.map((c) => (
                <button key={c.id} type="button" className="rec" onClick={() => router.push(`/adventure?id=${c.id}`)}>
                  <span
                    className="pic"
                    style={
                      c.image
                        ? { backgroundImage: `url(${c.image})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { background: REGION_BG[c.region] || REGION_BG["מרכז"] }
                    }
                  >
                    {!c.image && (
                      <svg width="134" height="86" viewBox="0 0 134 86" aria-hidden="true">
                        <path d="M0 86 L30 46 L52 66 L80 30 L134 86 Z" fill="rgba(255,255,255,.45)" />
                      </svg>
                    )}
                  </span>
                  <span className="rname">{c.name}</span>
                  <span className="rmeta">
                    {c.region} · {c.type}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      <nav className="tabs" aria-label="ניווט ראשי">
        <button type="button" className="tab on" aria-current="page">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
          </svg>
          בית
        </button>
        <button type="button" className="tab" onClick={() => router.push("/map")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
            <path d="M9 4v14M15 6v14" />
          </svg>
          מפה
        </button>
        <button type="button" className="tab" onClick={() => router.push("/profile")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          </svg>
          פרופיל
        </button>
      </nav>

      <style>{`
        :root {
          --bg: #F6F9FC;
          --ink: #14213D;
          --muted: #5B6677;
          --blue: #1E6FD9;
          --blue-dark: #1557AD;
          --blue-pale: #DCEAFB;
          --orange: #F26B1D;
          --orange-dark: #C2520F;
          --line: #E3EAF3;
        }
        html, body { margin: 0; background: var(--bg); color: var(--ink); }
        button { font: inherit; color: inherit; }
        .app { min-height: 100dvh; font-family: "Rubik", system-ui, -apple-system, sans-serif; background: var(--bg); }
        .screen { max-width: 480px; margin: 0 auto; padding: 20px 20px 100px; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; }

        .top { display: flex; align-items: center; justify-content: space-between; }
        .who { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--blue-pale); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; color: var(--blue); overflow: hidden; }
        .avatar img { width: 34px; height: 34px; object-fit: contain; }
        .names { display: flex; flex-direction: column; }
        .hello { font-size: 13px; color: var(--muted); }
        .name { font-size: 18px; font-weight: 700; }
        .points { display: flex; align-items: center; gap: 6px; background: #FFF1E6; color: #B4470F; border-radius: 999px; padding: 8px 12px; font-weight: 600; font-size: 14px; font-variant-numeric: tabular-nums; }

        .hero { background: linear-gradient(180deg, #E6F1FD 0%, #FFFFFF 100%); border-radius: 28px; padding: 18px; box-shadow: 0 10px 30px rgba(30,111,217,.10); display: flex; flex-direction: column; gap: 14px; }
        .bird { height: 130px; display: flex; align-items: center; justify-content: center; }
        .bird img { height: 120px; width: auto; animation: hover 3.2s ease-in-out infinite; }
        @keyframes hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .q { margin: 0; font-size: 20px; font-weight: 700; text-align: center; }
        .origin { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: var(--muted); flex-wrap: wrap; margin-top: -6px; }
        .origin select { font: inherit; font-weight: 600; color: var(--blue); background: #fff; border: 1px solid #D5DFEB; border-radius: 999px; padding: 6px 10px; cursor: pointer; }

        .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border-radius: 20px; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 76px; border: 2px solid var(--blue); background: #fff; color: var(--blue); box-shadow: 0 4px 0 var(--blue-pale); }
        .tile.on { background: var(--blue); color: #fff; box-shadow: 0 6px 0 var(--blue-dark); }
        .tile:active { transform: translateY(2px); }
        .note { margin: 0; font-size: 13px; color: var(--muted); text-align: center; }

        .panel { display: flex; flex-direction: column; gap: 12px; background: #fff; border-radius: 20px; padding: 14px; border: 1px solid var(--line); animation: open .2s ease-out; }
        @keyframes open { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .group { display: flex; flex-direction: column; gap: 8px; }
        .label { font-size: 13px; font-weight: 600; color: #3A4658; }
        .wrap { display: flex; flex-wrap: wrap; gap: 6px; }
        .three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
        .chip { border: 1px solid #D5DFEB; background: #fff; color: var(--ink); border-radius: 999px; padding: 8px 12px; font-size: 13px; cursor: pointer; min-height: 36px; }
        .chip.on { border-color: var(--blue); background: var(--blue); color: #fff; }

        .find { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 56px; border: none; border-radius: 999px; font-size: 17px; font-weight: 700; color: #fff; background: var(--orange); cursor: not-allowed; opacity: .45; }
        .find.ready { cursor: pointer; opacity: 1; box-shadow: 0 6px 0 var(--orange-dark); }
        .find.ready:active { transform: translateY(2px); box-shadow: 0 4px 0 var(--orange-dark); }
        .arrow { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; }

        .section { margin: 0; font-size: 18px; font-weight: 700; }
        .recs { display: flex; gap: 12px; overflow-x: auto; margin: -6px -20px 0; padding: 0 20px 6px; scrollbar-width: none; }
        .recs::-webkit-scrollbar { display: none; }
        .rec { flex: 0 0 150px; background: #fff; border: 0; border-radius: 20px; padding: 8px; box-shadow: 0 6px 18px rgba(20,33,61,.08); display: flex; flex-direction: column; gap: 6px; text-align: start; cursor: pointer; }
        .pic { height: 86px; border-radius: 14px; position: relative; overflow: hidden; display: block; }
        .pic svg { position: absolute; bottom: 0; left: 0; }
        .rname { font-size: 14px; font-weight: 600; padding: 0 4px; }
        .rmeta { font-size: 12px; color: var(--muted); padding: 0 4px 4px; }

        .tabs { position: fixed; bottom: 0; left: 0; right: 0; height: 72px; padding-bottom: env(safe-area-inset-bottom); background: #fff; border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; z-index: 10; }
        .tab { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: 0; color: var(--muted); font-size: 11px; cursor: pointer; padding: 6px 0; }
        .tab.on { color: var(--blue); font-weight: 600; }

        .tile:focus-visible, .chip:focus-visible, .find:focus-visible, .rec:focus-visible, .tab:focus-visible, select:focus-visible { outline: 3px solid var(--orange); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .bird img, .panel { animation: none; } }
      `}</style>
    </div>
  );
}
