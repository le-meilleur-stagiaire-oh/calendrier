import { useState, useEffect, useRef, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
};

let db = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase not configured, using localStorage fallback");
}

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

// Library context — shared across PostEditor instances
const LibraryContext = createContext({ library: [], setLibrary: () => {} });

const ACCOUNTS = [
  { id: "APG", name: "L'Apogée Courchevel", color: "#7B2D3B", light: "#F5E6E9" },
  { id: "CSM", name: "Château Saint-Martin & Spa", color: "#D4782F", light: "#FDF0E5" },
  { id: "HDCER", name: "Hôtel du Cap-Eden-Roc", color: "#4A9FCC", light: "#E5F2FA" },
  { id: "BB", name: "Beefbar Courchevel", color: "#3A8A5C", light: "#E6F5ED" },
];

const POST_TYPES = ["Photo", "Carrousel", "Reel"];
const STATUSES = ["Brouillon", "En cours", "Validé", "Programmé", "Publié"];

// Optimal posting times (based on luxury hospitality best practices)
const BEST_TIMES = {
  APG: { weekday: "18:00", weekend: "10:00", note: "Audience ski/montagne, actifs le soir en semaine et le matin le weekend" },
  CSM: { weekday: "12:00", weekend: "09:00", note: "Audience Provence/bien-être, pause déjeuner et matin calme" },
  HDCER: { weekday: "17:00", weekend: "11:00", note: "Audience Côte d'Azur/internationale, fin d'après-midi et brunch" },
  BB: { weekday: "19:00", weekend: "12:00", note: "Audience gastronomie/nightlife, avant dîner et midi le weekend" },
};

const HASHTAG_BANK = {
  APG: {
    "Tous": ["#lapogeecourchevel", "#oetkerhotels", "#luxuryhotel", "#penthouse", "#courchevel", "#masterpiecehotels", "#teatime", "#pastry", "#hotel", "#winter", "#snow", "#restaurant", "#pastries"],
  },
  CSM: {
    "Tous": ["#oetkerhotels", "#Vence", "#summer", "#southoffrance", "#masterpiecehotels", "#luxuryescape", "#dreamstay", "#ChateauStMartin", "#FlavorsAndAmbiance", "#SharedMoments", "#hotel", "#vence"],
  },
  HDCER: {
    "Tous": ["#hotelducapedenroc", "#oetkerhotels", "#FrenchRiviera", "#LuxuryHotel", "#southoffrance", "#masterpiecehotels", "#VacationGoals", "#HotelduCapEdenRoc", "#OetkerCollection", "#MasterpieceHotels", "#CoteDAzur", "#TimelessElegance", "#LuxuryEscape", "#summer", "#frenchriviera", "#capdantibes"],
  },
  BB: {
    "Tous": ["#lapogeecourchevel", "#beefbarcourchevel", "#courchevelrestaurant", "#courchevel1850", "#beefbar", "#oetkerhotels", "#courchevel", "#restaurant", "#winterdestination", "#valentinesdays", "#meat"],
  },
};

const MANDATORY_HASHTAGS = {
  APG: ["#lapogeecourchevel", "#oetkerhotels"],
  CSM: ["#ChateauStMartin", "#oetkerhotels"],
  HDCER: ["#hotelducapedenroc", "#oetkerhotels"],
  BB: [],
};

const SUBJECT_BANK = {
  HDCER: ["Lever de soleil sur la mer", "Coucher de soleil iconique", "Une journée à l'hôtel", "Les plus belles vues", "Room tour d'une suite", "Les détails du luxe", "La piscine mythique", "Moments hors saison", "Ambiance Riviera", "Terrasse avec vue mer", "Petit-déjeuner face à la mer", "Moments de calme absolu", "Les coins cachés", "Arrivée d'un client", "Expérience client complète", "Service en chambre", "Les jardins en fleurs", "L'hôtel vu du ciel", "Moments golden hour", "Ambiance dolce vita"],
  CSM: ["Vue panoramique", "Moments de détente au spa", "Une journée slow luxury", "Les villas privées", "Petit-déjeuner avec vue", "Coucher de soleil sur les collines", "Ambiance nature", "Les jardins du domaine", "Moments de silence", "Dîner en terrasse", "Expérience bien-être", "Architecture du château", "Moments intimistes", "Les coins cachés", "Une journée sans quitter l'hôtel", "Ambiance romantique", "Les saisons au domaine", "Moments suspendus", "Vue depuis la piscine", "Évasion sur la Côte d'Azur"],
  APG: ["Ski-in ski-out", "Matin en montagne", "Vue sur les pistes", "Après-ski", "Ambiance hivernale", "Moments cocooning", "Cheminée et ambiance chaleureuse", "Une journée à Courchevel", "Spa après ski", "Neige qui tombe", "Dîner en altitude", "Activités montagne", "Moments en famille", "Ambiance soirée", "Lever de soleil sur la neige", "Vue depuis une suite", "Expérience luxe en hiver", "Moments cosy", "Les pistes au lever du jour", "Évasion alpine"],
  BB: ["Cuisson d'une pièce de viande", "Dressage d'assiette", "Plats signature", "Ambiance du restaurant", "Dîner d'exception", "Close-up food", "Cocktails signature", "Expérience client complète", "Service en salle", "Cuisine en action", "Viandes premium", "Moments de service", "Ambiance soirée", "Desserts signature", "Plats à partager", "Accords mets & vins", "Textures et détails", "Ambiance feutrée", "Expérience gastronomique", "Instants gourmands"],
};

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAYS_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function fmtDate(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtDateFR(dateKey) { const [y,m,d] = dateKey.split("-"); return `${parseInt(d)}/${parseInt(m)}/${y}`; }

function getWeeksOfMonth(y, m) {
  const weeks = []; let cur = [];
  for (let d = 1; d <= getDaysInMonth(y, m); d++) {
    const dow = new Date(y, m, d).getDay();
    const mb = dow === 0 ? 6 : dow - 1;
    if (mb === 0 && cur.length > 0) { weeks.push(cur); cur = []; }
    cur.push(d);
  }
  if (cur.length > 0) weeks.push(cur);
  return weeks;
}

const ACCOUNT_VOICE = {
  APG: `The voice of silent Alpine exclusivity. Raw mountain mornings, the smell of wood and snow, the feeling of being above the world. Intimate, not showy. Cozy but never rustic.`,
  CSM: `The voice of Provençal timelessness. Stone, light, lavender, silence broken only by cicadas. A place where time slows down on purpose. Poetic, grounded, never overwrought.`,
  HDCER: `The voice of Mediterranean legend. This is where cinema, art and the sea have always met. Iconic without trying to be. The light here is different. Timeless, not trendy.`,
  BB: `The voice of unapologetic indulgence. Premium cuts, low lights, the sound of a room that knows how to have a good time. Confident, sensory, a little cinematic.`,
};

function buildFinalHashtags(account) {
  const mandatory = MANDATORY_HASHTAGS[account] || [];
  const allTags = Object.values(HASHTAG_BANK[account] || {}).flat();
  const pool = [...new Set(allTags)].filter(t =>
    !mandatory.map(m => m.toLowerCase()).includes(t.toLowerCase())
  );
  // Exactly 5 total: fill with mandatory first, then random from pool
  if (mandatory.length >= 5) return mandatory.slice(0, 5);
  const needed = 5 - mandatory.length;
  const random = [...pool].sort(() => Math.random() - 0.5).slice(0, needed);
  return [...mandatory, ...random];
}

async function generateCaption(subject, account, credits) {
  const acc = ACCOUNTS.find(a => a.id === account);
  const finalTags = buildFinalHashtags(account);
  const mention = account === "BB" ? "@lapogeecourchevel" : "@oetkerhotels";
  const voice = ACCOUNT_VOICE[account] || "";

  const prompt = `You are an elite social media copywriter specializing in ultra-luxury hospitality.
You write for ${acc.name} (${account}), whose voice is:
${voice}

Subject: ${subject}
${credits ? `Credits: ${credits}` : ""}

Your task: write an Instagram caption that makes the reader FEEL something — nostalgia, desire, calm, excitement — as if they are already there or desperately want to be. The reader has just seen the photo or video. Your words must extend that emotion, not just describe what they already see.

STRICT RULES:
- HOOK: The first sentence must be a powerful, unexpected opening — an evocative statement, a sensory detail, or a quiet observation. Never a question. Never a cliché.
- LENGTH: 2 to 3 sentences per language. Go to 4 only if it adds real emotional weight.
- TONE: British elegance written in American English. Restrained but felt.
- BANNED WORDS: luxury, unique, unforgettable, magical, breathtaking, incredible, experience, world-class, prestigious, exceptional, exclusive, perfect, stunning, amazing, wonderful, paradise, dream, ultimate, unparalleled, exquisite.
- NO emojis. NO exclamation marks. NO hollow adjectives.
- Write as if you have one chance to make someone stop scrolling.

FORMAT (follow exactly, with ONE empty line before and after each —):

[English caption — hook first, 2-3 sentences]

—

[French translation — same emotional weight, not word-for-word]

—
${credits ? `\n${credits}\n\n—\n` : ""}
${mention}

${finalTags.join(" ")}

Output ONLY the caption text. No brackets, no labels, no quotes, no explanation.`;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    return (data.text || "").trim();
  } catch (e) {
    let fb = `The mountain holds its breath at this hour.\n\n—\n\nLa montagne retient son souffle à cette heure.`;
    if (credits) fb += `\n\n—\n\n${credits}`;
    fb += `\n\n—\n\n${mention}\n\n${finalTags.join(" ")}`;
    return fb;
  }
}

const F = "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F2F2F7",           // iOS system background
  surface: "#FFFFFF",
  surfaceSecondary: "#F2F2F7",
  elevated: "rgba(255,255,255,0.85)",
  border: "rgba(0,0,0,0.08)",
  borderStrong: "rgba(0,0,0,0.13)",
  text: "#1C1C1E",
  textSecondary: "#636366",
  textTertiary: "#AEAEB2",
  blue: "#007AFF",
  green: "#34C759",
  red: "#FF3B30",
  orange: "#FF9500",
  indigo: "#5856D6",
  teal: "#5AC8FA",
  orange: "#FF9500",
};

async function analyzeImageAndGenerate(imageUrl, imageBase64, account, credits) {
  const acc = ACCOUNTS.find(a => a.id === account);
  const finalTags = buildFinalHashtags(account);
  const mention = account === "BB" ? "@lapogeecourchevel" : "@oetkerhotels";
  const voice = ACCOUNT_VOICE[account] || "";

  const prompt = `You are an elite social media copywriter specializing in ultra-luxury hospitality.
You write for ${acc?.name} (${account}), whose voice is:
${voice}

Look at this image with the eye of a creative director, not a tourist. Identify: the mood, the light, the emotion it creates, what is implied but not shown. Use that as the foundation for both the hook and the caption.

Your tasks:
1. Write a subject line (5-10 words max, in French) — what a magazine editor would write as a headline for this image.
2. Write an Instagram caption that makes the reader FEEL something — nostalgia, desire, calm, excitement — as if they are already there or desperately want to be. The reader has just seen this image. Your words must extend that emotion, not just describe what they see.

STRICT RULES:
- HOOK: The first sentence must be a powerful, unexpected opening — an evocative statement, a sensory detail, or a quiet observation. Never a question. Never a cliché.
- LENGTH: 2 to 3 sentences per language. Go to 4 only if it adds real emotional weight.
- TONE: British elegance written in American English. Restrained but felt.
- BANNED WORDS: luxury, unique, unforgettable, magical, breathtaking, incredible, experience, world-class, prestigious, exceptional, exclusive, perfect, stunning, amazing, wonderful, paradise, dream, ultimate, unparalleled, exquisite.
- NO emojis. NO exclamation marks. NO hollow adjectives.
- Write as if you have one chance to make someone stop scrolling.

CAPTION FORMAT (follow exactly, with ONE empty line before and after each —):

[English caption — hook first, 2-3 sentences]

—

[French translation — same emotional weight, not word-for-word]

—
${credits ? `\n${credits}\n\n—\n` : ""}
${mention}

${finalTags.join(" ")}

CRITICAL: Respond ONLY with this JSON object, nothing else:
{"subject": "le sujet en français", "caption": "the full caption text exactly as formatted above"}`;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'vision', prompt, imageUrl, imageBase64 }),
    });
    const data = await res.json();
    const text = (data.text || '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { subject: parsed.subject || '', caption: parsed.caption || '' };
    }
    return { subject: '', caption: text };
  } catch (e) {
    return { subject: '', caption: '' };
  }
}
const selectStyle = {
  padding: "6px 10px", borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 13, fontFamily: F, color: C.text,
  background: C.surfaceSecondary, cursor: "pointer",
  outline: "none", appearance: "none",
  WebkitAppearance: "none",
};
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 14, fontFamily: F, color: C.text,
  background: C.surfaceSecondary, outline: "none",
  boxSizing: "border-box", transition: "border-color .15s",
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: C.textTertiary,
  letterSpacing: 0.5, textTransform: "uppercase",
  fontFamily: F, display: "block", marginBottom: 5,
};
const navBtn = {
  width: 32, height: 32, borderRadius: "50%",
  border: `1px solid ${C.border}`,
  background: C.elevated, cursor: "pointer",
  fontSize: 18, color: C.blue,
  display: "flex", alignItems: "center", justifyContent: "center",
  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};
