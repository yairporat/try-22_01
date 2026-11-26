'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// נתוני דוגמה - בהמשך יגיעו מ-/api/find-adventure
const adventure = {
  title: 'מעיינות ותצפיות בגליל העליון',
  region: 'גליל עליון',
  duration: 'חצי יום',
  difficulty: 'קל',
  stops: [
    {
      id: 1,
      name: 'מעיין הדוגמה',
      image: '/places/spring.jpg',
      description: 'הסבר מפורט על המקום, איך מגיעים, מה כדאי לראות ומה חשוב לדעת.',
      visitTime: '45 דקות',
      mapsLink: 'https://maps.google.com/?q=33.0,35.5',
    },
    {
      id: 2,
      name: 'תצפית הדוגמה',
      image: '/places/viewpoint.jpg',
      description: 'הסבר מפורט על התצפית והנוף שנשקף ממנה.',
      visitTime: '30 דקות',
      mapsLink: 'https://maps.google.com/?q=33.1,35.6',
    },
  ],
};

export default function AdventurePreview() {
  const [showMap, setShowMap] = useState(false);
  const router = useRouter();

  const handleStart = () => {
    // בשלב הבא: מעבר למסך התחנה הראשונה
    router.push(`/adventure/stop/${adventure.stops[0].id}`);
  };

  return (
    <main dir="rtl" style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>{adventure.title}</h1>
        <div style={styles.chips}>
          <span style={styles.chip}>{adventure.region}</span>
          <span style={styles.chip}>{adventure.duration}</span>
          <span style={styles.chip}>{adventure.difficulty}</span>
        </div>
        <button style={styles.mapButton} onClick={() => setShowMap((v) => !v)}>
          {showMap ? 'הסתר מפה' : 'הצג מפה'}
        </button>
        {showMap && (
          <div style={styles.mapBox}>
            המפה תופיע כאן (נוסיף בהמשך)
          </div>
        )}
      </header>

      <section style={styles.stops}>
        {adventure.stops.map((stop, index) => (
          <article key={stop.id} style={styles.card}>
            <div style={styles.imageWrap}>
              <Image
                src={stop.image}
                alt={stop.name}
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                priority={index === 0}
                style={{ objectFit: 'cover' }}
              />
              <span style={styles.number}>{index + 1}</span>
            </div>
            <div style={styles.cardBody}>
              <h2 style={styles.stopName}>{stop.name}</h2>
              <p style={styles.visitTime}>זמן ביקור משוער: {stop.visitTime}</p>
              <p style={styles.description}>{stop.description}</p>
              <a
                href={stop.mapsLink}
                target="_blank"
                rel="noreferrer"
                style={styles.navButton}
              >
                נווט לתחנה
              </a>
            </div>
          </article>
        ))}
      </section>

      <footer style={styles.footer}>
        <button style={styles.startButton} onClick={handleStart}>
          התחל הרפתקה
        </button>
        <small style={styles.thv}>THV</small>
      </footer>
    </main>
  );
}

const BLUE = '#2f80ed';
const BLUE_DARK = '#1c5fb8';
const ORANGE = '#f2653a';
const ORANGE_DARK = '#c94a22';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#ffffff',
    padding: '20px 16px 120px',
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 480,
    margin: '0 auto',
  },
  header: { textAlign: 'center', marginBottom: 24 },
  title: { fontSize: 26, margin: '8px 0 12px', color: '#1a1a1a' },
  chips: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  chip: {
    background: '#eaf2fe',
    color: BLUE_DARK,
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
  },
  mapButton: {
    marginTop: 14,
    background: BLUE,
    color: '#fff',
    border: 'none',
    borderBottom: `4px solid ${BLUE_DARK}`,
    borderRadius: 14,
    padding: '8px 20px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  mapBox: {
    marginTop: 12,
    height: 180,
    borderRadius: 18,
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
  },
  stops: { display: 'flex', flexDirection: 'column', gap: 20 },
  card: {
    background: '#fff',
    borderRadius: 24,
    boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
    overflow: 'hidden',
  },
  imageWrap: { position: 'relative', width: '100%', height: 200 },
  number: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: ORANGE,
    color: '#fff',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 16 },
  stopName: { fontSize: 20, margin: '0 0 4px', color: '#1a1a1a' },
  visitTime: { fontSize: 14, color: '#64748b', margin: '0 0 10px' },
  description: { fontSize: 15, lineHeight: 1.6, color: '#333', margin: '0 0 14px' },
  navButton: {
    display: 'inline-block',
    background: BLUE,
    color: '#fff',
    borderBottom: `4px solid ${BLUE_DARK}`,
    borderRadius: 14,
    padding: '10px 22px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 16px 8px',
    background: 'linear-gradient(to top, #fff 70%, rgba(255,255,255,0))',
    textAlign: 'center',
  },
  startButton: {
    width: '100%',
    maxWidth: 448,
    background: ORANGE,
    color: '#fff',
    border: 'none',
    borderBottom: `5px solid ${ORANGE_DARK}`,
    borderRadius: 18,
    padding: '14px 0',
    fontSize: 18,
    fontWeight: 800,
    cursor: 'pointer',
  },
  thv: { display: 'block', marginTop: 6, color: '#94a3b8', fontSize: 11 },
};
