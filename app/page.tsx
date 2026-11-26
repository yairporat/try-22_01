"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { REGIONS, DURATIONS, LEVELS } from "../lib/adventure";
import { loadProfile, loadWallet, START_COINS } from "../lib/profile";

const PHOENIX = "data:image/webp;base64,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";

type Mode = "surprise" | "custom" | null;


type Recommended = { id: string; name: string; image: string };

export default function Home() {
  const [mode, setMode] = useState<Mode>(null);
  const [region, setRegion] = useState("");
  const [duration, setDuration] = useState("");
  const [level, setLevel] = useState("");
  // הרפתקאות מומלצות: המקומות שמסומנים "מומלץ: כן" בטבלה
  const [recommended, setRecommended] = useState<Recommended[]>([]);
  const [userName, setUserName] = useState("");
  const [coins, setCoins] = useState(START_COINS);
  useEffect(() => {
    setUserName(loadProfile()?.name || "");
    setCoins(loadWallet().coins);
  }, []);
  useEffect(() => {
    fetch("/api/places")
      .then((res) => res.json())
      .then(setRecommended)
      .catch(() => setRecommended([]));
  }, []);
  const router = useRouter();

  const ready =
    mode === "surprise" ||
    (mode === "custom" && region !== "" && duration !== "" && level !== "");

  function findAdventure() {
    // TODO: connect to the adventure-matching logic (Supabase).
    const params = new URLSearchParams({ mode: mode ?? "surprise" });
    if (mode === "custom") {
      params.set("region", region);
      params.set("duration", duration);
      params.set("level", level);
    }
    router.push(`/adventure?${params.toString()}`);
  }

  return (
    <div dir="rtl" className="app">
      <main className="screen">
        <header className="top">
          <div>
            <p className="hi">שלום,</p>
            <h1 className="name">{userName || "מטייל"}!</h1>
          </div>
          <div className="chip" aria-label={`${coins} מטבעות`}>
            <span className="coin" />
            <b>{coins}</b>
          </div>
        </header>

        <section className="card hero">
          <div className="ring">
            <img src={PHOENIX} alt="THV" className="phoenix" />
          </div>
          <div>
            <h2>מוכן להרפתקה?</h2>
            <p>בחר איך להתחיל ונמצא לך מסלול מתאים.</p>
          </div>
        </section>

        <section className="choices" aria-label="בחירת סוג הרפתקה">
          <button
            className={`card tile ${mode === "surprise" ? "on" : ""}`}
            onClick={() => setMode("surprise")}
            aria-pressed={mode === "surprise"}
          >
            <span className="icon">
              <SparkIcon />
            </span>
            <span className="txt">
              <b>הפתע אותי</b>
              <small>הרפתקה שנבחרת לפי היום ומזג האוויר</small>
            </span>
          </button>

          <button
            className={`card tile ${mode === "custom" ? "on" : ""}`}
            onClick={() => setMode("custom")}
            aria-pressed={mode === "custom"}
          >
            <span className="icon">
              <SlidersIcon />
            </span>
            <span className="txt">
              <b>התאמה אישית</b>
              <small>אזור, משך ורמת קושי</small>
            </span>
          </button>

          {mode === "custom" && (
            <div className="card fields">
              <Select label="אזור" value={region} onChange={setRegion} options={REGIONS} />
              <Select label="משך" value={duration} onChange={setDuration} options={DURATIONS} />
              <Select label="רמת קושי" value={level} onChange={setLevel} options={LEVELS} />
            </div>
          )}
        </section>

        <button className="go" disabled={!ready} onClick={findAdventure}>
          <span>מצא לי את ההרפתקה שלי</span>
          <ArrowIcon />
        </button>

        <section className="reco" aria-label="הרפתקאות מומלצות">
          <p className="label">הרפתקאות מומלצות</p>
          <div className="strip">
            {recommended.map((a) => (
              <button
                key={a.id}
                className="card mini"
                onClick={() => router.push(`/adventure?id=${a.id}`)}
              >
                <span
                  className="thumb"
                  style={
                    a.image
                      ? { backgroundImage: `url(${a.image})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                />
                <span className="cname">{a.name}</span>
              </button>
            ))}
          </div>
        </section>

        <footer className="brand">THV</footer>
      </main>

      <nav className="tabs" aria-label="ניווט ראשי">
        <button className="tab on" aria-current="page">
          <HomeIcon />
          <span>בית</span>
        </button>
        <button className="tab" onClick={() => router.push("/map")}>
          <MapIcon />
          <span>מפה</span>
        </button>
        <button className="tab" onClick={() => router.push("/profile")}>
          <UserIcon />
          <span>פרופיל</span>
        </button>
      </nav>

      <style>{`
        :root {
          --blue: #1f78a8;
          --blue-edge: #155d85;
          --orange: #ee6a1f;
          --orange-edge: #c24f12;
          --ink: #14212b;
          --muted: #6b7b88;
          --line: #e3e9ef;
          --bg: #f7f9fc;
        }
        html,
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
        }
        button {
          font: inherit;
          color: inherit;
        }
        .app {
          min-height: 100dvh;
          font-family: "Rubik", "Heebo", "Assistant", system-ui, -apple-system, sans-serif;
        }
        .screen {
          max-width: 480px;
          margin: 0 auto;
          padding: 22px 18px 120px;
          box-sizing: border-box;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }
        .hi {
          margin: 0;
          color: var(--muted);
          font-size: 0.95rem;
        }
        .name {
          margin: 0;
          font-size: 1.9rem;
          font-weight: 800;
          line-height: 1.15;
        }
        .chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          background: #fff;
          border: 2px solid var(--line);
          border-radius: 999px;
          font-size: 1rem;
        }
        .coin {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #ffd86b, #f0a41a);
          box-shadow: inset 0 0 0 2px #f6b93b;
        }
        .card {
          background: #fff;
          border: 2px solid var(--line);
          border-bottom-width: 5px;
          border-radius: 22px;
        }
        .hero {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
        }
        .ring {
          flex: 0 0 auto;
          width: 118px;
          height: 118px;
          display: grid;
          place-items: center;
        }
        .phoenix {
          width: 118px;
          height: auto;
          animation: hover 5s ease-in-out infinite;
        }
        @keyframes hover {
          0%,
          100% {
            transform: translateY(0) rotate(-0.6deg);
          }
          50% {
            transform: translateY(-5px) rotate(0.6deg);
          }
        }
        .hero h2 {
          margin: 0 0 4px;
          font-size: 1.3rem;
          font-weight: 800;
        }
        .hero p {
          margin: 0;
          color: var(--muted);
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .choices {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }
        .tile {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          text-align: start;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .tile .icon {
          flex: 0 0 auto;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e6f1f8;
          color: var(--blue);
        }
        .tile .txt {
          display: grid;
          gap: 2px;
        }
        .tile b {
          font-size: 1.1rem;
          font-weight: 800;
        }
        .tile small {
          font-size: 0.85rem;
          color: var(--muted);
        }
        .tile.on {
          background: var(--blue);
          border-color: var(--blue);
          border-bottom-color: var(--blue-edge);
          color: #fff;
        }
        .tile.on small {
          color: rgba(255, 255, 255, 0.85);
        }
        .tile.on .icon {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }
        .tile:active,
        .go:active:not(:disabled) {
          transform: translateY(2px);
        }
        .fields {
          display: grid;
          gap: 10px;
          padding: 14px;
          animation: open 0.25s ease-out;
        }
        @keyframes open {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .field {
          display: grid;
          gap: 4px;
          font-size: 0.9rem;
          color: var(--muted);
        }
        .field select {
          font: inherit;
          font-size: 1rem;
          padding: 12px;
          border: 2px solid var(--line);
          border-radius: 12px;
          background: #fff;
          color: var(--ink);
        }
        .go {
          width: 100%;
          margin-top: 18px;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 1.2rem;
          font-weight: 800;
          color: #fff;
          background: var(--orange);
          border: 0;
          border-bottom: 5px solid var(--orange-edge);
          border-radius: 22px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .go:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .reco {
          margin-top: 26px;
        }
        .label {
          margin: 0 0 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--muted);
        }
        .strip {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          padding-bottom: 6px;
          -webkit-overflow-scrolling: touch;
        }
        .mini {
          flex: 0 0 auto;
          width: 104px;
          display: grid;
          gap: 6px;
          padding: 6px;
          border-radius: 14px;
          border-bottom-width: 3px;
          scroll-snap-align: start;
          cursor: pointer;
        }
        .thumb {
          display: block;
          height: 50px;
          border-radius: 9px;
          background: linear-gradient(135deg, #cfe3ee, #f6dccb);
        }
        .cname {
          font-size: 0.8rem;
          font-weight: 500;
          text-align: center;
        }
        .brand {
          margin-top: 16px;
          text-align: center;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #9aa8b3;
        }
        .tabs {
          position: fixed;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: min(440px, calc(100% - 28px));
          display: flex;
          justify-content: space-around;
          gap: 4px;
          padding: 6px 6px calc(6px + env(safe-area-inset-bottom));
          background: #fff;
          border: 2px solid var(--line);
          border-radius: 30px;
          box-shadow: 0 6px 22px rgba(20, 33, 43, 0.08);
          box-sizing: border-box;
        }
        .tab {
          flex: 1;
          display: grid;
          justify-items: center;
          gap: 2px;
          padding: 8px 0;
          background: transparent;
          border: 0;
          border-radius: 22px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
        }
        .tab.on {
          background: #eef2f6;
          color: var(--blue);
        }
        .tile:focus-visible,
        .go:focus-visible,
        .mini:focus-visible,
        .tab:focus-visible,
        select:focus-visible {
          outline: 3px solid var(--orange);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .phoenix,
          .fields {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">בחר</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

const svg = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SparkIcon() {
  return (
    <svg {...svg}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg {...svg}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg {...svg}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg {...svg}>
      <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg {...svg}>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