const cardStyle = {
  background: C.surface, borderRadius: 16,
  border: `1px solid ${C.border}`, overflow: "hidden",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
};
const pillBtn = (active, color) => ({
  padding: "6px 16px", borderRadius: 20,
  border: `1.5px solid ${color || C.blue}`,
  background: active ? (color || C.blue) : "transparent",
  color: active ? "#fff" : (color || C.blue),
  cursor: "pointer", fontSize: 12, fontFamily: F,
  fontWeight: 600, transition: "all .18s",
  letterSpacing: 0.2,
});

function Badge({ text, bg, fg, border: bd }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 8, background: bg || "transparent", color: fg || C.textSecondary, fontSize: 10, fontWeight: 600, fontFamily: F, border: bd ? `1px solid ${bd}` : "none", letterSpacing: 0.3 }}>{text}</span>;
}

function OpenClosedPanel({ accountSettings, setAccountSettings, month, onGenerate, onClear }) {
  const updateSetting = (id, field, value) => {
    setAccountSettings(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  return (
    <div style={{ ...cardStyle, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: F, marginBottom: 14 }}>
        Établissements — {MONTHS_FR[month]}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {ACCOUNTS.map(a => {
          const s = accountSettings[a.id] || { isOpen: true, postsPerWeek: 3, closingDate: "", openingDate: "" };
          return (
            <div key={a.id} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.surfaceSecondary }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => updateSetting(a.id, "isOpen", !s.isOpen)}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: s.isOpen ? C.green : C.red, cursor: "pointer", flexShrink: 0, transition: "background .2s", boxShadow: `0 2px 6px ${s.isOpen ? C.green : C.red}55` }}
                  title={s.isOpen ? "Cliquer pour fermer" : "Cliquer pour ouvrir"}
                />
                <span style={{ fontWeight: 700, fontSize: 13, color: a.color, fontFamily: F }}>{a.id}</span>
                <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number" min="0" max="14" value={s.postsPerWeek}
                    onChange={e => updateSetting(a.id, "postsPerWeek", e.target.value)}
                    style={{ width: 44, padding: "4px 6px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F, textAlign: "center", color: C.blue, fontWeight: 700, background: C.surface, outline: "none" }}
                  />
                  <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F }}>/sem</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F }}>Fermeture</span>
                  <input type="date" value={s.closingDate || ""} onChange={e => updateSetting(a.id, "closingDate", e.target.value)}
                    style={{ padding: "2px 6px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F, color: C.text, background: C.surface, outline: "none" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F }}>Ouverture</span>
                  <input type="date" value={s.openingDate || ""} onChange={e => updateSetting(a.id, "openingDate", e.target.value)}
                    style={{ padding: "2px 6px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 11, fontFamily: F, color: C.text, background: C.surface, outline: "none" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
        {onClear && (
          <button onClick={onClear} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.red}`, background: "transparent", color: C.red, cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 500 }}>
            Effacer le planning
          </button>
        )}
        {onGenerate && (
          <button onClick={onGenerate} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: C.blue, color: "#fff", cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 600, boxShadow: `0 2px 8px ${C.blue}44` }}>
            Générer le planning
          </button>
        )}
      </div>
    </div>
  );
}

function MonthlyRecap({ year, month, posts, openStatus }) {
  const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthPosts = Object.entries(posts).filter(([k]) => k.startsWith(prefix)).flatMap(([k, v]) => v.map(p => ({ ...p, date: k })));
  const byAccount = {};
  ACCOUNTS.forEach(a => { byAccount[a.id] = { total: 0, Photo: 0, Carrousel: 0, Reel: 0 }; });
  monthPosts.forEach(p => { if (p.account && byAccount[p.account]) { byAccount[p.account].total++; if (p.type) byAccount[p.account][p.type] = (byAccount[p.account][p.type] || 0) + 1; } });
  const numWeeks = getWeeksOfMonth(year, month).length;
  const dayAccountMap = {};
  monthPosts.forEach(p => { const key = `${p.date}-${p.account}`; dayAccountMap[key] = (dayAccountMap[key] || 0) + 1; });
  const conflicts = Object.entries(dayAccountMap).filter(([, c]) => c > 1);

  return (
    <div style={{ ...cardStyle, padding: 16, marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, letterSpacing: 1, textTransform: "uppercase", fontFamily: F, marginBottom: 14 }}>
        Récap — {MONTHS_FR[month]} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
        {ACCOUNTS.map(a => {
          const isOpen = openStatus[a.id] !== false;
          const target = isOpen ? numWeeks * 3 : numWeeks * 2;
          const actual = byAccount[a.id].total;
          const diff = actual - target;
          const ok = diff >= 0;
          const hasReel = byAccount[a.id].Reel > 0;
          return (
            <div key={a.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${a.color}22`, borderLeft: `3px solid ${a.color}`, background: C.surfaceSecondary }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: a.color, fontFamily: F }}>{a.id}</span>
                <span style={{ fontSize: 10, color: C.textSecondary, fontFamily: F }}>{isOpen ? "Ouvert" : "Fermé"}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 300, color: C.text, fontFamily: F }}>{actual}<span style={{ fontSize: 13, color: C.textSecondary }}>/{target}</span></div>
              <div style={{ fontSize: 10, color: ok ? C.green : C.red, fontFamily: F, marginTop: 2 }}>
                {ok ? "Objectif atteint" : `${Math.abs(diff)} post${Math.abs(diff) > 1 ? "s" : ""} manquant${Math.abs(diff) > 1 ? "s" : ""}`}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <Badge text={`${byAccount[a.id].Photo} Photo`} fg="#B8860B" border="#B8860B" />
                <Badge text={`${byAccount[a.id].Carrousel} Carr.`} fg="#2E7D6F" border="#2E7D6F" />
                <Badge text={`${byAccount[a.id].Reel} Reel`} fg="#8B3A62" border="#8B3A62" />
              </div>
              {!hasReel && actual > 0 && <div style={{ fontSize: 10, color: "#E67E22", marginTop: 4, fontFamily: F }}>Pas de Reel ce mois-ci</div>}
            </div>
          );
        })}
      </div>
      {conflicts.length > 0 && (
        <div style={{ padding: 10, borderRadius: 10, background: "#FFF3E0", border: "1px solid #FFE0B2", marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#E65100", fontFamily: F, marginBottom: 4 }}>Attention — posts en doublon</div>
          {conflicts.map(([key]) => {
            const [date, acc] = [key.substring(0, 10), key.substring(11)];
            return <div key={key} style={{ fontSize: 11, color: "#BF360C", fontFamily: F }}>{fmtDateFR(date)} : {acc} a {dayAccountMap[key]} posts le même jour</div>;
          })}
        </div>
      )}
    </div>
  );
}

function ExportButton({ year, month, posts }) {
  const [exporting, setExporting] = useState(false);
  const [showReadyView, setShowReadyView] = useState(false);
  const [filterAcc, setFilterAcc] = useState("all");
  const [copiedKey, setCopiedKey] = useState(null);

  const prefix = `${year}-${String(month+1).padStart(2,"0")}`;

  // Flatten all posts for the month sorted by date
  const allPosts = Object.entries(posts)
    .filter(([k]) => k.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([dateKey, dayPosts]) =>
      dayPosts.map((p, idx) => {
        const dow = new Date(dateKey).getDay();
        const isWe = dow === 0 || dow === 6;
        const time = p.account && BEST_TIMES[p.account] ? (isWe ? BEST_TIMES[p.account].weekend : BEST_TIMES[p.account].weekday) : "";
        const firstImage = (p.mediaItems || []).find(m =>
          (m.fileData && m.fileData.startsWith("data:image")) ||
          (m.url && (m.fileType?.startsWith("image/") || m.url.match(/\.(jpg|jpeg|png|webp|gif)/i)))
        );
        return { ...p, dateKey, time, idx, thumbSrc: firstImage?.fileData || firstImage?.url || null, imageUrl: firstImage?.url || null };
      })
    );

  const filtered = filterAcc === "all" ? allPosts : allPosts.filter(p => p.account === filterAcc);

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleCSVExport = () => {
    if (allPosts.length === 0) return;
    setExporting(true);

    // One CSV per account
    ACCOUNTS.forEach(acc => {
      const accPosts = allPosts.filter(p => p.account === acc.id);
      if (accPosts.length === 0) return;

      const rows = [
        ["Date", "Heure", "Type", "Statut", "Sujet", "Caption", "Image URL", "Crédits"],
        ...accPosts.map(p => [
          p.dateKey,
          p.time,
          p.type || "",
          p.status || "Brouillon",
          p.subject || "",
          `"${(p.caption || "").replace(/"/g, '""')}"`,
          p.imageUrl || "",
          p.credits || "",
        ])
      ];

      const csv = rows.map(r => r.join(";")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${acc.id}_${MONTHS_FR[month].toLowerCase()}_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });

    setExporting(false);
  };

  // ── Image URLs export (txt) ─────────────────────────────────────────────────
  const handleImageExport = () => {
    ACCOUNTS.forEach(acc => {
      const accPosts = allPosts.filter(p => p.account === acc.id && p.imageUrl);
      if (accPosts.length === 0) return;
      let text = `${acc.name} — Images ${MONTHS_FR[month]} ${year}\n${"=".repeat(50)}\n\n`;
      accPosts.forEach(p => {
        text += `${p.dateKey} | ${p.type || "?"} | ${p.time}\n`;
        text += `Sujet: ${p.subject || "—"}\n`;
        (p.mediaItems || []).forEach((m, i) => {
          if (m.url) text += `Image ${i+1}: ${m.url}\n`;
        });
        text += "\n";
      });
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${acc.id}_images_${MONTHS_FR[month].toLowerCase()}_${year}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const copyCaption = (key, caption) => {
    navigator.clipboard.writeText(caption);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (showReadyView) return (
    <div style={{ ...cardStyle, padding: 20, marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: F }}>Prêt à programmer</div>
          <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, marginTop: 2 }}>{MONTHS_FR[month]} {year} — {filtered.length} post{filtered.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleCSVExport} disabled={exporting}
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: C.green, color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 600 }}>
            ↓ CSV (Later/Buffer)
          </button>
          <button onClick={handleImageExport}
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: C.indigo, color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 600 }}>
            ↓ URLs images
          </button>
          <button onClick={() => setShowReadyView(false)}
            style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceSecondary, color: C.textSecondary, cursor: "pointer", fontSize: 12, fontFamily: F }}>
            Fermer
          </button>
        </div>
      </div>

      {/* Account filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setFilterAcc("all")} style={{ ...pillBtn(filterAcc === "all"), fontSize: 11, padding: "4px 12px" }}>Tous</button>
        {ACCOUNTS.map(a => (
          <button key={a.id} onClick={() => setFilterAcc(a.id)} style={{ ...pillBtn(filterAcc === a.id, a.color), fontSize: 11, padding: "4px 12px" }}>{a.id}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: C.textTertiary, padding: 40, fontSize: 13, fontFamily: F }}>Aucun post ce mois-ci</div>
      )}

      {/* Post cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((p, i) => {
          const acc = ACCOUNTS.find(a => a.id === p.account);
          const key = `${p.dateKey}-${p.account}-${p.idx}`;
          const isCopied = copiedKey === key;
          const [y, m, d] = p.dateKey.split("-");
          const dateObj = new Date(Number(y), Number(m)-1, Number(d));
          const dow = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][dateObj.getDay()];

          return (
            <div key={key} style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", background: C.surface, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              {/* Top bar */}
              <div style={{ padding: "10px 14px", background: acc ? `${acc.color}10` : C.surfaceSecondary, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: acc?.color, fontFamily: F }}>{p.account}</div>
                <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>{dow} {parseInt(d)} {MONTHS_FR[Number(m)-1]} {y}</div>
                {p.time && <div style={{ fontSize: 11, color: C.blue, fontFamily: F, background: `${C.blue}12`, padding: "2px 8px", borderRadius: 6 }}>🕐 {p.time}</div>}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <Badge text={p.type || "?"} fg={p.type === "Photo" ? "#B8860B" : p.type === "Reel" ? "#8B3A62" : "#2E7D6F"} border={p.type === "Photo" ? "#B8860B" : p.type === "Reel" ? "#8B3A62" : "#2E7D6F"} />
                  <Badge text={p.status || "Brouillon"} bg={p.status === "Validé" ? `${C.green}22` : p.status === "Publié" ? `${C.green}22` : `${C.orange}22`} fg={p.status === "Validé" || p.status === "Publié" ? C.green : C.orange} />
                </div>
              </div>

              {/* Content */}
              <div style={{ display: "flex", gap: 0 }}>
                {/* Image */}
                <div style={{ width: 120, minHeight: 120, flexShrink: 0, background: C.surfaceSecondary, borderRight: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.thumbSrc ? (
                    <img src={p.thumbSrc} style={{ width: 120, height: 120, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ textAlign: "center", padding: 10 }}>
                      <div style={{ fontSize: 24 }}>📷</div>
                      <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>Pas d'image</div>
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.subject && <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: F }}>{p.subject}</div>}
                  {p.caption ? (
                    <>
                      <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, lineHeight: 1.5, maxHeight: 80, overflow: "hidden", whiteSpace: "pre-wrap" }}>
                        {p.caption.slice(0, 200)}{p.caption.length > 200 ? "…" : ""}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                        <button onClick={() => copyCaption(key, p.caption)}
                          style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: isCopied ? C.green : C.blue, color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 600, transition: "background .2s" }}>
                          {isCopied ? "✓ Copié !" : "Copier la caption"}
                        </button>
                        {p.imageUrl && (
                          <a href={p.imageUrl} target="_blank" rel="noopener noreferrer"
                            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surfaceSecondary, color: C.text, cursor: "pointer", fontSize: 12, fontFamily: F, textDecoration: "none", fontWeight: 500 }}>
                            Ouvrir l'image ↗
                          </a>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, fontStyle: "italic" }}>Pas de caption encore</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
      <button onClick={() => setShowReadyView(true)}
        style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.blue, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F, fontWeight: 600, boxShadow: `0 2px 8px ${C.blue}44` }}>
        📋 Voir les posts prêts à programmer
      </button>
      <button onClick={handleCSVExport} disabled={exporting}
        style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.green, color: "#fff", cursor: exporting ? "default" : "pointer", fontSize: 13, fontFamily: F, fontWeight: 600, boxShadow: `0 2px 8px ${C.green}44` }}>
        {exporting ? "Export..." : "↓ Exporter CSV"}
      </button>
    </div>
  );
}

