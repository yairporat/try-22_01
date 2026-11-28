// ההפתעות האחרונות במכשיר (עד 10), כדי ש"הפתע אותי" לא יחזור על אותו אזור, אותה תחנה ראשית או אותו שילוב.
const KEY = 'thv-surprise-history';

export function loadSurpriseHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function recordSurprise(s) {
  if (!s?.combo) return;
  const list = loadSurpriseHistory().filter((x) => x.combo !== s.combo || Date.now() - x.at > 5000);
  if (list[0]?.combo === s.combo) return; // אותה תוצאה שנטענה שוב
  try {
    localStorage.setItem(KEY, JSON.stringify([{ ...s, at: Date.now() }, ...list].slice(0, 10)));
  } catch {}
}

// פרמטרים לבקשה: 3 האזורים האחרונים, והתחנות הראשיות והשילובים של 10 האחרונות
export function surpriseParams() {
  const h = loadSurpriseHistory();
  return {
    recentRegions: h.slice(0, 3).map((x) => x.region).join(','),
    recentAnchors: h.map((x) => x.anchor).join(','),
    recentCombos: h.map((x) => x.combo).join(','),
  };
}
