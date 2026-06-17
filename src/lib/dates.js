export const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
export const DAYS_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
export const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
export const POST_TYPES = ["Photo","Carrousel","Reel"];
export const STATUSES   = ["Brouillon","En cours","Prêt","Programmé","Publié","Manqué"];

export const STATUS_COLORS = {
  "Brouillon": "#FF9500",
  "En cours":  "#007AFF",
  "Prêt":      "#34C759",
  "Programmé": "#1A7A3E",
  "Publié":    "#8E8E93",
  "Manqué":    "#FF3B30",
};

export function getEffectiveStatus(post, dateKey) {
  if (post.status === "Publié" || post.status === "Manqué") return post.status;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (dateKey < todayStr) return "Manqué";
  return post.status || "Brouillon";
}

export function getDaysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
export function getFirstDayOfMonth(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
export function fmtDate(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
export function fmtDateFR(k) { const [y,m,d] = k.split("-"); return `${parseInt(d)}/${parseInt(m)}/${y}`; }
export function getWeeksOfMonth(y, m) {
  const wks = []; let cur = [];
  for (let d = 1; d <= getDaysInMonth(y, m); d++) {
    const dw = new Date(y, m, d).getDay();
    const mb = dw === 0 ? 6 : dw - 1;
    if (mb === 0 && cur.length > 0) { wks.push(cur); cur = []; }
    cur.push(d);
  }
  if (cur.length > 0) wks.push(cur);
  return wks;
}