function CalendarMonth({ year, month, posts, onDayClick, selectedDay, onDeletePost, onDropPost }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const [dragOver, setDragOver] = useState(null);

  return (
    <div style={{ ...cardStyle }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${C.border}` }}>
        {DAYS_FR.map(d => <div key={d} style={{ padding: "10px 0", textAlign: "center", fontFamily: F, fontSize: 11, fontWeight: 600, color: C.textTertiary, letterSpacing: 1, textTransform: "uppercase", background: C.surfaceSecondary }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((day, i) => {
          const dateKey = day ? fmtDate(year, month, day) : null;
          const dayPosts = dateKey ? (posts[dateKey] || []) : [];
          const isSel = day === selectedDay;
          const isWe = i % 7 >= 5;
          const isDragTarget = dragOver === dateKey;
          const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
          return (
            <div key={i}
              onClick={() => day && onDayClick(day)}
              onDragOver={e => { if (!dateKey) return; e.preventDefault(); setDragOver(dateKey); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault(); setDragOver(null);
                if (!dateKey) return;
                try { const data = JSON.parse(e.dataTransfer.getData("text/plain")); if (data.fromDateKey !== dateKey) onDropPost(data.fromDateKey, data.fromIndex, dateKey); } catch {}
              }}
              style={{ minHeight: 90, padding: "6px 6px 4px", borderRight: (i+1) % 7 !== 0 ? `1px solid ${C.border}` : "none", borderBottom: `1px solid ${C.border}`, cursor: day ? "pointer" : "default", background: isDragTarget ? `${C.blue}08` : isSel ? `${C.blue}06` : isWe && day ? C.surfaceSecondary : day ? C.surface : C.surfaceSecondary, transition: "background .12s", position: "relative", outline: isDragTarget ? `2px dashed ${C.blue}` : "none" }}>
              {day && (<>
                <div style={{ fontSize: 13, fontWeight: isToday ? 700 : isSel ? 600 : 400, color: isToday ? "#fff" : isSel ? C.blue : isWe ? C.textSecondary : C.text, fontFamily: F, marginBottom: 4, width: 22, height: 22, borderRadius: "50%", background: isToday ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {dayPosts.map((p, j) => {
                    const acc = ACCOUNTS.find(a => a.id === p.account);
                    const statusMap = {
                      "Brouillon": { letter: "B", bg: "#FF9500" },
                      "En cours": { letter: "•", bg: C.blue },
                      "Validé": { letter: "✓", bg: C.green },
                      "Programmé": { letter: "P", bg: C.indigo },
                      "Publié": { letter: "✓", bg: C.green },
                    };
                    const st = statusMap[p.status || "Brouillon"] || statusMap["Brouillon"];
                    const firstImage = (p.mediaItems || []).find(m => (m.fileData && m.fileData.startsWith("data:image")) || (m.url && (m.fileType?.startsWith("image/") || m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));
                    const thumbSrc = firstImage?.fileData || firstImage?.url;
                    return (
                      <div key={j} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", JSON.stringify({ fromDateKey: dateKey, fromIndex: j })); }}
                        onClick={e => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center", gap: 3, cursor: "grab", borderRadius: 5, padding: "1px 0" }}>
                        {thumbSrc ? (
                          <img src={thumbSrc} style={{ width: 16, height: 16, borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 16, height: 16, borderRadius: 3, background: acc?.color ? `${acc.color}30` : "#F0F0F0", flexShrink: 0 }} />
                        )}
                        <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", fontSize: 9, fontWeight: 600, fontFamily: F, lineHeight: 1 }}>
                          <span style={{ padding: "2px 4px", background: acc?.color || C.textSecondary, color: "#fff" }}>{p.account}</span>
                          <span style={{ padding: "2px 4px", background: acc ? `${acc.color}18` : "#F5F5F5", color: acc?.color || "#666" }}>{p.type || "—"}</span>
                        </div>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: st.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ color: "#fff", fontSize: 7, fontWeight: 700 }}>{st.letter}</span>
                        </span>
                        <span onClick={e => { e.stopPropagation(); onDeletePost(dateKey, j); }}
                          style={{ fontSize: 11, color: C.textTertiary, cursor: "pointer", marginLeft: "auto", padding: "0 2px", lineHeight: 1 }}
                          onMouseEnter={e => e.target.style.color = C.red}
                          onMouseLeave={e => e.target.style.color = C.textTertiary}>×</span>
                      </div>
                    );
                  })}
                </div>
                {dayPosts.length === 0 && <div style={{ fontSize: 16, color: C.border, position: "absolute", bottom: 4, right: 6, fontWeight: 300 }}>+</div>}
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostEditor({ post, dateKey, index, onUpdate, onDelete, onGenerate, onDuplicate, generating }) {
  const acc = ACCOUNTS.find(a => a.id === post.account);
  const [copied, setCopied] = useState(false);
  const [showDup, setShowDup] = useState(false);
  const [dupDate, setDupDate] = useState("");
  const [dupAccount, setDupAccount] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  // Suggested time
  const dow = new Date(dateKey).getDay();
  const isWeekend = dow === 0 || dow === 6;
  const suggestedTime = post.account && BEST_TIMES[post.account] ? (isWeekend ? BEST_TIMES[post.account].weekend : BEST_TIMES[post.account].weekday) : null;

  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 10, borderLeft: `3px solid ${acc?.color || C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select value={post.account} onChange={e => onUpdate("account", e.target.value)} style={selectStyle}>
          <option value="">Compte</option>
          {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
        </select>
        <select value={post.type} onChange={e => onUpdate("type", e.target.value)} style={selectStyle}>
          <option value="">Type</option>
          {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={post.status || "Brouillon"} onChange={e => onUpdate("status", e.target.value)}
          style={{ ...selectStyle, background: post.status === "Validé" ? "#E8F5E9" : post.status === "Programmé" ? "#E3EDF7" : post.status === "Publié" ? "#F5F5F5" : "#FFF8E1" }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowDup(!showDup)} style={{ background: "none", border: "1px solid #D0D5DD", borderRadius: 6, color: C.textSecondary, cursor: "pointer", fontSize: 10, padding: "2px 8px", fontFamily: F }} title="Dupliquer">Dupliquer</button>
        <button onClick={onDelete} style={{ background: "none", border: "none", color: C.textTertiary, cursor: "pointer", fontSize: 16, padding: "2px 6px" }} title="Supprimer">×</button>
      </div>

      {showDup && (
        <div style={{ padding: 10, marginBottom: 10, background: C.surfaceSecondary, borderRadius: 10, border: "1px solid #E8E8E8" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text, marginBottom: 6, fontFamily: F, letterSpacing: 0.5, textTransform: "uppercase" }}>Dupliquer ce post</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" value={dupDate} onChange={e => setDupDate(e.target.value)} style={{ ...selectStyle, fontSize: 11 }} />
            <select value={dupAccount} onChange={e => setDupAccount(e.target.value)} style={{ ...selectStyle, fontSize: 11 }}>
              <option value="">Même compte</option>
              {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
            </select>
            <button onClick={() => {
              if (dupDate) { onDuplicate(dupDate, dupAccount || post.account); setShowDup(false); setDupDate(""); setDupAccount(""); }
            }} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #1A365D", background: C.text, color: "#fff", cursor: "pointer", fontSize: 10, fontFamily: F }}>OK</button>
          </div>
        </div>
      )}

      {suggestedTime && (
        <div style={{ fontSize: 10, color: C.blue, fontFamily: F, marginBottom: 8, padding: "4px 8px", background: "#F0F6FC", borderRadius: 6, display: "inline-block" }}>
          Horaire suggéré : {suggestedTime} ({isWeekend ? "weekend" : "semaine"})
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Sujet</label>
          {post.account && SUBJECT_BANK[post.account] && (
            <button onClick={() => {
              const subjects = SUBJECT_BANK[post.account];
              const random = subjects[Math.floor(Math.random() * subjects.length)];
              onUpdate("subject", random);
            }} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid #D0D5DD", background: C.surfaceSecondary, cursor: "pointer", color: "#666", fontFamily: F }}>
              Générer un sujet
            </button>
          )}
        </div>
        <input value={post.subject || ""} onChange={e => onUpdate("subject", e.target.value)}
          onBlur={e => { if (e.target.value.trim() && post.account && !post.caption) onGenerate(); }}
          placeholder="Ex: Vue panoramique depuis la terrasse..." style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Crédits (optionnel)</label>
        <input value={post.credits || ""} onChange={e => onUpdate("credits", e.target.value)}
          placeholder="Ex: Photo @nom_photographe / Chef @nom_chef" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Médias</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(post.mediaItems || []).map((item, i) => (
              <div key={i} style={{ padding: "6px 10px", background: C.surfaceSecondary, borderRadius: 8, border: "1px solid #E8E8E8" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={item.name || ""} onChange={e => {
                    const items = [...(post.mediaItems || [])];
                    items[i] = { ...items[i], name: e.target.value };
                    onUpdate("mediaItems", items);
                  }} placeholder="Nom du fichier" style={{ ...inputStyle, flex: 1, fontSize: 11, padding: "4px 6px" }} />
                  <label style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #4A9FCC", background: "#fff", color: C.teal, cursor: "pointer", fontSize: 10, fontFamily: F, fontWeight: 500, whiteSpace: "nowrap" }}>
                    {item.fileData ? "Changer" : "Uploader"}
                    <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const items = [...(post.mediaItems || [])];
                        items[i] = { ...items[i], fileData: reader.result, fileName: file.name, name: items[i].name || file.name };
                        onUpdate("mediaItems", items);
                      };
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  <span onClick={() => {
                    const items = [...(post.mediaItems || [])];
                    items.splice(i, 1);
                    onUpdate("mediaItems", items);
                  }} style={{ fontSize: 14, color: C.textTertiary, cursor: "pointer", padding: "0 4px" }} onMouseEnter={e => e.target.style.color = C.red} onMouseLeave={e => e.target.style.color = C.textTertiary}>×</span>
                </div>
                {/* Thumbnail preview */}
                {item.fileData && item.fileData.startsWith("data:image") && (
                  <img src={item.fileData} style={{ marginTop: 6, maxWidth: 120, maxHeight: 80, borderRadius: 6, objectFit: "cover", border: "1px solid #E8E8E8" }} />
                )}
                {item.url && item.fileType?.startsWith("image/") && !item.fileData && (
                  <img src={item.url} style={{ marginTop: 6, maxWidth: 120, maxHeight: 80, borderRadius: 6, objectFit: "cover", border: "1px solid #E8E8E8" }} />
                )}
                {item.fileData && item.fileData.startsWith("data:video") && (
                  <div style={{ marginTop: 6, fontSize: 10, color: C.teal, fontFamily: F }}>Vidéo : {item.fileName || "uploadée"}</div>
                )}
                {/* Google Drive link */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                  <input value={item.driveUrl || ""} onChange={e => {
                    const items = [...(post.mediaItems || [])];
                    items[i] = { ...items[i], driveUrl: e.target.value };
                    onUpdate("mediaItems", items);
                  }} placeholder="Lien Google Drive (optionnel)" style={{ ...inputStyle, fontSize: 10, padding: "3px 6px", flex: 1 }} />
                  {item.driveUrl && <a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.teal, textDecoration: "none", whiteSpace: "nowrap" }}>Ouvrir</a>}
                </div>
              </div>
          ))}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => {
              const items = [...(post.mediaItems || [])];
              items.push({ name: "", fileData: null, fileName: "", driveUrl: "" });
              onUpdate("mediaItems", items);
            }} style={{ flex: 1, padding: "6px 12px", borderRadius: 8, border: "1px dashed #D0D5DD", background: C.surfaceSecondary, cursor: "pointer", fontSize: 11, color: C.textSecondary, fontFamily: F, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              + Uploader un média
            </button>
            <button onClick={() => setShowLibrary(true)}
              style={{ flex: 1, padding: "6px 12px", borderRadius: 8, border: "1px dashed #1A365D", background: "#F0F4FA", cursor: "pointer", fontSize: 11, color: C.text, fontFamily: F, display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontWeight: 500 }}>
              📁 Choisir depuis la librairie
            </button>
          </div>
          {(post.mediaItems || []).length > 0 && (
            <div style={{ fontSize: 10, color: C.textSecondary, fontFamily: F }}>
              {(post.mediaItems || []).length} média{(post.mediaItems || []).length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
      {showLibrary && (
        <LibraryPicker
          onClose={() => setShowLibrary(false)}
          accountHint={post.account || "all"}
          onSelect={item => {
            const items = [...(post.mediaItems || [])];
            items.push({ name: item.name, url: item.url, fileType: item.fileType, fileName: item.name, fileData: null, driveUrl: "" });
            onUpdate("mediaItems", items);
          }}
        />
      )}

      {/* Analyze image button — shown when there's an image and an account selected */}
      {(() => {
        const firstImage = (post.mediaItems || []).find(m =>
          (m.fileData && m.fileData.startsWith("data:image")) ||
          (m.url && (m.fileType?.startsWith("image/") || m.url.match(/\.(jpg|jpeg|png|webp|gif)/i)))
        );
        if (!firstImage || !post.account) return null;
        return (
          <button
            disabled={analyzingImage || generating}
            onClick={async () => {
              setAnalyzingImage(true);
              const result = await analyzeImageAndGenerate(
                firstImage.url || null,
                firstImage.fileData || null,
                post.account,
                post.credits || ""
              );
              if (result.subject) onUpdate("subject", result.subject);
              if (result.caption) onUpdate("caption", result.caption);
              setAnalyzingImage(false);
            }}
            style={{
              width: "100%", padding: "10px 16px", borderRadius: 10, border: "none",
              background: analyzingImage ? C.surfaceSecondary : `linear-gradient(135deg, ${C.indigo}, ${C.blue})`,
              color: analyzingImage ? C.textSecondary : "#fff",
              cursor: analyzingImage ? "default" : "pointer",
              fontSize: 13, fontFamily: F, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: 10, transition: "all .2s",
              boxShadow: analyzingImage ? "none" : `0 2px 12px ${C.blue}44`,
            }}>
            {analyzingImage ? (
              <>
                <span style={{ fontSize: 14 }}>⏳</span>
                Analyse de l'image en cours...
              </>
            ) : (
              <>
                <span style={{ fontSize: 14 }}>✨</span>
                Analyser l'image et générer la caption
              </>
            )}
          </button>
        );
      })()}
      {post.caption && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label style={labelStyle}>Caption</label>
            <button onClick={onGenerate} disabled={generating || !post.subject || !post.account}
              style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "1px solid #D0D5DD", background: C.surfaceSecondary, cursor: "pointer", color: "#666", fontFamily: F }}>Regénérer</button>
          </div>
          <textarea value={post.caption} onChange={e => onUpdate("caption", e.target.value)}
            rows={12} style={{ ...inputStyle, lineHeight: 1.6, minHeight: 200, resize: "vertical" }} />
        </div>
      )}
      {post.caption && (
        <button onClick={() => { navigator.clipboard.writeText(post.caption); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #1A365D", background: copied ? C.green : C.text, color: "#fff", cursor: "pointer", fontSize: 11, fontFamily: F, letterSpacing: 0.5, fontWeight: 500, transition: "background .2s" }}>
          {copied ? "Copié !" : "Copier la caption"}
        </button>
      )}
    </div>
  );
}

function DayView({ year, month, day, dateKey, dayName, posts, setPosts, onClose }) {
  const [generatingKey, setGeneratingKey] = useState(null);
  const handleGenerate = async (index) => {
    const post = posts[dateKey]?.[index];
    if (!post?.subject || !post?.account) return;
    setGeneratingKey(index);
    const caption = await generateCaption(post.subject, post.account, post.credits || "");
    setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp[index] = { ...dp[index], caption }; u[dateKey] = dp; return u; });
    setGeneratingKey(null);
  };
  const addPost = () => { setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp.push({ account: "", type: "", subject: "", caption: "", credits: "", mediaItems: [], status: "Brouillon" }); u[dateKey] = dp; return u; }); };
  const updatePost = (index, field, value) => { setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp[index] = { ...dp[index], [field]: value }; u[dateKey] = dp; return u; }); };
  const deletePost = (index) => { setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp.splice(index, 1); if (dp.length === 0) delete u[dateKey]; else u[dateKey] = dp; return u; }); };
  const duplicatePost = (index, targetDate, targetAccount) => {
    const post = posts[dateKey]?.[index];
    if (!post) return;
    setPosts(prev => { const u = { ...prev }; const dp = [...(u[targetDate] || [])]; dp.push({ ...post, account: targetAccount, status: "Brouillon" }); u[targetDate] = dp; return u; });
  };
  const dayPosts = posts[dateKey] || [];

  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, marginTop: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontFamily: F, fontSize: 17, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.2 }}>
          {dayName} {day} {MONTHS_FR[month]} {year}
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={addPost} style={{ padding: "7px 16px", borderRadius: 10, border: "none", background: C.blue, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F, fontWeight: 600, boxShadow: `0 2px 8px ${C.blue}44` }}>+ Ajouter</button>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceSecondary, color: C.textSecondary, cursor: "pointer", fontSize: 13, fontFamily: F }}>Fermer</button>
        </div>
      </div>
      {dayPosts.length === 0 && <div style={{ padding: 30, textAlign: "center", color: C.textTertiary, fontSize: 14, fontFamily: F }}>Aucun post prévu — cliquez sur "+ Ajouter"</div>}
      {dayPosts.map((post, idx) => (
        <PostEditor key={idx} post={post} dateKey={dateKey} index={idx}
          generating={generatingKey === idx}
          onUpdate={(field, val) => { updatePost(idx, field, val); if (field === "account" && posts[dateKey]?.[idx]?.subject && val) setTimeout(() => handleGenerate(idx), 300); }}
          onDelete={() => deletePost(idx)}
          onGenerate={() => handleGenerate(idx)}
          onDuplicate={(targetDate, targetAccount) => duplicatePost(idx, targetDate, targetAccount)} />
      ))}
    </div>
  );
}

