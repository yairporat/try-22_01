'use client';

// דירוג כשורה של חמש ציפורים: הציפורים הצבעוניות לפי הממוצע (כולל חצי ציפור), בלי מספר המדרגים.

export default function Birds({ value, size = 18, label = true }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 1, direction: 'ltr' }}
      role={label ? 'img' : undefined}
      aria-label={label ? `דירוג ${Math.round(v * 10) / 10} מתוך 5` : undefined}
      aria-hidden={label ? undefined : true}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return (
          <span key={i} style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
            <img src="/phoenix-pin.png" alt="" style={{ width: size, height: size, objectFit: 'contain', filter: 'grayscale(1)', opacity: 0.28 }} />
            {fill > 0 && (
              <span style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                <img src="/phoenix-pin.png" alt="" style={{ width: size, height: size, objectFit: 'contain', maxWidth: 'none' }} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
