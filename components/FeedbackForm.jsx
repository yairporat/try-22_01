'use client';

// דירוג ההרפתקה בסוף: פניקסים (1-5) והערות חופשיות.

import { useState } from 'react';

const LABELS = ['', 'לא נהניתי', 'היה בסדר', 'טוב', 'מאוד טוב', 'מושלם!'];

export default function FeedbackForm({ trip, onSent }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | error

  if (trip.feedback) {
    return (
      <section style={s.box}>
        <p style={s.thanks}>תודה על הדירוג!</p>
        <div style={s.stars} aria-label={`${trip.feedback.rating} מתוך 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Phoenix key={n} on={n <= trip.feedback.rating} size={30} />
          ))}
        </div>
        {trip.feedback.comment && <p style={s.quote}>"{trip.feedback.comment}"</p>}
      </section>
    );
  }

  async function send() {
    if (!rating) return;
    setStatus('sending');
    const { adventure, results = [] } = trip;
    const feedback = { rating, comment: comment.trim() };
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...feedback,
          title: adventure.title,
          region: adventure.region,
          duration: adventure.duration,
          difficulty: adventure.difficulty,
          stops: adventure.stops.map((st, i) => ({ name: st.name, result: results[i] || 'skipped' })),
          startedAt: trip.startedAt,
          finishedAt: trip.finishedAt,
        }),
      });
      if (!res.ok) throw new Error();
      onSent(feedback);
    } catch {
      setStatus('error');
    }
  }

  const shown = hover || rating;
  return (
    <section style={s.box}>
      <h2 style={s.title}>איך הייתה ההרפתקה?</h2>
      <div style={s.stars} role="radiogroup" aria-label="דירוג" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} מתוך 5`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            style={s.star}
          >
            <Phoenix on={n <= shown} size={48} />
          </button>
        ))}
      </div>
      <p style={s.label}>{LABELS[shown] || 'בחרו דירוג'}</p>
      <label htmlFor="fbComment" style={s.commentLabel}>
        הערות (לא חובה)
      </label>
      <textarea
        id="fbComment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="מה אהבתם? מה היה כדאי לשפר?"
        style={s.textarea}
      />
      {status === 'error' && <p style={s.error}>לא הצלחנו לשלוח את הדירוג. בדקו את החיבור ונסו שוב.</p>}
      <button type="button" onClick={send} disabled={!rating || status === 'sending'} style={{ ...s.send, opacity: rating ? 1 : 0.4 }}>
        {status === 'sending' ? 'שולחים...' : 'שליחת דירוג'}
      </button>
    </section>
  );
}

function Phoenix({ on, size }) {
  return (
    <img
      src="/phoenix.webp"
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        filter: on ? 'none' : 'grayscale(1)',
        opacity: on ? 1 : 0.3,
        transform: on ? 'scale(1.08)' : 'scale(0.92)',
        transition: 'transform .15s, opacity .15s, filter .15s',
      }}
    />
  );
}

const s = {
  box: { border: '2px solid #e3e9ef', borderRadius: 20, padding: 16, display: 'grid', gap: 8, margin: '4px 0 16px' },
  title: { margin: 0, fontSize: 19, textAlign: 'center' },
  stars: { display: 'flex', justifyContent: 'center', gap: 4 },
  star: { background: 'none', border: 'none', padding: 2, cursor: 'pointer', borderRadius: 12 },
  label: { margin: 0, textAlign: 'center', color: '#64748b', fontSize: 14, minHeight: 20 },
  commentLabel: { fontSize: 14, fontWeight: 700, marginTop: 4 },
  textarea: { font: 'inherit', fontSize: 15, padding: 12, borderRadius: 12, border: '2px solid #e3e9ef', resize: 'vertical', boxSizing: 'border-box', width: '100%' },
  error: { margin: 0, color: '#b42318', fontSize: 14 },
  send: { width: '100%', border: 'none', borderRadius: 16, padding: '12px 0', fontSize: 16, fontWeight: 800, background: '#2f80ed', color: '#fff', borderBottom: '4px solid #1c5fb8', cursor: 'pointer', fontFamily: 'inherit' },
  thanks: { margin: 0, textAlign: 'center', fontWeight: 800, fontSize: 17, color: '#17784f' },
  quote: { margin: 0, textAlign: 'center', color: '#64748b', fontSize: 14 },
};