function WeekView({ year, month, weekDays, posts, setPosts }) {
  const [generatingKey, setGeneratingKey] = useState(null);
  const handleGenerate = async (dateKey, index) => {
    const post = posts[dateKey]?.[index];
    if (!post?.subject || !post?.account) return;
    setGeneratingKey(`${dateKey}-${index}`);
    const caption = await generateCaption(post.subject, post.account, post.credits || "");
    setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp[index] = { ...dp[index], caption }; u[dateKey] = dp; return u; });
    setGeneratingKey(null);
  };
  const addPost = (dateKey) => { setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp.push({ account: "", type: "", subject: "", caption: "", credits: "", mediaItems: [], status: "Brouillon" }); u[dateKey] = dp; return u; }); };
  const updatePost = (dateKey, index, field, value) => { setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp[index] = { ...dp[index], [field]: value }; u[dateKey] = dp; return u; }); };
  const deletePost = (dateKey, index) => { setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp.splice(index, 1); if (dp.length === 0) delete u[dateKey]; else u[dateKey] = dp; return u; }); };
  const duplicatePost = (dateKey, index, targetDate, targetAccount) => {
    const post = posts[dateKey]?.[index];
    if (!post) return;
    setPosts(prev => {
      const u = { ...prev };
      const dp = [...(u[targetDate] || [])];
      dp.push({ ...post, account: targetAccount, status: "Brouillon" });
      u[targetDate] = dp;
      return u;
    });
  };

  return (
    <div style={{ background: C.surfaceSecondary, borderRadius: 12, border: "1px solid #E8E8E8", padding: 20, marginTop: 16 }}>
      <h3 style={{ fontFamily: F, fontSize: 16, fontWeight: 500, color: C.text, margin: "0 0 16px", letterSpacing: 1, textTransform: "uppercase" }}>
        Semaine du {weekDays[0]} au {weekDays[weekDays.length - 1]} {MONTHS_FR[month]}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {weekDays.map(day => {
          const dateKey = fmtDate(year, month, day);
          const dow = new Date(year, month, day).getDay();
          const mb = dow === 0 ? 6 : dow - 1;
          const dayPosts = posts[dateKey] || [];
          return (
            <div key={day} style={{ background: "#fff", borderRadius: 10, border: "1px solid #ECECEC", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: F, fontSize: 22, fontWeight: 300, color: C.text }}>{day}</span>
                  <span style={{ fontFamily: F, fontSize: 12, color: C.textSecondary, marginLeft: 8, letterSpacing: 1, textTransform: "uppercase" }}>{DAYS_FULL[mb]}</span>
                </div>
                <button onClick={() => addPost(dateKey)} style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #D0D5DD", background: "#fff", cursor: "pointer", fontSize: 16, color: C.text, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
              {dayPosts.length === 0 && <div style={{ padding: 20, textAlign: "center", color: C.textTertiary, fontSize: 12, fontStyle: "italic", fontFamily: F }}>Aucun post prévu</div>}
              {dayPosts.map((post, idx) => (
                <PostEditor key={idx} post={post} dateKey={dateKey} index={idx}
                  generating={generatingKey === `${dateKey}-${idx}`}
                  onUpdate={(field, val) => { updatePost(dateKey, idx, field, val); if (field === "account" && posts[dateKey]?.[idx]?.subject && val) setTimeout(() => handleGenerate(dateKey, idx), 300); }}
                  onDelete={() => deletePost(dateKey, idx)}
                  onGenerate={() => handleGenerate(dateKey, idx)}
                  onDuplicate={(targetDate, targetAccount) => duplicatePost(dateKey, idx, targetDate, targetAccount)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HashtagBank() {
  const [sel, setSel] = useState("APG");
  const bank = HASHTAG_BANK[sel];
  const [copied, setCopied] = useState(null);
  return (
    <div style={{ ...cardStyle, padding: 20, marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, letterSpacing: 1, textTransform: "uppercase", fontFamily: F, marginBottom: 12 }}>Banque de hashtags</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {ACCOUNTS.map(a => (
          <button key={a.id} onClick={() => setSel(a.id)} style={{ padding: "6px 16px", borderRadius: 8, border: `1px solid ${a.color}`, background: sel === a.id ? a.color : "#fff", color: sel === a.id ? "#fff" : a.color, cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 600, letterSpacing: 0.5, transition: "all .15s" }}>{a.id}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 12, fontFamily: F }}>{ACCOUNTS.find(a => a.id === sel)?.name}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {Object.entries(bank).map(([cat, tags]) => (
          <div key={cat} style={{ background: C.surfaceSecondary, borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: F, letterSpacing: 0.5, textTransform: "uppercase" }}>{cat}</span>
              <button onClick={() => { navigator.clipboard.writeText(tags.join(" ")); setCopied(cat); setTimeout(() => setCopied(null), 1500); }}
                style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, border: "1px solid #D0D5DD", background: copied === cat ? C.green : "#fff", color: copied === cat ? "#fff" : C.textSecondary, cursor: "pointer", fontFamily: F, transition: "all .2s" }}>
                {copied === cat ? "Copié !" : "Copier tout"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {tags.map(tag => (
                <span key={tag} onClick={() => navigator.clipboard.writeText(tag)} style={{ padding: "2px 8px", borderRadius: 6, background: "#fff", border: "1px solid #E0E0E0", fontSize: 11, color: "#555", cursor: "pointer", fontFamily: "monospace", transition: "all .1s" }} title="Cliquer pour copier">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedPreview({ posts }) {
  const [selectedAccount, setSelectedAccount] = useState("APG");

  // Collect all posts for this account, sorted by date descending (most recent first)
  const allPosts = Object.entries(posts)
    .flatMap(([dateKey, dayPosts]) =>
      dayPosts
        .filter(p => p.account === selectedAccount)
        .map(p => ({ ...p, dateKey }))
    )
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const acc = ACCOUNTS.find(a => a.id === selectedAccount);

  // Build rows of 3, left = most recent
  const rows = [];
  for (let i = 0; i < allPosts.length; i += 3) rows.push(allPosts.slice(i, i + 3));

  const [lightbox, setLightbox] = useState(null);

  const getThumb = (p) => {
    const img = (p.mediaItems || []).find(m =>
      (m.fileData && m.fileData.startsWith("data:image")) ||
      (m.url && (m.fileType?.startsWith("image/") || m.url.match(/\.(jpg|jpeg|png|webp|gif)/i)))
    );
    return img?.fileData || img?.url || null;
  };

  const typeColors = { Photo: "#B8860B", Carrousel: "#2E7D6F", Reel: "#8B3A62" };
  const statusColors = { Brouillon: "#F5C542", "En cours": "#7BC67E", Validé: "#1B5E20", Programmé: "#E67E22", Publié: C.green };

  return (
    <div style={{ marginTop: 16 }}>
      {/* Account selector */}
      <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.text, letterSpacing: 1, textTransform: "uppercase", fontFamily: F, marginBottom: 12 }}>
          Preview du feed Instagram
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ACCOUNTS.map(a => (
            <button key={a.id} onClick={() => setSelectedAccount(a.id)}
              style={{ padding: "6px 18px", borderRadius: 20, border: `2px solid ${a.color}`, background: selectedAccount === a.id ? a.color : "#fff", color: selectedAccount === a.id ? "#fff" : a.color, cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 700, transition: "all .15s" }}>
              {a.id}
            </button>
          ))}
        </div>
      </div>

      {/* Instagram mock */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {/* Profile header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #E8E8E8", display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${acc?.color}, ${acc?.color}88)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid #E8E8E8" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: F }}>{selectedAccount[0]}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A", fontFamily: F }}>{acc?.name}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, marginTop: 2 }}>{allPosts.length} post{allPosts.length !== 1 ? "s" : ""} planifié{allPosts.length !== 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* Feed grid */}
        {allPosts.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14, color: C.textSecondary, fontFamily: F }}>Aucun post planifié pour {selectedAccount}</div>
            <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>Créez des posts dans le calendrier pour les voir ici</div>
          </div>
        ) : (
          <div>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
                {row.map((p, ci) => {
                  const thumb = getThumb(p);
                  return (
                    <div key={ci} onClick={() => setLightbox(p)}
                      style={{ aspectRatio: "1", position: "relative", cursor: "pointer", background: acc ? `${acc.color}18` : "#F5F5F5", overflow: "hidden" }}
                      onMouseEnter={e => e.currentTarget.querySelector(".overlay").style.opacity = "1"}
                      onMouseLeave={e => e.currentTarget.querySelector(".overlay").style.opacity = "0"}>
                      {thumb ? (
                        <img src={thumb} alt={p.subject || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8 }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>📷</div>
                          <div style={{ fontSize: 9, color: acc?.color, fontFamily: F, textAlign: "center", fontWeight: 500, lineHeight: 1.3 }}>{p.subject || "Sans sujet"}</div>
                        </div>
                      )}
                      {/* Type badge top-right */}
                      <div style={{ position: "absolute", top: 4, right: 4 }}>
                        {p.type === "Carrousel" && <span style={{ background: "rgba(0,0,0,.55)", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#fff", fontFamily: F }}>❏</span>}
                        {p.type === "Reel" && <span style={{ background: "rgba(0,0,0,.55)", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#fff", fontFamily: F }}>▶</span>}
                      </div>
                      {/* Hover overlay */}
                      <div className="overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", opacity: 0, transition: "opacity .2s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8 }}>
                        <div style={{ fontSize: 11, color: "#fff", fontFamily: F, fontWeight: 600, textAlign: "center", lineHeight: 1.3, marginBottom: 4 }}>{p.subject || "Sans sujet"}</div>
                        <div style={{ fontSize: 10, color: "#ddd", fontFamily: F }}>{fmtDateFR(p.dateKey)}</div>
                        <div style={{ marginTop: 4, width: 8, height: 8, borderRadius: "50%", background: statusColors[p.status || "Brouillon"] }} title={p.status || "Brouillon"} />
                      </div>
                    </div>
                  );
                })}
                {/* Fill empty cells in last row */}
                {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                  <div key={`e-${i}`} style={{ aspectRatio: "1", background: C.surfaceSecondary }} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox — post detail */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", display: "flex", maxWidth: "min(860px, 95vw)", width: "100%", maxHeight: "85vh" }}>
            {/* Image side */}
            <div style={{ flex: "0 0 55%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getThumb(lightbox) ? (
                <img src={getThumb(lightbox)} style={{ maxWidth: "100%", maxHeight: "85vh", objectFit: "contain" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                  <div style={{ fontSize: 13, textAlign: "center" }}>Pas d'image</div>
                </div>
              )}
            </div>
            {/* Info side */}
            <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: acc?.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: F }}>{lightbox.account}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F, color: "#1A1A1A" }}>{acc?.name}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F }}>{fmtDateFR(lightbox.dateKey)}</div>
                </div>
                <button onClick={() => setLightbox(null)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textSecondary }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 8px", borderRadius: 6, background: typeColors[lightbox.type] + "22", color: typeColors[lightbox.type], fontSize: 10, fontFamily: F, fontWeight: 600 }}>{lightbox.type}</span>
                <span style={{ padding: "2px 8px", borderRadius: 6, background: statusColors[lightbox.status || "Brouillon"] + "22", color: statusColors[lightbox.status || "Brouillon"], fontSize: 10, fontFamily: F, fontWeight: 600 }}>{lightbox.status || "Brouillon"}</span>
              </div>
              {lightbox.subject && <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A", fontFamily: F, marginBottom: 8 }}>{lightbox.subject}</div>}
              {lightbox.caption && (
                <div style={{ fontSize: 12, color: "#333", fontFamily: F, lineHeight: 1.6, whiteSpace: "pre-wrap", flex: 1 }}>{lightbox.caption}</div>
              )}
              {!lightbox.caption && <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, fontStyle: "italic" }}>Pas de caption</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Archive({ posts }) {
  // Get all months that have posts
  const monthKeys = new Set();
  Object.keys(posts).forEach(k => { monthKeys.add(k.substring(0, 7)); }); // "2026-04"
  const sortedMonths = [...monthKeys].sort().reverse();

  const [expanded, setExpanded] = useState(null);

  if (sortedMonths.length === 0) return (
    <div style={{ ...cardStyle, padding: 30, marginTop: 16, textAlign: "center" }}>
      <div style={{ color: C.textTertiary, fontSize: 13, fontFamily: F }}>Aucun historique pour le moment</div>
      <div style={{ color: "#DDD", fontSize: 11, fontFamily: F, marginTop: 4 }}>Les mois avec des posts apparaîtront ici</div>
    </div>
  );

  return (
    <div style={{ ...cardStyle, padding: 20, marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, letterSpacing: 1, textTransform: "uppercase", fontFamily: F, marginBottom: 14 }}>Historique</div>
      {sortedMonths.map(mk => {
        const [y, m] = mk.split("-").map(Number);
        const monthEntries = Object.entries(posts).filter(([k]) => k.startsWith(mk)).sort(([a], [b]) => a.localeCompare(b));
        const totalPosts = monthEntries.reduce((sum, [, v]) => sum + v.length, 0);
        const byAcc = {}; ACCOUNTS.forEach(a => { byAcc[a.id] = 0; });
        monthEntries.forEach(([, v]) => v.forEach(p => { if (p.account && byAcc[p.account] !== undefined) byAcc[p.account]++; }));
        const byType = { Photo: 0, Carrousel: 0, Reel: 0 };
        monthEntries.forEach(([, v]) => v.forEach(p => { if (p.type) byType[p.type] = (byType[p.type] || 0) + 1; }));
        const isExp = expanded === mk;

        return (
          <div key={mk} style={{ marginBottom: 8 }}>
            <button onClick={() => setExpanded(isExp ? null : mk)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, border: "1px solid #E8E8E8", background: isExp ? C.surfaceSecondary : "#fff", cursor: "pointer", fontFamily: F }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{MONTHS_FR[m - 1]} {y}</span>
                <span style={{ fontSize: 12, color: C.textSecondary }}>{totalPosts} posts</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {ACCOUNTS.map(a => byAcc[a.id] > 0 ? <Badge key={a.id} text={`${a.id}: ${byAcc[a.id]}`} bg={a.color} fg="#fff" /> : null)}
                <span style={{ fontSize: 14, color: C.textSecondary, marginLeft: 8 }}>{isExp ? "−" : "+"}</span>
              </div>
            </button>
            {isExp && (
              <div style={{ padding: 12, borderLeft: "2px solid #E8E8E8", marginLeft: 14, marginTop: 4 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Badge text={`${byType.Photo} Photos`} fg="#B8860B" border="#B8860B" />
                  <Badge text={`${byType.Carrousel} Carrousels`} fg="#2E7D6F" border="#2E7D6F" />
                  <Badge text={`${byType.Reel} Reels`} fg="#8B3A62" border="#8B3A62" />
                </div>
                {monthEntries.map(([dateKey, dayPosts]) => (
                  dayPosts.map((p, idx) => (
                    <div key={`${dateKey}-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F5F5F5", fontSize: 12, fontFamily: F }}>
                      <span style={{ color: C.textSecondary, minWidth: 60 }}>{fmtDateFR(dateKey)}</span>
                      <Badge text={p.account} bg={ACCOUNTS.find(a => a.id === p.account)?.color} fg="#fff" />
                      <Badge text={p.type} fg={p.type === "Photo" ? "#B8860B" : p.type === "Reel" ? "#8B3A62" : "#2E7D6F"} border={p.type === "Photo" ? "#B8860B" : p.type === "Reel" ? "#8B3A62" : "#2E7D6F"} />
                      <span style={{ color: "#333", flex: 1 }}>{p.subject || "—"}</span>
                      <span style={{ color: C.textSecondary, fontSize: 10 }}>{p.status || "Brouillon"}</span>
                    </div>
                  ))
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Library (full page) ──────────────────────────────────────────────────────
function Library({ library, setLibrary, posts, setPosts, year, month, accountSettings }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [uploadAccount, setUploadAccount] = useState("all");
  const fileInputRef = useRef(null);

  // ── Batch mode state ────────────────────────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [batchAccount, setBatchAccount] = useState("APG");
  const [batchGroups, setBatchGroups] = useState([]); // [{images: [...], type: "Photo"|"Carrousel"|"Reel"}]
  const [batchSelected, setBatchSelected] = useState([]); // ids of selected images
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, label: "" });

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) { alert("Cloudinary non configuré"); return; }
    setUploading(true); setProgress(0);
    const total = files.length;
    const added = [];
    const account = uploadAccount === "all" ? null : uploadAccount;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      fd.append("folder", account ? `oh_library/${account}` : "oh_library");
      const xhr = new XMLHttpRequest();
      await new Promise((res, rej) => {
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(((i + e.loaded / e.total) / total) * 100)); };
        xhr.onload = async () => {
          if (xhr.status === 200) {
            const r = JSON.parse(xhr.responseText);
            const entry = { url: r.secure_url, publicId: r.public_id, name: file.name, fileType: file.type, account: account || null, uploadedAt: new Date().toISOString() };
            if (db) { const ref = await addDoc(collection(db, "library"), entry); added.push({ id: ref.id, ...entry }); }
            else added.push({ id: Date.now() + i, ...entry });
            res();
          } else rej();
        };
        xhr.onerror = rej;
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);
        xhr.send(fd);
      });
    }
    setLibrary(prev => [...added, ...prev]);
    setUploading(false); setProgress(0);
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Supprimer de la librairie ?")) return;
    if (db) { try { await deleteDoc(doc(db, "library", item.id)); } catch {} }
    setLibrary(prev => prev.filter(x => x.id !== item.id));
  };

  const filtered = library
    .filter(x => selectedAccount === "all" ? true : (x.account === selectedAccount))
    .filter(x => (x.name || "").toLowerCase().includes(search.toLowerCase()));

  const countFor = (id) => id === "all" ? library.length : library.filter(x => x.account === id).length;

  // ── Batch helpers ────────────────────────────────────────────────────────────

  const toggleBatchSelect = (item) => {
    setBatchSelected(prev =>
      prev.find(x => x.id === item.id)
        ? prev.filter(x => x.id !== item.id)
        : [...prev, item]
    );
  };

  const addGroup = () => {
    if (batchSelected.length === 0) return;
    const type = batchSelected.length === 1 ? "Photo" : "Carrousel";
    setBatchGroups(prev => [...prev, { images: [...batchSelected], type, id: Date.now() }]);
    setBatchSelected([]);
  };

  const removeGroup = (gid) => setBatchGroups(prev => prev.filter(g => g.id !== gid));
  const setGroupType = (gid, type) => setBatchGroups(prev => prev.map(g => g.id === gid ? { ...g, type } : g));

  // Find next available dates for batchAccount in current month
  const getAvailableDates = () => {
    const dim = new Date(year, month + 1, 0).getDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dates = [];
    for (let d = 1; d <= dim; d++) {
      // Only current month, starting from tomorrow
      const dateObj = new Date(year, month, d);
      if (dateObj.getMonth() !== month) continue;
      if (dateObj < tomorrow) continue;
      const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      dates.push(dateKey);
    }
    return dates;
  };

  // Compute smartly spaced slots for batch posts, respecting postsPerWeek and existing posts
  const getSmartSlots = (numGroups) => {
    const allDates = getAvailableDates();
    if (allDates.length === 0 || numGroups === 0) return [];

    const postsPerWeek = Math.max(1, parseInt(accountSettings?.[batchAccount]?.postsPerWeek) || 3);

    // Find days already occupied by this account in the month
    const occupied = new Set(
      Object.entries(posts)
        .filter(([k]) => k.startsWith(`${year}-${String(month+1).padStart(2,"0")}`))
        .flatMap(([k, v]) => v.filter(p => p.account === batchAccount).map(() => k))
    );

    // Compute minimum gap between posts in days (7 / postsPerWeek, min 1)
    const minGap = Math.max(1, Math.floor(7 / postsPerWeek));

    // Greedily pick dates with minGap spacing, skipping occupied days
    const slots = [];
    let lastPicked = null;

    for (const dateKey of allDates) {
      if (slots.length >= numGroups) break;
      if (occupied.has(dateKey)) continue;

      if (lastPicked !== null) {
        const last = new Date(lastPicked);
        const cur = new Date(dateKey);
        const diffDays = Math.round((cur - last) / 86400000);
        if (diffDays < minGap) continue;
      }

      slots.push(dateKey);
      lastPicked = dateKey;
    }

    // If not enough slots found (month too full), fill remaining without gap constraint
    if (slots.length < numGroups) {
      for (const dateKey of allDates) {
        if (slots.length >= numGroups) break;
        if (slots.includes(dateKey)) continue;
        if (occupied.has(dateKey)) continue;
        slots.push(dateKey);
      }
    }

    return slots;
  };

  const runBatchGeneration = async () => {
    if (batchGroups.length === 0) return;

    const slots = getSmartSlots(batchGroups.length);
    if (slots.length === 0) {
      alert("Aucun jour disponible ce mois-ci pour ce compte. Le mois est complet ou tous les jours sont déjà occupés.");
      return;
    }
    if (slots.length < batchGroups.length) {
      const ok = window.confirm(`Seulement ${slots.length} jour${slots.length > 1 ? "s" : ""} disponible${slots.length > 1 ? "s" : ""} ce mois-ci pour ${batchAccount}. Les ${batchGroups.length - slots.length} dernier${batchGroups.length - slots.length > 1 ? "s" : ""} post${batchGroups.length - slots.length > 1 ? "s" : ""} ne seront pas placés. Continuer ?`);
      if (!ok) return;
    }

    setGenerating(true);
    setGenProgress({ current: 0, total: slots.length, label: "Préparation..." });

    const newPosts = { ...posts };

    for (let i = 0; i < slots.length; i++) {
      const group = batchGroups[i];
      const dateKey = slots[i];

      setGenProgress({ current: i + 1, total: slots.length, label: `Post ${i + 1}/${slots.length} — analyse en cours...` });

      const firstImg = group.images[0];
      let subject = "";
      let caption = "";

      try {
        const result = await analyzeImageAndGenerate(firstImg.url || null, null, batchAccount, "");
        subject = result.subject || "";
        caption = result.caption || "";
      } catch (e) {
        console.error("Vision error for group", i, e);
      }

      const mediaItems = group.images.map(img => ({
        name: img.name, url: img.url, fileType: img.fileType,
        fileName: img.name, fileData: null, driveUrl: "",
      }));

      const existing = newPosts[dateKey] || [];
      existing.push({ account: batchAccount, type: group.type, subject, caption, credits: "", mediaItems, status: "Brouillon" });
      newPosts[dateKey] = existing;
    }

    setPosts(newPosts);
    setGenerating(false);
    setGenProgress({ current: 0, total: 0, label: "" });
    setBatchGroups([]);
    setBatchSelected([]);
    setBatchMode(false);
    alert(`✅ ${slots.length} post${slots.length > 1 ? "s" : ""} généré${slots.length > 1 ? "s" : ""} et placé${slots.length > 1 ? "s" : ""} dans le calendrier !`);
  };

  // ── Batch UI ─────────────────────────────────────────────────────────────────
  if (batchMode) return (
    <div style={{ ...cardStyle, padding: 20, marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text, fontFamily: F }}>Génération batch</div>
          <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, marginTop: 2 }}>Sélectionne les images, groupe-les, puis génère</div>
        </div>
        <button onClick={() => { setBatchMode(false); setBatchGroups([]); setBatchSelected([]); }}
          style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceSecondary, color: C.textSecondary, cursor: "pointer", fontSize: 13, fontFamily: F }}>
          Annuler
        </button>
      </div>

      {/* Account + month selector */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap", padding: 14, borderRadius: 12, background: C.surfaceSecondary, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>Compte :</div>
        <div style={{ display: "flex", gap: 6 }}>
          {ACCOUNTS.map(a => (
            <button key={a.id} onClick={() => setBatchAccount(a.id)}
              style={{ ...pillBtn(batchAccount === a.id, a.color), fontSize: 12, padding: "5px 14px" }}>
              {a.id}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: C.textSecondary, fontFamily: F }}>
          📅 {MONTHS_FR[month]} {year}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Left: image picker */}
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, fontFamily: F, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            1. Sélectionne les images
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle, marginBottom: 10, fontSize: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 6, maxHeight: 400, overflowY: "auto", padding: 2 }}>
            {library.filter(x => !x.account || x.account === batchAccount).filter(x => (x.name || "").toLowerCase().includes(search.toLowerCase())).map(item => {
              const isSelected = batchSelected.find(x => x.id === item.id);
              const isInGroup = batchGroups.some(g => g.images.find(x => x.id === item.id));
              return (
                <div key={item.id} onClick={() => !isInGroup && toggleBatchSelect(item)}
                  style={{ borderRadius: 8, overflow: "hidden", border: `2px solid ${isSelected ? C.blue : isInGroup ? C.green : C.border}`, position: "relative", cursor: isInGroup ? "default" : "pointer", opacity: isInGroup ? 0.5 : 1, transition: "border-color .15s" }}>
                  {item.fileType?.startsWith("image/") ? (
                    <img src={item.url} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1", background: `${C.blue}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 20 }}>🎬</span>
                    </div>
                  )}
                  {isSelected && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                  {isInGroup && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {batchSelected.length > 0 && (
            <button onClick={addGroup}
              style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 10, border: "none", background: C.blue, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F, fontWeight: 600 }}>
              ＋ Créer un groupe avec {batchSelected.length} image{batchSelected.length > 1 ? "s" : ""}
              {batchSelected.length > 1 ? " → Carrousel" : " → Photo"}
            </button>
          )}
        </div>

        {/* Right: groups */}
        <div style={{ flex: "1 1 280px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, fontFamily: F, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            2. Groupes ({batchGroups.length} post{batchGroups.length !== 1 ? "s" : ""})
          </div>

          {batchGroups.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: C.textTertiary, fontSize: 13, fontFamily: F, border: `2px dashed ${C.border}`, borderRadius: 12 }}>
              Sélectionne des images à gauche et crée des groupes
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {batchGroups.map((group, gi) => (
              <div key={group.id} style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.surfaceSecondary, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: F }}>Post {gi + 1}</span>
                  <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                    {["Photo", "Carrousel", "Reel"].map(t => (
                      <button key={t} onClick={() => setGroupType(group.id, t)}
                        style={{ padding: "2px 8px", borderRadius: 6, border: `1px solid ${group.type === t ? C.blue : C.border}`, background: group.type === t ? C.blue : "transparent", color: group.type === t ? "#fff" : C.textSecondary, cursor: "pointer", fontSize: 10, fontFamily: F, fontWeight: 600 }}>
                        {t}
                      </button>
                    ))}
                    <button onClick={() => removeGroup(group.id)}
                      style={{ padding: "2px 6px", borderRadius: 6, border: "none", background: "none", color: C.textTertiary, cursor: "pointer", fontSize: 14 }}>×</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, padding: 8, flexWrap: "wrap" }}>
                  {group.images.map(img => (
                    <img key={img.id} src={img.url} style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {batchGroups.length > 0 && (
            <button onClick={runBatchGeneration} disabled={generating}
              style={{ width: "100%", marginTop: 12, padding: "12px", borderRadius: 10, border: "none", background: generating ? C.surfaceSecondary : `linear-gradient(135deg, ${C.indigo}, ${C.blue})`, color: generating ? C.textSecondary : "#fff", cursor: generating ? "default" : "pointer", fontSize: 14, fontFamily: F, fontWeight: 700, boxShadow: generating ? "none" : `0 3px 14px ${C.blue}44` }}>
              {generating
                ? `✨ ${genProgress.label}`
                : `✨ Générer ${batchGroups.length} post${batchGroups.length > 1 ? "s" : ""} avec l'IA`}
            </button>
          )}

          {generating && genProgress.total > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(genProgress.current / genProgress.total) * 100}%`, background: C.blue, borderRadius: 3, transition: "width .4s" }} />
              </div>
              <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F, marginTop: 4, textAlign: "center" }}>
                {genProgress.current}/{genProgress.total} posts générés
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Normal library view ───────────────────────────────────────────────────────
  return (
    <div style={{ ...cardStyle, padding: 20, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: F }}>
          Librairie — {filtered.length} fichier{filtered.length !== 1 ? "s" : ""}
        </div>
        <button onClick={() => setBatchMode(true)}
          style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.indigo}, ${C.blue})`, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F, fontWeight: 600, boxShadow: `0 2px 10px ${C.blue}44` }}>
          ✨ Génération batch
        </button>
      </div>

      {/* Account tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setSelectedAccount("all")} style={{ ...pillBtn(selectedAccount === "all"), fontSize: 12 }}>
          Tous ({countFor("all")})
        </button>
        {ACCOUNTS.map(a => (
          <button key={a.id} onClick={() => setSelectedAccount(a.id)} style={{ ...pillBtn(selectedAccount === a.id, a.color), fontSize: 12 }}>
            {a.id} ({countFor(a.id)})
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F }}>Uploader pour :</span>
        <select value={uploadAccount} onChange={e => setUploadAccount(e.target.value)} style={{ ...selectStyle, fontSize: 12 }}>
          <option value="all">— Tous les comptes —</option>
          {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.id} — {a.name}</option>)}
        </select>
      </div>

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.blue; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = C.border; }}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.border; handleUpload(Array.from(e.dataTransfer.files)); }}
        style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: "22px 20px", textAlign: "center", cursor: uploading ? "default" : "pointer", background: C.surfaceSecondary, marginBottom: 16, transition: "all .2s" }}>
        {uploading ? (
          <div>
            <div style={{ fontSize: 13, color: C.text, fontFamily: F, marginBottom: 8 }}>Upload en cours... {progress}%</div>
            <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: C.blue, borderRadius: 3, transition: "width .3s" }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
            <div style={{ fontSize: 13, color: C.text, fontFamily: F, fontWeight: 500 }}>
              Cliquer ou glisser-déposer{uploadAccount !== "all" ? ` — ${uploadAccount}` : ""}
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: F, marginTop: 2 }}>JPG, PNG, WEBP, GIF, MP4</div>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
        onChange={e => { handleUpload(Array.from(e.target.files)); e.target.value = ""; }} />

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom..." style={{ ...inputStyle, marginBottom: 16 }} />

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: C.textTertiary, padding: 40, fontSize: 13, fontFamily: F }}>
          Aucune image{selectedAccount !== "all" ? ` pour ${selectedAccount}` : " dans la librairie"}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {filtered.map(item => {
          const acc = ACCOUNTS.find(a => a.id === item.account);
          return (
            <div key={item.id} style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.surfaceSecondary, position: "relative" }}>
              {item.fileType?.startsWith("image/") ? (
                <img src={item.url} alt={item.name} onClick={() => setLightbox(item)}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", cursor: "pointer", display: "block" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "1", background: `${C.blue}10`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setLightbox(item)}>
                  <span style={{ fontSize: 28 }}>🎬</span>
                </div>
              )}
              <div style={{ padding: "5px 6px", background: C.surface, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                {acc && <div style={{ fontSize: 9, fontWeight: 700, color: acc.color, fontFamily: F, marginTop: 1 }}>{acc.id}</div>}
              </div>
              <button onClick={() => handleDelete(item)}
                style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.5)", color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw" }}>
            <img src={lightbox.url} style={{ maxWidth: "85vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 10, display: "block" }} />
            <div style={{ marginTop: 8, textAlign: "center", color: "#fff", fontSize: 12, fontFamily: F }}>{lightbox.name}</div>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: -14, right: -14, width: 28, height: 28, borderRadius: "50%", border: "none", background: "#fff", color: C.text, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LibraryPicker (modal inside PostEditor) ──────────────────────────────────
function LibraryPicker({ onSelect, onClose, accountHint }) {
  const { library } = useContext(LibraryContext);
  const [search, setSearch] = useState("");
  const [filterAcc, setFilterAcc] = useState(accountHint || "all");

  const filtered = library
    .filter(x => filterAcc === "all" ? true : (x.account === filterAcc || !x.account))
    .filter(x => (x.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 20, width: "min(640px, 95vw)", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: F }}>Choisir depuis la librairie</span>
          <button onClick={onClose} style={{ background: C.surfaceSecondary, border: "none", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", color: C.textSecondary, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Account filter */}
        <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => setFilterAcc("all")} style={{ ...pillBtn(filterAcc === "all"), fontSize: 11, padding: "4px 12px" }}>Tous</button>
          {ACCOUNTS.map(a => (
            <button key={a.id} onClick={() => setFilterAcc(a.id)} style={{ ...pillBtn(filterAcc === a.id, a.color), fontSize: 11, padding: "4px 12px" }}>{a.id}</button>
          ))}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle, marginBottom: 12 }} />

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && <div style={{ textAlign: "center", color: C.textTertiary, padding: 30, fontSize: 13, fontFamily: F }}>Aucun fichier trouvé</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
            {filtered.map(item => {
              const acc = ACCOUNTS.find(a => a.id === item.account);
              return (
                <div key={item.id} onClick={() => { onSelect(item); onClose(); }}
                  style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, cursor: "pointer", background: C.surfaceSecondary, transition: "border-color .15s, transform .12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.transform = "scale(1.02)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "scale(1)"; }}>
                  {item.fileType?.startsWith("image/") ? (
                    <img src={item.url} alt={item.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "1", background: `${C.blue}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 24 }}>🎬</span>
                    </div>
                  )}
                  <div style={{ padding: "4px 6px", background: C.surface }}>
                    <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    {acc && <div style={{ fontSize: 9, fontWeight: 700, color: acc.color, fontFamily: F }}>{acc.id}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Guide ─────────────────────────────────────────────────────────────────────
function Guide() {
  const [open, setOpen] = useState(null);

  const sections = [
    {
      id: "start",
      emoji: "🚀",
      title: "Par où commencer ?",
      color: C.blue,
      steps: [
        { label: "1. Configure les établissements", desc: "Dans l'onglet Calendrier, le panneau en haut te permet de définir pour chaque compte (APG, CSM, HDCER, BB) : le statut ouvert/fermé (bouton vert/rouge), le nombre de posts souhaités par semaine, et les dates de fermeture ou d'ouverture à titre indicatif." },
        { label: "2. Upload tes images dans la Librairie", desc: "Va dans l'onglet Librairie et uploade tes photos par établissement. Tu peux glisser-déposer plusieurs images à la fois. Chaque image est stockée sur Cloudinary et associée à un compte." },
        { label: "3. Génère le planning", desc: "De retour dans le Calendrier, clique sur \"Générer le planning\". Le système répartit automatiquement les posts sur le mois selon le nombre de posts/semaine défini, en tenant compte des semaines coupées en début et fin de mois." },
        { label: "4. Complète les fiches", desc: "Clique sur un jour du calendrier pour ouvrir le panneau de la journée. Tu peux y éditer chaque fiche : choisir l'image, générer la caption avec l'IA, modifier le sujet, etc." },
        { label: "5. Valide et exporte", desc: "Dans l'onglet Récap, tu peux voir tous les posts, changer les statuts, copier les captions et exporter un CSV pour programmer via Later ou Buffer." },
      ]
    },
    {
      id: "calendar",
      emoji: "📅",
      title: "Calendrier",
      color: "#5856D6",
      steps: [
        { label: "Naviguer entre les mois", desc: "Utilise les flèches ‹ › de part et d'autre du nom du mois pour passer au mois précédent ou suivant." },
        { label: "Cliquer sur un jour", desc: "Un clic sur n'importe quel jour ouvre le panneau de cette journée en bas. Tu peux y voir, éditer, ajouter ou supprimer des posts. Recliquer sur le même jour ferme le panneau." },
        { label: "Déplacer un post (drag & drop)", desc: "Chaque fiche dans le calendrier est déplaçable. Attrape-la et glisse-la vers un autre jour. La case cible se surligne en bleu pendant le survol." },
        { label: "Miniature dans le calendrier", desc: "Si un post a une image associée (uploadée ou issue de la librairie), une miniature apparaît directement dans la case du calendrier pour avoir une vision rapide du contenu visuel." },
        { label: "Générer le planning automatique", desc: "Le bouton \"Générer le planning\" dans le panneau des établissements répartit les posts sur le mois en respectant le rythme posts/semaine. Les semaines coupées sont proratisées : si le mois commence un mercredi, la première semaine ne reçoit que 5/7 des posts prévus." },
        { label: "Effacer le planning", desc: "Le bouton rouge \"Effacer le planning\" supprime tous les posts du mois en cours. Les autres mois ne sont pas affectés." },
      ]
    },
    {
      id: "posts",
      emoji: "✏️",
      title: "Fiches post",
      color: "#FF9500",
      steps: [
        { label: "Créer un post", desc: "Dans le panneau d'un jour (clic sur une date), clique sur \"+  Ajouter\". Une nouvelle fiche vierge apparaît. Choisis le compte, le type (Photo / Carrousel / Reel) et le statut." },
        { label: "Générer un sujet aléatoire", desc: "Une fois le compte sélectionné, le bouton \"Générer un sujet\" propose aléatoirement un sujet issu de la banque de sujets propre à chaque établissement." },
        { label: "Ajouter une image", desc: "Deux options : \"Uploader un média\" pour charger un fichier depuis ton ordinateur, ou \"Choisir depuis la librairie\" pour utiliser une image déjà uploadée. Dans la librairie, tu peux filtrer par compte et par nom." },
        { label: "Analyser l'image avec l'IA ✨", desc: "Dès qu'une image est présente et qu'un compte est sélectionné, le bouton \"✨ Analyser l'image et générer la caption\" apparaît. En cliquant, l'IA (Llama 4 Scout via Groq) analyse la photo, identifie la scène, propose un sujet adapté au compte et génère une caption complète EN + FR + hashtags." },
        { label: "Générer / Regénérer la caption", desc: "Si tu as rempli le sujet manuellement, la caption se génère automatiquement quand tu quittes le champ. Tu peux la regénérer à tout moment avec le bouton \"Regénérer\"." },
        { label: "Copier la caption", desc: "Le bouton \"Copier la caption\" en bas de la fiche copie tout le texte dans le presse-papier, prêt à coller dans Meta Business Suite, Later ou Buffer." },
        { label: "Dupliquer un post", desc: "Le bouton \"Dupliquer\" permet de copier un post vers une autre date, avec possibilité de changer le compte. Pratique pour les contenus récurrents." },
        { label: "Changer le statut", desc: "5 statuts disponibles : Brouillon (jaune) → En cours (bleu) → Validé (vert foncé) → Programmé (orange) → Publié (vert). Le statut est visible directement dans la case du calendrier." },
      ]
    },
    {
      id: "library",
      emoji: "📁",
      title: "Librairie",
      color: "#34C759",
      steps: [
        { label: "Uploader des images", desc: "Glisse-dépose ou clique pour uploader. Sélectionne d'abord le compte concerné dans le menu \"Uploader pour :\" pour associer les images directement au bon établissement. Plusieurs fichiers sont acceptés en même temps." },
        { label: "Filtrer par établissement", desc: "Les onglets en haut (Tous / APG / CSM / HDCER / BB) filtrent les images affichées. Le compteur entre parenthèses indique le nombre d'images par compte." },
        { label: "Rechercher une image", desc: "Le champ de recherche filtre les images par nom de fichier en temps réel." },
        { label: "Voir une image en grand", desc: "Clique sur n'importe quelle image pour l'afficher en plein écran (lightbox). Clique en dehors pour fermer." },
        { label: "Supprimer une image", desc: "Le bouton × en haut à droite de chaque image la supprime de Firestore. L'image reste sur Cloudinary mais ne sera plus visible dans l'app." },
        { label: "Génération batch ✨", desc: "Le bouton \"✨ Génération batch\" ouvre un mode spécial pour générer plusieurs posts d'un coup. Voir la section dédiée ci-dessous." },
      ]
    },
    {
      id: "batch",
      emoji: "⚡",
      title: "Génération batch",
      color: C.indigo,
      steps: [
        { label: "Ouvrir le mode batch", desc: "Dans l'onglet Librairie, clique sur \"✨ Génération batch\" en haut à droite." },
        { label: "Choisir le compte et le mois", desc: "Sélectionne le compte pour lequel tu veux générer (APG, CSM, HDCER ou BB). Le mois est celui actuellement affiché dans le calendrier." },
        { label: "Sélectionner les images", desc: "La grille à gauche affiche les images de la librairie pour ce compte. Clique sur les images pour les sélectionner (elles s'entourent d'un bord bleu). Les images déjà dans un groupe apparaissent en vert." },
        { label: "Créer des groupes", desc: "Une fois ta sélection faite, clique sur le bouton \"Créer un groupe\". 1 image = Photo, 2+ images = Carrousel automatiquement. Le groupe apparaît à droite avec ses miniatures." },
        { label: "Changer le type d'un groupe", desc: "Pour chaque groupe, tu peux modifier le type (Photo / Carrousel / Reel) via les boutons dans l'en-tête du groupe." },
        { label: "Supprimer un groupe", desc: "Le bouton × dans l'en-tête d'un groupe le supprime. Les images redeviennent sélectionnables." },
        { label: "Lancer la génération", desc: "Clique sur \"✨ Générer X posts avec l'IA\". Pour chaque groupe, l'IA analyse la première image et génère un sujet + une caption complète. Les posts sont placés automatiquement sur les jours disponibles à partir de demain, en respectant le rythme posts/semaine défini pour ce compte, sans chevaucher les posts existants." },
        { label: "Résultat", desc: "Une fois terminé, les posts apparaissent dans le calendrier avec leurs images, sujets et captions. Tu peux les affiner individuellement en cliquant sur le jour concerné." },
      ]
    },
    {
      id: "preview",
      emoji: "📱",
      title: "Preview du feed",
      color: "#FF3B30",
      steps: [
        { label: "Choisir un compte", desc: "Les 4 boutons en haut permettent de switcher entre les comptes. La vue simule le feed Instagram de ce compte avec les posts planifiés." },
        { label: "Logique Instagram", desc: "Les posts sont affichés du plus récent au plus ancien, de gauche à droite sur chaque ligne (3 colonnes), exactement comme Instagram. Le post le plus récent est en haut à gauche." },
        { label: "Icônes de type", desc: "❏ apparaît sur les Carrousels, ▶ sur les Reels. Les Photos n'ont pas d'icône, comme sur Instagram." },
        { label: "Hover pour les détails", desc: "Sur ordinateur, passer la souris sur une image affiche le sujet, la date et un point de couleur indiquant le statut." },
        { label: "Clic pour le détail complet", desc: "Cliquer sur un post ouvre une modale style Instagram avec l'image à gauche et les détails (sujet, caption, type, statut) à droite." },
      ]
    },
    {
      id: "recap",
      emoji: "📊",
      title: "Récap & Export",
      color: "#5AC8FA",
      steps: [
        { label: "Vue récapitulative", desc: "L'onglet Récap affiche un résumé par compte : nombre de posts, objectif atteint ou non, répartition Photo/Carrousel/Reel, et alerte si aucun Reel n'est planifié ce mois-ci." },
        { label: "Détection des doublons", desc: "Si un compte a deux posts le même jour, une alerte orange apparaît en bas du récap." },
        { label: "Vue \"Prêt à programmer\"", desc: "Le bouton \"📋 Voir les posts prêts à programmer\" ouvre une liste de tous les posts du mois avec image + caption + heure suggérée. Tu peux filtrer par compte et copier la caption de chaque post en un clic." },
        { label: "Export CSV", desc: "Le bouton \"↓ Exporter CSV\" génère un fichier CSV par compte avec : date, heure, type, statut, sujet, caption, URL image, crédits. Compatible avec l'import direct dans Later et Buffer." },
        { label: "URLs des images", desc: "Depuis la vue \"Prêt à programmer\", le bouton \"Ouvrir l'image ↗\" ouvre directement l'image sur Cloudinary dans un nouvel onglet, pour la télécharger ou la copier." },
        { label: "Horaires suggérés", desc: "Chaque post affiche un horaire de publication recommandé selon le compte et le jour (semaine vs weekend), basé sur les meilleures pratiques pour le secteur hôtelier de luxe." },
      ]
    },
    {
      id: "hashtags",
      emoji: "#️⃣",
      title: "Hashtags",
      color: "#FF9500",
      steps: [
        { label: "Banque par compte", desc: "Chaque établissement a sa propre banque de hashtags organisée par catégories. Sélectionne le compte avec les boutons en haut." },
        { label: "Copier un hashtag", desc: "Clique sur n'importe quel hashtag individuel pour le copier dans le presse-papier." },
        { label: "Copier une catégorie entière", desc: "Le bouton \"Copier tout\" à droite du nom de catégorie copie tous les hashtags de cette catégorie en une fois." },
        { label: "Hashtags obligatoires", desc: "Certains hashtags sont automatiquement inclus dans toutes les captions générées (ex: #lapogeecourchevel, #oetkerhotels). Ils ne peuvent pas être supprimés de la génération." },
      ]
    },
    {
      id: "archive",
      emoji: "🗂️",
      title: "Archive",
      color: C.textSecondary,
      steps: [
        { label: "Historique des mois", desc: "L'onglet Archive liste tous les mois pour lesquels des posts ont été créés, du plus récent au plus ancien." },
        { label: "Développer un mois", desc: "Clique sur un mois pour l'ouvrir et voir le détail : répartition par compte, par type, et la liste de tous les posts avec leur date, type et statut." },
        { label: "Retrouver un contenu", desc: "L'archive est utile pour retrouver rapidement un post passé, vérifier ce qui avait été publié à une date donnée, ou s'en inspirer pour de nouveaux posts." },
      ]
    },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header card */}
      <div style={{ ...cardStyle, padding: 28, marginBottom: 16, background: `linear-gradient(135deg, ${C.blue}08, ${C.indigo}08)` }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: F, marginBottom: 8, letterSpacing: -0.5 }}>
          📖 Guide d'utilisation
        </div>
        <div style={{ fontSize: 14, color: C.textSecondary, fontFamily: F, lineHeight: 1.6, maxWidth: 600 }}>
          Bienvenue dans le Calendrier Éditorial pour L'Apogée, Château Saint-Martin, Hôtel du Cap-Eden-Roc et Beefbar. Ce guide explique toutes les fonctionnalités disponibles et comment les utiliser efficacement.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setOpen(open === s.id ? null : s.id)}
              style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${s.color}`, background: open === s.id ? s.color : "transparent", color: open === s.id ? "#fff" : s.color, cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 600, transition: "all .18s" }}>
              {s.emoji} {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {sections.map(s => (
        <div key={s.id} style={{ ...cardStyle, marginBottom: 10, overflow: "visible" }}>
          {/* Section header */}
          <button onClick={() => setOpen(open === s.id ? null : s.id)}
            style={{ width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {s.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: F }}>{s.title}</div>
              <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, marginTop: 1 }}>{s.steps.length} fonctionnalité{s.steps.length > 1 ? "s" : ""}</div>
            </div>
            <div style={{ fontSize: 18, color: C.textTertiary, transform: open === s.id ? "rotate(90deg)" : "rotate(0)", transition: "transform .2s" }}>›</div>
          </button>

          {/* Section content */}
          {open === s.id && (
            <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 12 }}>
                {s.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: i < s.steps.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${s.color}18`, border: `1.5px solid ${s.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: F }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: F, marginBottom: 4 }}>{step.label}</div>
                      <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: F, lineHeight: 1.6 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Tips card */}
      <div style={{ ...cardStyle, padding: 20, marginTop: 6, background: `${C.green}06`, border: `1px solid ${C.green}30` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: F, marginBottom: 12 }}>💡 Conseils & bonnes pratiques</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { tip: "Commence toujours par uploader tes images dans la Librairie avant de créer les posts — ça te permet d'utiliser la génération batch et l'analyse IA directement." },
            { tip: "La génération batch est idéale en début de mois : uploade toutes tes photos, groupe-les, et génère en une fois. Tu n'as plus qu'à relire et ajuster les captions." },
            { tip: "Utilise le statut \"Validé\" pour marquer les posts approuvés par l'équipe, et \"Programmé\" une fois planifiés dans Meta Business Suite ou Later." },
            { tip: "Le CSV exporté est compatible avec l'import automatique de Later et Buffer. La colonne \"Image URL\" pointe directement vers l'image sur Cloudinary." },
            { tip: "Pour les Reels, uploade une image de couverture dans la librairie et utilise-la comme média principal dans la fiche — c'est cette image qui apparaît dans le feed Instagram." },
            { tip: "L'IA génère mieux les captions quand l'image est nette et le sujet du compte bien défini. Pour des résultats optimaux, donne une image claire avec un sujet central évident." },
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 12px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: F, lineHeight: 1.5 }}>{t.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stats({ posts }) {
  const all = Object.values(posts).flat();
  const byAcc = {}; ACCOUNTS.forEach(a => { byAcc[a.id] = 0; }); all.forEach(p => { if (p.account && byAcc[p.account] !== undefined) byAcc[p.account]++; });
  const byType = { Photo: 0, Carrousel: 0, Reel: 0 }; all.forEach(p => { if (p.type && byType[p.type] !== undefined) byType[p.type]++; });
  const box = { background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "10px 16px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      <div style={box}><div style={{ fontSize: 10, color: C.textTertiary, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: F, fontWeight: 600 }}>Total</div><div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: F }}>{all.length}</div></div>
      {ACCOUNTS.map(a => <div key={a.id} style={{ ...box, borderBottom: `2px solid ${a.color}` }}><div style={{ fontSize: 10, color: C.textTertiary, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: F, fontWeight: 600 }}>{a.id}</div><div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: F }}>{byAcc[a.id]}</div></div>)}
      {POST_TYPES.map(t => <div key={t} style={box}><div style={{ fontSize: 10, color: C.textTertiary, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: F, fontWeight: 600 }}>{t}s</div><div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: F }}>{byType[t]}</div></div>)}
    </div>
  );
}

export default function App() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [posts, setPosts] = useState({});
  const [accountSettings, setAccountSettings] = useState({
    APG:   { isOpen: true, postsPerWeek: 3, closingDate: "", openingDate: "" },
    CSM:   { isOpen: true, postsPerWeek: 3, closingDate: "", openingDate: "" },
    HDCER: { isOpen: true, postsPerWeek: 3, closingDate: "", openingDate: "" },
    BB:    { isOpen: true, postsPerWeek: 3, closingDate: "", openingDate: "" },
  });
  // Keep openStatus as a derived alias for backwards compat (Récap, etc.)
  const openStatus = Object.fromEntries(ACCOUNTS.map(a => [a.id, accountSettings[a.id]?.isOpen !== false]));
  const [selectedDay, setSelectedDay] = useState(null);
  const [view, setView] = useState("calendar");
  const [library, setLibrary] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const skipSync = useRef(false);

  // Load library images from Firestore
  useEffect(() => {
    if (!db) return;
    const loadLib = async () => {
      try {
        const q = query(collection(db, "library"), orderBy("uploadedAt", "desc"));
        const snap = await getDocs(q);
        setLibrary(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error("Library load error", e); }
    };
    loadLib();
  }, []);
  useEffect(() => {
    if (db) {
      const load = async () => {
        try {
          const postsDoc = await getDoc(doc(db, "calendar", "posts"));
          const settingsDoc = await getDoc(doc(db, "calendar", "accountSettings"));
          if (postsDoc.exists() && postsDoc.data().data) { skipSync.current = true; setPosts(postsDoc.data().data); setTimeout(() => { skipSync.current = false; }, 100); }
          if (settingsDoc.exists() && settingsDoc.data().data) { skipSync.current = true; setAccountSettings(settingsDoc.data().data); setTimeout(() => { skipSync.current = false; }, 100); }
        } catch (e) { console.error("Firestore load error", e); }
        setLoaded(true);
      };
      load();
    } else {
      try { const saved = localStorage.getItem("editorial-cal-v2"); if (saved) { const data = JSON.parse(saved); if (data.posts) setPosts(data.posts); if (data.accountSettings) setAccountSettings(data.accountSettings); } } catch (e) {}
      setLoaded(true);
    }
  }, []);

  // Save to Firestore (or localStorage fallback)
  useEffect(() => {
    if (!loaded || skipSync.current) return;
    if (db) {
      setDoc(doc(db, "calendar", "posts"), { data: posts });
      setDoc(doc(db, "calendar", "accountSettings"), { data: accountSettings });
    } else {
      try { localStorage.setItem("editorial-cal-v2", JSON.stringify({ posts, accountSettings })); } catch (e) {}
    }
  }, [posts, accountSettings, loaded]);

  const weeks = getWeeksOfMonth(year, month);
  const monthPrefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthPosts = Object.fromEntries(Object.entries(posts).filter(([k]) => k.startsWith(monthPrefix)));

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); setSelectedDay(null); };
  const handleDayClick = (day) => { setSelectedDay(prev => prev === day ? null : day); };

  // Auto-generate monthly planning
  const generatePlanning = () => {
    const newPosts = { ...posts };
    const types = ["Photo", "Carrousel", "Reel"];
    const dim = getDaysInMonth(year, month);

    ACCOUNTS.forEach(a => {
      const settings = accountSettings[a.id] || { postsPerWeek: 3 };
      const postsPerWeek = Math.max(1, parseInt(settings.postsPerWeek) || 3);
      let typeIdx = 0;

      // Find the Monday of the week containing day 1 of this month
      const firstOfMonth = new Date(year, month, 1);
      const dow1 = firstOfMonth.getDay(); // 0=Sun
      const mondayOffset = dow1 === 0 ? -6 : 1 - dow1;
      const firstMonday = new Date(year, month, 1 + mondayOffset);

      // Build 4 ISO weeks (Mon–Sun) covering this month
      const weeks = Array.from({ length: 4 }, (_, wi) =>
        Array.from({ length: 7 }, (_, di) => {
          const d = new Date(firstMonday);
          d.setDate(firstMonday.getDate() + wi * 7 + di);
          return d;
        })
      );

      weeks.forEach(weekDays => {
        // Count how many days of this week fall inside the current month
        const daysInMonth = weekDays.filter(d => d.getMonth() === month && d.getFullYear() === year).length;

        // Prorate: if week is cut, scale posts proportionally and round
        const postsForWeek = Math.round((daysInMonth / 7) * postsPerWeek);
        if (postsForWeek === 0) return;

        // Only work on days that belong to this month
        const monthDays = weekDays.filter(d => d.getMonth() === month && d.getFullYear() === year);

        // Spread postsForWeek evenly across the available days
        const postsPerDay = Math.floor(postsForWeek / monthDays.length);
        const extra = postsForWeek % monthDays.length;

        // Pick which days get an extra post (deterministic shuffle)
        const extraIndices = new Set();
        if (extra > 0) {
          const indices = Array.from({ length: monthDays.length }, (_, i) => i);
          const seed = a.id.charCodeAt(0) + monthDays[0].getDate();
          indices.sort((x, y) => ((x * 1664525 + seed) % monthDays.length) - ((y * 1664525 + seed) % monthDays.length));
          indices.slice(0, extra).forEach(i => extraIndices.add(i));
        }

        monthDays.forEach((date, di) => {
          const postsThisDay = postsPerDay + (extraIndices.has(di) ? 1 : 0);
          if (postsThisDay === 0) return;

          const dateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
          const existing = newPosts[dateKey] || [];
          const alreadyHas = existing.filter(p => p.account === a.id).length;
          const toAdd = postsThisDay - alreadyHas;

          for (let k = 0; k < toAdd; k++) {
            existing.push({
              account: a.id,
              type: types[typeIdx % types.length],
              subject: "",
              caption: "",
              credits: "",
              mediaItems: [],
              status: "Brouillon",
            });
            typeIdx++;
          }
          newPosts[dateKey] = existing;
        });
      });
    });

    setPosts(newPosts);
  };

  // Clear planning for current month
  const clearPlanning = () => {
    const newPosts = { ...posts };
    Object.keys(newPosts).forEach(k => {
      if (k.startsWith(monthPrefix)) delete newPosts[k];
    });
    setPosts(newPosts);
  };

  const tabs = [{ id: "calendar", label: "Calendrier" }, { id: "preview", label: "Preview" }, { id: "recap", label: "Récap" }, { id: "hashtags", label: "Hashtags" }, { id: "archive", label: "Archive" }, { id: "library", label: "Librairie" }, { id: "guide", label: "📖 Guide" }];

  return (
    <LibraryContext.Provider value={{ library, setLibrary }}>
    <div style={{ fontFamily: F, background: C.bg, minHeight: "100vh", padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, margin: 0, letterSpacing: -0.5 }}>
          Calendrier Éditorial
        </h1>
        <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 5, letterSpacing: 1.5, fontWeight: 500 }}>
          APG · CSM · HDCER · BB
        </div>
      </div>

      {/* Tabs — pill switcher */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{ display: "inline-flex", background: "rgba(118,118,128,0.12)", borderRadius: 12, padding: 3, gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              padding: "7px 18px", borderRadius: 10,
              border: "none",
              background: view === t.id ? C.surface : "transparent",
              color: view === t.id ? C.text : C.textSecondary,
              cursor: "pointer", fontSize: 13, fontFamily: F,
              fontWeight: view === t.id ? 600 : 400,
              transition: "all .18s",
              boxShadow: view === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {(view === "calendar" || view === "recap") && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", marginBottom: 20 }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: -0.3, margin: 0, minWidth: 220, textAlign: "center" }}>{MONTHS_FR[month]} {year}</h2>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
      )}

      {view === "calendar" && (<>
        <OpenClosedPanel accountSettings={accountSettings} setAccountSettings={setAccountSettings} month={month} onGenerate={generatePlanning} onClear={clearPlanning} />
        <Stats posts={monthPosts} />
        <CalendarMonth year={year} month={month} posts={posts} onDayClick={handleDayClick} selectedDay={selectedDay}
          onDeletePost={(dateKey, index) => {
            setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp.splice(index, 1); if (dp.length === 0) delete u[dateKey]; else u[dateKey] = dp; return u; });
          }}
          onDropPost={(fromDateKey, fromIndex, toDateKey) => {
            setPosts(prev => {
              const u = { ...prev };
              const fromArr = [...(u[fromDateKey] || [])];
              const [moved] = fromArr.splice(fromIndex, 1);
              if (fromArr.length === 0) delete u[fromDateKey]; else u[fromDateKey] = fromArr;
              const toArr = [...(u[toDateKey] || [])];
              toArr.push(moved);
              u[toDateKey] = toArr;
              return u;
            });
          }}
        />
        {selectedDay && (() => {
          const dateKey = fmtDate(year, month, selectedDay);
          const dow = new Date(year, month, selectedDay).getDay();
          const mb = dow === 0 ? 6 : dow - 1;
          return (
            <DayView
              year={year} month={month} day={selectedDay} dateKey={dateKey}
              dayName={DAYS_FULL[mb]}
              posts={posts} setPosts={setPosts}
              onClose={() => setSelectedDay(null)}
            />
          );
        })()}
      </>)}

      {view === "recap" && (<>
        <OpenClosedPanel accountSettings={accountSettings} setAccountSettings={setAccountSettings} month={month} />
        <MonthlyRecap year={year} month={month} posts={posts} openStatus={openStatus} />
        <div style={{ marginTop: 16, textAlign: "center" }}><ExportButton year={year} month={month} posts={posts} /></div>
      </>)}

      {view === "preview" && <FeedPreview posts={posts} />}

      {view === "hashtags" && <HashtagBank />}

      {view === "archive" && <Archive posts={posts} />}

      {view === "library" && <Library library={library} setLibrary={setLibrary} posts={posts} setPosts={setPosts} year={year} month={month} accountSettings={accountSettings} />}

      {view === "guide" && <Guide />}
    </div>
    </LibraryContext.Provider>
  );
}
