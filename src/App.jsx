import { useState, useEffect, useRef, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, getDoc, setDoc,
  collection, addDoc, getDocs, query, orderBy, deleteDoc
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";

// ── Firebase ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:      import.meta.env.VITE_FIREBASE_API_KEY      || "",
  authDomain:  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN  || "",
  projectId:   import.meta.env.VITE_FIREBASE_PROJECT_ID   || "",
};
let db = null;
let auth = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) { console.warn("Firebase not configured, using localStorage fallback"); }

// ── Cloudinary ────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    || "";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

// ── Default accounts (used only on first load / no Firestore data) ────────────
const DEFAULT_ACCOUNTS = [
  { id: "APG",   name: "L'Apogée Courchevel",       color: "#7B2D3B", light: "#F5E6E9" },
  { id: "CSM",   name: "Château Saint-Martin & Spa", color: "#D4782F", light: "#FDF0E5" },
  { id: "HDCER", name: "Hôtel du Cap-Eden-Roc",      color: "#4A9FCC", light: "#E5F2FA" },
  { id: "BB",    name: "Beefbar Courchevel",          color: "#3A8A5C", light: "#E6F5ED" },
];

const DEFAULT_VOICES = {
  APG:   "The voice of silent Alpine exclusivity. Raw mountain mornings, the smell of wood and snow, the feeling of being above the world. Intimate, not showy. Cozy but never rustic.",
  CSM:   "The voice of Provençal timelessness. Stone, light, lavender, silence broken only by cicadas. A place where time slows down on purpose. Poetic, grounded, never overwrought.",
  HDCER: "The voice of Mediterranean legend. This is where cinema, art and the sea have always met. Iconic without trying to be. The light here is different. Timeless, not trendy.",
  BB:    "The voice of unapologetic indulgence. Premium cuts, low lights, the sound of a room that knows how to have a good time. Confident, sensory, a little cinematic.",
};

const DEFAULT_HASHTAG_BANK = {
  APG:   { "Tous": ["#lapogeecourchevel","#oetkerhotels","#luxuryhotel","#penthouse","#courchevel","#masterpiecehotels","#teatime","#pastry","#hotel","#winter","#snow","#restaurant","#pastries"] },
  CSM:   { "Tous": ["#oetkerhotels","#Vence","#summer","#southoffrance","#masterpiecehotels","#luxuryescape","#dreamstay","#ChateauStMartin","#FlavorsAndAmbiance","#SharedMoments","#hotel","#vence"] },
  HDCER: { "Tous": ["#hotelducapedenroc","#oetkerhotels","#FrenchRiviera","#LuxuryHotel","#southoffrance","#masterpiecehotels","#VacationGoals","#HotelduCapEdenRoc","#OetkerCollection","#MasterpieceHotels","#CoteDAzur","#TimelessElegance","#LuxuryEscape","#summer","#frenchriviera","#capdantibes"] },
  BB:    { "Tous": ["#lapogeecourchevel","#beefbarcourchevel","#courchevelrestaurant","#courchevel1850","#beefbar","#oetkerhotels","#courchevel","#restaurant","#winterdestination","#valentinesdays","#meat"] },
};

const DEFAULT_MANDATORY = {
  APG:   ["#lapogeecourchevel","#oetkerhotels"],
  CSM:   ["#ChateauStMartin","#oetkerhotels"],
  HDCER: ["#hotelducapedenroc","#oetkerhotels"],
  BB:    [],
};

const DEFAULT_BEST_TIMES = {
  APG:   { weekday: "18:00", weekend: "10:00", note: "Audience ski/montagne" },
  CSM:   { weekday: "12:00", weekend: "09:00", note: "Audience Provence/bien-être" },
  HDCER: { weekday: "17:00", weekend: "11:00", note: "Audience Côte d'Azur" },
  BB:    { weekday: "19:00", weekend: "12:00", note: "Audience gastronomie/nightlife" },
};

const DEFAULT_MENTION = {
  APG: "@oetkerhotels", CSM: "@oetkerhotels", HDCER: "@oetkerhotels", BB: "@lapogeecourchevel",
};

const DEFAULT_SUBFOLDERS = {
  APG:   ["Extérieur","Intérieur","Chambres","Chalets","F&B","Cuisine","Lifestyle"],
  CSM:   ["Extérieur","Intérieur","Chambres","Villas","F&B","Cuisine","Lifestyle"],
  HDCER: ["Extérieur","Intérieur","Chambres","Villas","F&B","Cuisine","Lifestyle"],
  BB:    ["F&B","Cuisine","Lifestyle"],
};

const DEFAULT_SUBJECT_BANK = {
  HDCER: ["Lever de soleil sur la mer","Coucher de soleil iconique","Une journée à l'hôtel","Les plus belles vues","Room tour d'une suite","Les détails du luxe","La piscine mythique","Moments hors saison","Ambiance Riviera","Terrasse avec vue mer","Petit-déjeuner face à la mer","Moments de calme absolu","Les coins cachés","Arrivée d'un client","Expérience client complète","Service en chambre","Les jardins en fleurs","L'hôtel vu du ciel","Moments golden hour","Ambiance dolce vita"],
  CSM:   ["Vue panoramique","Moments de détente au spa","Une journée slow luxury","Les villas privées","Petit-déjeuner avec vue","Coucher de soleil sur les collines","Ambiance nature","Les jardins du domaine","Moments de silence","Dîner en terrasse","Expérience bien-être","Architecture du château","Moments intimistes","Les coins cachés","Une journée sans quitter l'hôtel","Ambiance romantique","Les saisons au domaine","Moments suspendus","Vue depuis la piscine","Évasion sur la Côte d'Azur"],
  APG:   ["Ski-in ski-out","Matin en montagne","Vue sur les pistes","Après-ski","Ambiance hivernale","Moments cocooning","Cheminée et ambiance chaleureuse","Une journée à Courchevel","Spa après ski","Neige qui tombe","Dîner en altitude","Activités montagne","Moments en famille","Ambiance soirée","Lever de soleil sur la neige","Vue depuis une suite","Expérience luxe en hiver","Moments cosy","Les pistes au lever du jour","Évasion alpine"],
  BB:    ["Cuisson d'une pièce de viande","Dressage d'assiette","Plats signature","Ambiance du restaurant","Dîner d'exception","Close-up food","Cocktails signature","Expérience client complète","Service en salle","Cuisine en action","Viandes premium","Moments de service","Ambiance soirée","Desserts signature","Plats à partager","Accords mets & vins","Textures et détails","Ambiance feutrée","Expérience gastronomique","Instants gourmands"],
};

// ── Contexts ─────────────────────────────────────────────────────────────────
const LibraryContext = createContext({ library: [], setLibrary: () => {} });
const AccountsContext = createContext({
  accounts: DEFAULT_ACCOUNTS,
  voices: DEFAULT_VOICES,
  hashtagBank: DEFAULT_HASHTAG_BANK,
  mandatoryHashtags: DEFAULT_MANDATORY,
  bestTimes: DEFAULT_BEST_TIMES,
  mentions: DEFAULT_MENTION,
  subjectBank: DEFAULT_SUBJECT_BANK,
});

// ── Design tokens ─────────────────────────────────────────────────────────────
const F = "-apple-system,'SF Pro Display','SF Pro Text','Helvetica Neue',sans-serif";
const C = {
  bg: "#F2F2F7", surface: "#FFFFFF", surfaceSecondary: "#F2F2F7",
  elevated: "rgba(255,255,255,0.85)", border: "rgba(0,0,0,0.08)",
  borderStrong: "rgba(0,0,0,0.13)", text: "#1C1C1E", textSecondary: "#636366",
  textTertiary: "#AEAEB2", blue: "#007AFF", green: "#34C759", red: "#FF3B30",
  orange: "#FF9500", indigo: "#5856D6", teal: "#5AC8FA",
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const selectStyle = { padding:"6px 10px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,color:C.text,background:C.surfaceSecondary,cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none" };
const inputStyle  = { width:"100%",padding:"9px 12px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text,background:C.surfaceSecondary,outline:"none",boxSizing:"border-box",transition:"border-color .15s" };
const labelStyle  = { fontSize:11,fontWeight:600,color:C.textTertiary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,display:"block",marginBottom:5 };
const navBtn      = { width:32,height:32,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.elevated,cursor:"pointer",fontSize:18,color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",boxShadow:"0 1px 3px rgba(0,0,0,0.08)" };
const cardStyle   = { background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)" };
const pillBtn     = (active, color) => ({ padding:"6px 16px",borderRadius:20,border:`1.5px solid ${color||C.blue}`,background:active?(color||C.blue):"transparent",color:active?"#fff":(color||C.blue),cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600,transition:"all .18s",letterSpacing:0.2 });

function Badge({ text, bg, fg, border: bd }) {
  return <span style={{ display:"inline-block",padding:"2px 8px",borderRadius:8,background:bg||"transparent",color:fg||C.textSecondary,fontSize:10,fontWeight:600,fontFamily:F,border:bd?`1px solid ${bd}`:"none",letterSpacing:0.3 }}>{text}</span>;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const DAYS_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const POST_TYPES = ["Photo","Carrousel","Reel"];
const STATUSES   = ["Brouillon","En cours","Validé","Programmé","Publié"];

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDayOfMonth(y,m){ const d=new Date(y,m,1).getDay(); return d===0?6:d-1; }
function fmtDate(y,m,d){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtDateFR(k){ const [y,m,d]=k.split("-"); return `${parseInt(d)}/${parseInt(m)}/${y}`; }
function getWeeksOfMonth(y,m){ const wks=[]; let cur=[]; for(let d=1;d<=getDaysInMonth(y,m);d++){ const dw=new Date(y,m,d).getDay(); const mb=dw===0?6:dw-1; if(mb===0&&cur.length>0){wks.push(cur);cur=[];} cur.push(d); } if(cur.length>0)wks.push(cur); return wks; }

// ── AI helpers ────────────────────────────────────────────────────────────────
function buildFinalHashtags(account, hashtagBank, mandatory) {
  const mand = (mandatory[account] || []);
  const all  = Object.values(hashtagBank[account] || {}).flat();
  const pool = [...new Set(all)].filter(t => !mand.map(m=>m.toLowerCase()).includes(t.toLowerCase()));
  if (mand.length >= 5) return mand.slice(0,5);
  const needed = 5 - mand.length;
  return [...mand, ...[...pool].sort(()=>Math.random()-.5).slice(0,needed)];
}

async function generateCaption(subject, account, credits, voices, hashtagBank, mandatory, mentions) {
  const voice     = voices[account] || "";
  const finalTags = buildFinalHashtags(account, hashtagBank, mandatory);
  const mention   = mentions[account] || "@oetkerhotels";

  const prompt = `You are an elite social media copywriter specializing in ultra-luxury hospitality.
You write for ${account}, whose voice is:
${voice}

Subject: ${subject}
${credits ? `Credits: ${credits}` : ""}

Your task: write an Instagram caption that makes the reader FEEL something — nostalgia, desire, calm, excitement — as if they are already there or desperately want to be.

STRICT RULES:
- HOOK: The first sentence must be a powerful, unexpected opening. Never a question. Never a cliché.
- LENGTH: 2 to 3 sentences per language.
- TONE: British elegance written in American English. Restrained but felt.
- BANNED WORDS: luxury, unique, unforgettable, magical, breathtaking, incredible, experience, world-class, prestigious, exceptional, exclusive, perfect, stunning, amazing, wonderful, paradise, dream, ultimate, unparalleled, exquisite.
- NO emojis. NO exclamation marks.

FORMAT (follow exactly):

[English caption]

—

[French translation]

—
${credits ? `\n${credits}\n\n—\n` : ""}
${mention}

${finalTags.join(" ")}

Output ONLY the caption text.`;

  try {
    const res  = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt }) });
    const data = await res.json();
    return (data.text || "").trim();
  } catch {
    return `The mountain holds its breath at this hour.\n\n—\n\nLa montagne retient son souffle à cette heure.\n\n—\n\n${mention}\n\n${finalTags.join(" ")}`;
  }
}

async function analyzeImageAndGenerate(imageUrl, imageBase64, account, credits, voices, hashtagBank, mandatory, mentions) {
  const voice = voices[account] || "";

  // ── Step 1: vision call — ask ONLY for a short subject (simple JSON) ──────
  const visionPrompt = `You are a creative director for ultra-luxury hospitality.
Look at this image and identify the mood, the light, the scene, the emotion it evokes.

Write a subject line in French for this image (5-10 words, magazine headline style).
The subject should capture the essence of the image, not just describe it literally.

Return ONLY valid JSON with a single key: {"subject": "le sujet en français"}`;

  let subject = "";
  try {
    const res  = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode:"vision", prompt: visionPrompt, imageUrl: imageUrl||null, imageBase64: imageBase64||null }),
    });
    const data = await res.json();
    if (!data.error) {
      const text = (data.text || "").trim();
      const m = text.match(/\{[\s\S]*?\}/);
      if (m) {
        try { subject = JSON.parse(m[0]).subject || ""; } catch {}
      }
      // fallback: if model returned plain text instead of JSON
      if (!subject) subject = text.replace(/^["']|["']$/g, "").split("\n")[0].trim();
    }
  } catch (e) {
    return { subject:"", caption:"", error: e.message };
  }

  if (!subject) return { subject:"", caption:"", error:"L'analyse de l'image n'a pas retourné de sujet." };

  // ── Step 2: standard text call — generate the full caption ───────────────
  const caption = await generateCaption(subject, account, credits, voices, hashtagBank, mandatory, mentions);

  return { subject, caption };
}

// ══════════════════════════════════════════════════════════════════════════════
// 🔐 LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in App will handle the rest
    } catch (err) {
      const messages = {
        "auth/invalid-credential":    "Email ou mot de passe incorrect.",
        "auth/user-not-found":        "Aucun compte trouvé pour cet email.",
        "auth/wrong-password":        "Mot de passe incorrect.",
        "auth/too-many-requests":     "Trop de tentatives. Réessaie dans quelques minutes.",
        "auth/invalid-email":         "Adresse email invalide.",
        "auth/network-request-failed":"Erreur réseau. Vérifie ta connexion.",
      };
      setError(messages[err.code] || "Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:F }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        {/* Logo / title */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📅</div>
          <h1 style={{ fontSize:26, fontWeight:700, color:C.text, margin:0, letterSpacing:-0.5 }}>Calendrier Éditorial</h1>
          <p style={{ fontSize:13, color:C.textSecondary, marginTop:8 }}>Connecte-toi pour accéder à l'outil</p>
        </div>

        {/* Card */}
        <div style={{ background:C.surface, borderRadius:20, border:`1px solid ${C.border}`, padding:28, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="prenom@exemple.com"
                autoComplete="email"
                autoFocus
                style={{ ...inputStyle, fontSize:15 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...inputStyle, fontSize:15 }}
              />
            </div>

            {error && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.red}12`, border:`1px solid ${C.red}30`, fontSize:13, color:C.red, fontFamily:F }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{ padding:"12px", borderRadius:12, border:"none", background: loading||!email||!password ? C.surfaceSecondary : C.blue, color: loading||!email||!password ? C.textTertiary : "#fff", cursor: loading||!email||!password ? "default" : "pointer", fontSize:15, fontFamily:F, fontWeight:600, transition:"all .2s", boxShadow: loading||!email||!password ? "none" : `0 2px 12px ${C.blue}44`, marginTop:4 }}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>

        <p style={{ textAlign:"center", fontSize:11, color:C.textTertiary, marginTop:20 }}>
          Accès réservé. Contacte l'administrateur pour obtenir un compte.
        </p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
function Settings({ config, setConfig }) {
  const [tab, setTab]           = useState("accounts");
  const [editingId, setEditing] = useState(null);
  const [draft, setDraft]       = useState(null);
  const [newAccForm, setNewAcc] = useState({ id:"", name:"", color:"#007AFF", light:"#E5F0FF" });
  const [showNewAcc, setShowNew] = useState(false);

  const { accounts, voices, hashtagBank, mandatoryHashtags, bestTimes, mentions, subjectBank } = config;

  // ── helpers ────────────────────────────────────────────────────────────────
  const updateConfig = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

  const startEdit = (acc) => {
    setEditing(acc.id);
    setDraft({
      ...acc,
      voice:     voices[acc.id]     || "",
      mention:   mentions[acc.id]   || "@oetkerhotels",
      weekday:   bestTimes[acc.id]?.weekday || "18:00",
      weekend:   bestTimes[acc.id]?.weekend || "10:00",
      timeNote:  bestTimes[acc.id]?.note    || "",
      mandatory: (mandatoryHashtags[acc.id] || []).join(", "),
      hashtags:  Object.values(hashtagBank[acc.id] || {}).flat().join(", "),
      subjects:  (subjectBank[acc.id] || []).join(", "),
    });
  };

  const saveEdit = () => {
    if (!draft) return;
    const id = draft.id;
    // accounts list
    const newAccounts = accounts.map(a => a.id === id ? { id, name: draft.name, color: draft.color, light: draft.light } : a);
    const parseTags = str => str.split(",").map(s=>s.trim()).filter(Boolean);
    updateConfig("accounts",          newAccounts);
    updateConfig("voices",            { ...voices,            [id]: draft.voice });
    updateConfig("mentions",          { ...mentions,          [id]: draft.mention });
    updateConfig("bestTimes",         { ...bestTimes,         [id]: { weekday: draft.weekday, weekend: draft.weekend, note: draft.timeNote } });
    updateConfig("mandatoryHashtags", { ...mandatoryHashtags, [id]: parseTags(draft.mandatory) });
    updateConfig("hashtagBank",       { ...hashtagBank,       [id]: { "Tous": parseTags(draft.hashtags) } });
    updateConfig("subjectBank",       { ...subjectBank,       [id]: parseTags(draft.subjects) });
    setEditing(null); setDraft(null);
  };

  const deleteAccount = (id) => {
    if (!window.confirm(`Supprimer le compte ${id} ? Tous ses posts resteront dans le calendrier.`)) return;
    updateConfig("accounts",          accounts.filter(a => a.id !== id));
    const drop = (obj) => { const n={...obj}; delete n[id]; return n; };
    updateConfig("voices",            drop(voices));
    updateConfig("mentions",          drop(mentions));
    updateConfig("bestTimes",         drop(bestTimes));
    updateConfig("mandatoryHashtags", drop(mandatoryHashtags));
    updateConfig("hashtagBank",       drop(hashtagBank));
    updateConfig("subjectBank",       drop(subjectBank));
  };

  const addAccount = () => {
    const id = newAccForm.id.trim().toUpperCase().replace(/\s/g,"");
    if (!id || !newAccForm.name.trim()) return alert("ID et nom requis.");
    if (accounts.find(a=>a.id===id)) return alert(`Le compte ${id} existe déjà.`);
    updateConfig("accounts",          [...accounts, { id, name: newAccForm.name.trim(), color: newAccForm.color, light: newAccForm.light }]);
    updateConfig("voices",            { ...voices,            [id]: "" });
    updateConfig("mentions",          { ...mentions,          [id]: "@moncompte" });
    updateConfig("bestTimes",         { ...bestTimes,         [id]: { weekday:"18:00", weekend:"10:00", note:"" } });
    updateConfig("mandatoryHashtags", { ...mandatoryHashtags, [id]: [] });
    updateConfig("hashtagBank",       { ...hashtagBank,       [id]: { "Tous": [] } });
    updateConfig("subjectBank",       { ...subjectBank,       [id]: [] });
    setNewAcc({ id:"", name:"", color:"#007AFF", light:"#E5F0FF" });
    setShowNew(false);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ ...cardStyle, padding:20, marginBottom:16, background:`linear-gradient(135deg,${C.blue}08,${C.indigo}08)` }}>
        <div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>⚙️ Paramètres</div>
        <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F }}>
          Configure les comptes, les voix IA, les hashtags et les horaires. Tout est sauvegardé automatiquement dans Firestore.
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap" }}>
        {[["accounts","Comptes"],["hashtags","Hashtags"],["times","Horaires"],["voices","Voix IA"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"7px 18px",borderRadius:10,border:`1px solid ${tab===k?C.blue:C.border}`,background:tab===k?C.blue:"transparent",color:tab===k?"#fff":C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:tab===k?600:400,transition:"all .18s" }}>{l}</button>
        ))}
      </div>

      {/* ── TAB: Comptes ── */}
      {tab === "accounts" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {accounts.map(acc => (
            <div key={acc.id} style={{ ...cardStyle,padding:0,overflow:"hidden",borderLeft:`4px solid ${acc.color}` }}>
              {/* Header row */}
              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:C.surface }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:acc.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <span style={{ color:"#fff",fontWeight:700,fontSize:13,fontFamily:F }}>{acc.id[0]}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:15,color:C.text,fontFamily:F }}>{acc.id}</div>
                  <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>{acc.name}</div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>editingId===acc.id?(setEditing(null),setDraft(null)):startEdit(acc)}
                    style={{ padding:"6px 14px",borderRadius:8,border:`1px solid ${C.blue}`,background:"transparent",color:C.blue,cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600 }}>
                    {editingId===acc.id?"Annuler":"✏️ Modifier"}
                  </button>
                  {editingId===acc.id && (
                    <button onClick={saveEdit}
                      style={{ padding:"6px 14px",borderRadius:8,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600 }}>
                      Sauvegarder
                    </button>
                  )}
                  <button onClick={()=>deleteAccount(acc.id)}
                    style={{ padding:"6px 10px",borderRadius:8,border:`1px solid ${C.red}`,background:"transparent",color:C.red,cursor:"pointer",fontSize:12,fontFamily:F }}>
                    ×
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {editingId===acc.id && draft && (
                <div style={{ padding:16,borderTop:`1px solid ${C.border}`,background:C.surfaceSecondary,display:"flex",flexDirection:"column",gap:14 }}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    <div>
                      <label style={labelStyle}>Nom affiché</label>
                      <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Mention Instagram</label>
                      <input value={draft.mention} onChange={e=>setDraft(d=>({...d,mention:e.target.value}))} placeholder="@compte" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    <div>
                      <label style={labelStyle}>Couleur principale</label>
                      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                        <input type="color" value={draft.color} onChange={e=>setDraft(d=>({...d,color:e.target.value}))} style={{ width:40,height:36,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",padding:2 }} />
                        <input value={draft.color} onChange={e=>setDraft(d=>({...d,color:e.target.value}))} style={{ ...inputStyle,flex:1 }} placeholder="#000000" />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Couleur claire (fond)</label>
                      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                        <input type="color" value={draft.light} onChange={e=>setDraft(d=>({...d,light:e.target.value}))} style={{ width:40,height:36,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",padding:2 }} />
                        <input value={draft.light} onChange={e=>setDraft(d=>({...d,light:e.target.value}))} style={{ ...inputStyle,flex:1 }} placeholder="#F5F5F5" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Voix IA (utilisée pour générer les captions)</label>
                    <textarea value={draft.voice} onChange={e=>setDraft(d=>({...d,voice:e.target.value}))} rows={3} style={{ ...inputStyle,lineHeight:1.5,resize:"vertical" }} placeholder="Décris la personnalité de ce compte en anglais..." />
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
                    <div>
                      <label style={labelStyle}>Heure semaine</label>
                      <input type="time" value={draft.weekday} onChange={e=>setDraft(d=>({...d,weekday:e.target.value}))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Heure weekend</label>
                      <input type="time" value={draft.weekend} onChange={e=>setDraft(d=>({...d,weekend:e.target.value}))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Note audience</label>
                      <input value={draft.timeNote} onChange={e=>setDraft(d=>({...d,timeNote:e.target.value}))} style={inputStyle} placeholder="Ex: Audience ski..." />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Hashtags obligatoires (séparés par des virgules, max 5)</label>
                    <input value={draft.mandatory} onChange={e=>setDraft(d=>({...d,mandatory:e.target.value}))} style={inputStyle} placeholder="#hashtag1, #hashtag2" />
                  </div>
                  <div>
                    <label style={labelStyle}>Banque de hashtags (séparés par des virgules)</label>
                    <textarea value={draft.hashtags} onChange={e=>setDraft(d=>({...d,hashtags:e.target.value}))} rows={3} style={{ ...inputStyle,lineHeight:1.6,resize:"vertical" }} placeholder="#tag1, #tag2, #tag3..." />
                  </div>
                  <div>
                    <label style={labelStyle}>Banque de sujets (séparés par des virgules)</label>
                    <textarea value={draft.subjects} onChange={e=>setDraft(d=>({...d,subjects:e.target.value}))} rows={3} style={{ ...inputStyle,lineHeight:1.6,resize:"vertical" }} placeholder="Lever de soleil, Vue panoramique, Dîner en terrasse..." />
                  </div>
                  <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
                    <button onClick={()=>{setEditing(null);setDraft(null);}} style={{ padding:"8px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F }}>Annuler</button>
                    <button onClick={saveEdit} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600,boxShadow:`0 2px 8px ${C.blue}44` }}>Sauvegarder</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add new account */}
          {showNewAcc ? (
            <div style={{ ...cardStyle,padding:16,borderStyle:"dashed" }}>
              <div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F,marginBottom:12 }}>Nouveau compte</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                <div>
                  <label style={labelStyle}>ID (court, ex: APG)</label>
                  <input value={newAccForm.id} onChange={e=>setNewAcc(f=>({...f,id:e.target.value.toUpperCase()}))} style={inputStyle} placeholder="APG" maxLength={8} />
                </div>
                <div>
                  <label style={labelStyle}>Nom complet</label>
                  <input value={newAccForm.name} onChange={e=>setNewAcc(f=>({...f,name:e.target.value}))} style={inputStyle} placeholder="L'Apogée Courchevel" />
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                <div>
                  <label style={labelStyle}>Couleur principale</label>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <input type="color" value={newAccForm.color} onChange={e=>setNewAcc(f=>({...f,color:e.target.value}))} style={{ width:40,height:36,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",padding:2 }} />
                    <input value={newAccForm.color} onChange={e=>setNewAcc(f=>({...f,color:e.target.value}))} style={{ ...inputStyle,flex:1 }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Couleur claire</label>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <input type="color" value={newAccForm.light} onChange={e=>setNewAcc(f=>({...f,light:e.target.value}))} style={{ width:40,height:36,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",padding:2 }} />
                    <input value={newAccForm.light} onChange={e=>setNewAcc(f=>({...f,light:e.target.value}))} style={{ ...inputStyle,flex:1 }} />
                  </div>
                </div>
              </div>
              <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                <button onClick={()=>{setShowNew(false);setNewAcc({id:"",name:"",color:"#007AFF",light:"#E5F0FF"});}} style={{ padding:"8px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F }}>Annuler</button>
                <button onClick={addAccount} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>Créer le compte</button>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowNew(true)} style={{ padding:"14px",borderRadius:14,border:`2px dashed ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:14,fontFamily:F,fontWeight:500,textAlign:"center" }}>
              + Ajouter un compte
            </button>
          )}
        </div>
      )}

      {/* ── TAB: Hashtags (lecture seule — édition dans Comptes) ── */}
      {tab === "hashtags" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,padding:"8px 12px",background:`${C.blue}08`,borderRadius:10,border:`1px solid ${C.blue}20` }}>
            Pour modifier les hashtags, utilise l'onglet Comptes → Modifier sur le compte souhaité.
          </div>
          {accounts.map(acc => {
            const mand = mandatoryHashtags[acc.id] || [];
            const all  = Object.values(hashtagBank[acc.id] || {}).flat();
            return (
              <div key={acc.id} style={{ ...cardStyle,padding:16,borderLeft:`4px solid ${acc.color}` }}>
                <div style={{ fontWeight:700,fontSize:14,color:acc.color,fontFamily:F,marginBottom:10 }}>{acc.id} — {acc.name}</div>
                {mand.length>0 && (
                  <div style={{ marginBottom:8 }}>
                    <span style={{ fontSize:10,fontWeight:600,color:C.blue,fontFamily:F,letterSpacing:0.5,textTransform:"uppercase" }}>Obligatoires · </span>
                    {mand.map(t=><span key={t} style={{ display:"inline-block",margin:"2px 3px",padding:"2px 8px",borderRadius:12,background:C.blue,color:"#fff",fontSize:11,fontFamily:"monospace" }}>{t}</span>)}
                  </div>
                )}
                <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                  {all.filter(t=>!mand.includes(t)).map(t=>(
                    <span key={t} style={{ display:"inline-block",padding:"2px 8px",borderRadius:12,background:C.surfaceSecondary,border:`1px solid ${C.border}`,fontSize:11,fontFamily:"monospace",color:C.text }}>{t}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: Horaires ── */}
      {tab === "times" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,padding:"8px 12px",background:`${C.blue}08`,borderRadius:10,border:`1px solid ${C.blue}20` }}>
            Les horaires suggérés apparaissent dans chaque fiche post et dans l'export. Modifiables dans Comptes → Modifier.
          </div>
          {accounts.map(acc => {
            const t = bestTimes[acc.id] || {};
            return (
              <div key={acc.id} style={{ ...cardStyle,padding:16,borderLeft:`4px solid ${acc.color}`,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap" }}>
                <div style={{ fontWeight:700,fontSize:14,color:acc.color,fontFamily:F,minWidth:60 }}>{acc.id}</div>
                <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F,flex:1 }}>{acc.name}</div>
                <div style={{ display:"flex",gap:16,fontSize:13,fontFamily:F }}>
                  <span>📅 Semaine : <strong>{t.weekday||"—"}</strong></span>
                  <span>🌅 Weekend : <strong>{t.weekend||"—"}</strong></span>
                </div>
                {t.note && <span style={{ fontSize:11,color:C.textTertiary,fontFamily:F }}>{t.note}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: Voix IA ── */}
      {tab === "voices" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,padding:"8px 12px",background:`${C.blue}08`,borderRadius:10,border:`1px solid ${C.blue}20` }}>
            La voix IA est le texte envoyé à l'IA pour lui donner le ton du compte. Écris-le en anglais pour de meilleurs résultats.
          </div>
          {accounts.map(acc => (
            <div key={acc.id} style={{ ...cardStyle,padding:16,borderLeft:`4px solid ${acc.color}` }}>
              <div style={{ fontWeight:700,fontSize:14,color:acc.color,fontFamily:F,marginBottom:8 }}>{acc.id} — {acc.name}</div>
              <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F,lineHeight:1.6,fontStyle:"italic" }}>
                {voices[acc.id] || <span style={{ color:C.textTertiary }}>Aucune voix définie</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// All other components — unchanged in logic, now use AccountsContext
// ══════════════════════════════════════════════════════════════════════════════

function OpenClosedPanel({ accountSettings, setAccountSettings, month, onGenerate, onClear }) {
  const { accounts } = useContext(AccountsContext);
  const updateSetting = (id,field,val) => setAccountSettings(p=>({...p,[id]:{...p[id],[field]:val}}));

  const updateTypeMix = (id, type, val) => {
    setAccountSettings(p => {
      const s = p[id] || {};
      const mix = { ...(s.typeMix || { Photo:1, Carrousel:1, Reel:1 }), [type]: Math.max(0, parseInt(val)||0) };
      const total = (mix.Photo||0) + (mix.Carrousel||0) + (mix.Reel||0);
      // Auto-update postsPerWeek to match total if total > current
      const ppw = total > parseInt(s.postsPerWeek||3) ? total : parseInt(s.postsPerWeek||3);
      return { ...p, [id]: { ...s, typeMix: mix, postsPerWeek: ppw } };
    });
  };

  return (
    <div style={{ ...cardStyle,padding:20,marginBottom:16 }}>
      <div style={{ fontSize:12,fontWeight:600,color:C.textSecondary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,marginBottom:14 }}>
        Établissements — {MONTHS_FR[month]}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10 }}>
        {accounts.map(a=>{
          const s=accountSettings[a.id]||{isOpen:true,postsPerWeek:3,closingDate:"",openingDate:""};
          const mix=s.typeMix||{Photo:1,Carrousel:1,Reel:1};
          const mixTotal=(mix.Photo||0)+(mix.Carrousel||0)+(mix.Reel||0);
          const ppw=parseInt(s.postsPerWeek)||3;
          return (
            <div key={a.id} style={{ padding:"14px",borderRadius:12,border:`1px solid ${C.border}`,background:C.surfaceSecondary }}>
              {/* Row 1: toggle + name + posts/week */}
              <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
                <button onClick={()=>updateSetting(a.id,"isOpen",!s.isOpen)} style={{ width:26,height:26,borderRadius:"50%",border:"none",background:s.isOpen?C.green:C.red,cursor:"pointer",flexShrink:0,transition:"background .2s",boxShadow:`0 2px 6px ${s.isOpen?C.green:C.red}55` }} title={s.isOpen?"Ouvert — cliquer pour fermer":"Fermé — cliquer pour ouvrir"}/>
                <span style={{ fontWeight:700,fontSize:13,color:a.color,fontFamily:F }}>{a.id}</span>
                <span style={{ fontSize:11,color:C.textTertiary,fontFamily:F,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.name}</span>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <input type="number" min="0" max="99" value={s.postsPerWeek}
                    onChange={e=>updateSetting(a.id,"postsPerWeek",Math.max(0,parseInt(e.target.value)||0))}
                    style={{ width:44,padding:"4px 6px",borderRadius:10,border:`1px solid ${C.border}`,fontSize:13,fontFamily:F,textAlign:"center",color:C.blue,fontWeight:700,background:C.surface,outline:"none" }}/>
                  <span style={{ fontSize:10,color:C.textTertiary,fontFamily:F }}>/sem</span>
                </div>
              </div>

              {/* Row 2: type mix */}
              <div style={{ marginTop:10,padding:"10px",borderRadius:8,background:C.surface,border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:10,color:C.textTertiary,fontFamily:F,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8 }}>Répartition par type</div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  {[
                    {key:"Reel",label:"Reels",color:C.indigo},
                    {key:"Carrousel",label:"Carr.",color:"#2E7D6F"},
                    {key:"Photo",label:"Photos",color:"#B8860B"},
                  ].map(({key,label,color})=>(
                    <div key={key} style={{ flex:1,textAlign:"center" }}>
                      <div style={{ fontSize:9,color,fontFamily:F,fontWeight:600,marginBottom:3 }}>{label}</div>
                      <input type="number" min="0" max="99" value={mix[key]||0}
                        onChange={e=>updateTypeMix(a.id,key,e.target.value)}
                        style={{ width:"100%",padding:"4px 4px",borderRadius:8,border:`1.5px solid ${color}44`,fontSize:13,fontFamily:F,textAlign:"center",color,fontWeight:700,background:"transparent",outline:"none" }}/>
                    </div>
                  ))}
                  <div style={{ textAlign:"center",paddingLeft:4,borderLeft:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:9,color:C.textTertiary,fontFamily:F,fontWeight:600,marginBottom:3 }}>Total</div>
                    <div style={{ fontSize:14,fontWeight:700,color:mixTotal===ppw?C.green:C.orange,fontFamily:F }}>{mixTotal}</div>
                  </div>
                </div>
                {mixTotal!==ppw&&mixTotal>0&&(
                  <div style={{ fontSize:10,color:C.orange,fontFamily:F,marginTop:6,textAlign:"center" }}>
                    {mixTotal>ppw?`Total mis à jour : ${mixTotal} posts/sem`:`${ppw-mixTotal} post${ppw-mixTotal>1?"s":""} sans type assigné → distribués aléatoirement`}
                  </div>
                )}
              </div>

              {/* Row 3: dates */}
              <div style={{ display:"flex",gap:10,marginTop:10,flexWrap:"wrap" }}>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <span style={{ fontSize:10,color:C.textTertiary,fontFamily:F }}>Fermeture</span>
                  <input type="date" value={s.closingDate||""} onChange={e=>updateSetting(a.id,"closingDate",e.target.value)} style={{ padding:"2px 6px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.text,background:C.surface,outline:"none" }}/>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <span style={{ fontSize:10,color:C.textTertiary,fontFamily:F }}>Ouverture</span>
                  <input type="date" value={s.openingDate||""} onChange={e=>updateSetting(a.id,"openingDate",e.target.value)} style={{ padding:"2px 6px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.text,background:C.surface,outline:"none" }}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex",gap:8,marginTop:14,justifyContent:"flex-end" }}>
        {onClear&&<button onClick={onClear} style={{ padding:"8px 16px",borderRadius:10,border:`1px solid ${C.red}`,background:"transparent",color:C.red,cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:500 }}>Effacer le planning</button>}
        {onGenerate&&<button onClick={onGenerate} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontFamily:F,fontSize:13,fontWeight:600,boxShadow:`0 2px 8px ${C.blue}44` }}>Générer le planning</button>}
      </div>
    </div>
  );
}

function Stats({ posts }) {
  const { accounts } = useContext(AccountsContext);
  const all=Object.values(posts).flat();
  const byAcc={}; accounts.forEach(a=>{byAcc[a.id]=0;}); all.forEach(p=>{if(p.account&&byAcc[p.account]!==undefined)byAcc[p.account]++;});
  const byType={Photo:0,Carrousel:0,Reel:0}; all.forEach(p=>{if(p.type&&byType[p.type]!==undefined)byType[p.type]++;});
  const box={background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"10px 16px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"};
  return (
    <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
      <div style={box}><div style={{ fontSize:10,color:C.textTertiary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,fontWeight:600 }}>Total</div><div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F }}>{all.length}</div></div>
      {accounts.map(a=><div key={a.id} style={{ ...box,borderBottom:`2px solid ${a.color}` }}><div style={{ fontSize:10,color:C.textTertiary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,fontWeight:600 }}>{a.id}</div><div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F }}>{byAcc[a.id]||0}</div></div>)}
      {POST_TYPES.map(t=><div key={t} style={box}><div style={{ fontSize:10,color:C.textTertiary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,fontWeight:600 }}>{t}s</div><div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F }}>{byType[t]}</div></div>)}
    </div>
  );
}

function MonthlyRecap({ year, month, posts, openStatus }) {
  const { accounts } = useContext(AccountsContext);
  const prefix=`${year}-${String(month+1).padStart(2,"0")}`;
  const monthPosts=Object.entries(posts).filter(([k])=>k.startsWith(prefix)).flatMap(([k,v])=>v.map(p=>({...p,date:k})));
  const byAccount={};
  accounts.forEach(a=>{byAccount[a.id]={total:0,Photo:0,Carrousel:0,Reel:0};});
  monthPosts.forEach(p=>{if(p.account&&byAccount[p.account]){byAccount[p.account].total++;if(p.type)byAccount[p.account][p.type]=(byAccount[p.account][p.type]||0)+1;}});
  const numWeeks=getWeeksOfMonth(year,month).length;
  const dayAccMap={};
  monthPosts.forEach(p=>{const k=`${p.date}-${p.account}`;dayAccMap[k]=(dayAccMap[k]||0)+1;});
  const conflicts=Object.entries(dayAccMap).filter(([,c])=>c>1);
  return (
    <div style={{ ...cardStyle,padding:16,marginTop:16 }}>
      <div style={{ fontSize:11,fontWeight:600,color:C.text,letterSpacing:1,textTransform:"uppercase",fontFamily:F,marginBottom:14 }}>Récap — {MONTHS_FR[month]} {year}</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:14 }}>
        {accounts.map(a=>{
          const isOpen=openStatus[a.id]!==false;
          const target=isOpen?numWeeks*3:numWeeks*2;
          const actual=(byAccount[a.id]||{}).total||0;
          const diff=actual-target; const ok=diff>=0;
          const hasReel=(byAccount[a.id]||{}).Reel>0;
          return (
            <div key={a.id} style={{ padding:12,borderRadius:10,border:`1px solid ${a.color}22`,borderLeft:`3px solid ${a.color}`,background:C.surfaceSecondary }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                <span style={{ fontWeight:700,fontSize:13,color:a.color,fontFamily:F }}>{a.id}</span>
                <span style={{ fontSize:10,color:C.textSecondary,fontFamily:F }}>{isOpen?"Ouvert":"Fermé"}</span>
              </div>
              <div style={{ fontSize:24,fontWeight:300,color:C.text,fontFamily:F }}>{actual}<span style={{ fontSize:13,color:C.textSecondary }}>/{target}</span></div>
              <div style={{ fontSize:10,color:ok?C.green:C.red,fontFamily:F,marginTop:2 }}>{ok?"Objectif atteint":`${Math.abs(diff)} post${Math.abs(diff)>1?"s":""} manquant${Math.abs(diff)>1?"s":""}`}</div>
              <div style={{ display:"flex",gap:6,marginTop:6 }}>
                <Badge text={`${(byAccount[a.id]||{}).Photo||0} Photo`} fg="#B8860B" border="#B8860B" />
                <Badge text={`${(byAccount[a.id]||{}).Carrousel||0} Carr.`} fg="#2E7D6F" border="#2E7D6F" />
                <Badge text={`${(byAccount[a.id]||{}).Reel||0} Reel`} fg="#8B3A62" border="#8B3A62" />
              </div>
              {!hasReel&&actual>0&&<div style={{ fontSize:10,color:"#E67E22",marginTop:4,fontFamily:F }}>Pas de Reel ce mois-ci</div>}
            </div>
          );
        })}
      </div>
      {conflicts.length>0&&(
        <div style={{ padding:10,borderRadius:10,background:"#FFF3E0",border:"1px solid #FFE0B2",marginTop:8 }}>
          <div style={{ fontSize:11,fontWeight:600,color:"#E65100",fontFamily:F,marginBottom:4 }}>Attention — posts en doublon</div>
          {conflicts.map(([key])=>{const[date,acc]=[key.substring(0,10),key.substring(11)];return <div key={key} style={{ fontSize:11,color:"#BF360C",fontFamily:F }}>{fmtDateFR(date)} : {acc} a {dayAccMap[key]} posts le même jour</div>;})}
        </div>
      )}
    </div>
  );
}

function ExportButton({ year, month, posts }) {
  const { accounts, bestTimes } = useContext(AccountsContext);
  const [exporting,setExporting]=useState(false);
  const [showReady,setShowReady]=useState(false);
  const [filterAcc,setFilterAcc]=useState("all");
  const [copiedKey,setCopiedKey]=useState(null);
  const prefix=`${year}-${String(month+1).padStart(2,"0")}`;
  const allPosts=Object.entries(posts).filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).flatMap(([dateKey,dp])=>dp.map((p,idx)=>{
    const dow=new Date(dateKey).getDay(); const isWe=dow===0||dow===6;
    const time=p.account&&bestTimes[p.account]?(isWe?bestTimes[p.account].weekend:bestTimes[p.account].weekday):"";
    const fi=(p.mediaItems||[]).find(m=>(m.fileData&&m.fileData.startsWith("data:image"))||(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));
    return {...p,dateKey,time,idx,thumbSrc:fi?.fileData||fi?.url||null,imageUrl:fi?.url||null};
  }));
  const filtered=filterAcc==="all"?allPosts:allPosts.filter(p=>p.account===filterAcc);
  const handleCSV=()=>{
    if(allPosts.length===0)return; setExporting(true);
    accounts.forEach(acc=>{
      const ap=allPosts.filter(p=>p.account===acc.id); if(ap.length===0)return;
      const rows=[["Date","Heure","Type","Statut","Sujet","Caption","Image URL","Crédits"],...ap.map(p=>[p.dateKey,p.time,p.type||"",p.status||"Brouillon",p.subject||"",`"${(p.caption||"").replace(/"/g,'""')}"`,p.imageUrl||"",p.credits||""])];
      const csv=rows.map(r=>r.join(";")).join("\n");
      const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`${acc.id}_${MONTHS_FR[month].toLowerCase()}_${year}.csv`; a.click(); URL.revokeObjectURL(url);
    }); setExporting(false);
  };
  const copyCaption=(key,cap)=>{navigator.clipboard.writeText(cap);setCopiedKey(key);setTimeout(()=>setCopiedKey(null),2000);};
  if(showReady)return(
    <div style={{ ...cardStyle,padding:20,marginTop:16 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div><div style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F }}>Prêt à programmer</div><div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,marginTop:2 }}>{MONTHS_FR[month]} {year} — {filtered.length} post{filtered.length!==1?"s":""}</div></div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          <button onClick={handleCSV} disabled={exporting} style={{ padding:"8px 14px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600 }}>↓ CSV</button>
          <button onClick={()=>setShowReady(false)} style={{ padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceSecondary,color:C.textSecondary,cursor:"pointer",fontSize:12,fontFamily:F }}>Fermer</button>
        </div>
      </div>
      <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap" }}>
        <button onClick={()=>setFilterAcc("all")} style={{ ...pillBtn(filterAcc==="all"),fontSize:11,padding:"4px 12px" }}>Tous</button>
        {accounts.map(a=><button key={a.id} onClick={()=>setFilterAcc(a.id)} style={{ ...pillBtn(filterAcc===a.id,a.color),fontSize:11,padding:"4px 12px" }}>{a.id}</button>)}
      </div>
      {filtered.length===0&&<div style={{ textAlign:"center",color:C.textTertiary,padding:40,fontSize:13,fontFamily:F }}>Aucun post ce mois-ci</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {filtered.map((p,i)=>{
          const acc=accounts.find(a=>a.id===p.account);
          const key=`${p.dateKey}-${p.account}-${p.idx}`;
          const isCopied=copiedKey===key;
          const [y,m,d]=p.dateKey.split("-");
          const dateObj=new Date(Number(y),Number(m)-1,Number(d));
          const dow=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][dateObj.getDay()];
          return(
            <div key={key} style={{ borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",background:C.surface }}>
              <div style={{ padding:"10px 14px",background:acc?`${acc.color}10`:C.surfaceSecondary,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
                <div style={{ fontWeight:700,fontSize:12,color:acc?.color,fontFamily:F }}>{p.account}</div>
                <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>{dow} {parseInt(d)} {MONTHS_FR[Number(m)-1]} {y}</div>
                {p.time&&<div style={{ fontSize:11,color:C.blue,fontFamily:F,background:`${C.blue}12`,padding:"2px 8px",borderRadius:6 }}>🕐 {p.time}</div>}
                <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
                  <Badge text={p.type||"?"} fg={p.type==="Photo"?"#B8860B":p.type==="Reel"?"#8B3A62":"#2E7D6F"} border={p.type==="Photo"?"#B8860B":p.type==="Reel"?"#8B3A62":"#2E7D6F"} />
                  <Badge text={p.status||"Brouillon"} bg={p.status==="Validé"||p.status==="Publié"?`${C.green}22`:`${C.orange}22`} fg={p.status==="Validé"||p.status==="Publié"?C.green:C.orange} />
                </div>
              </div>
              <div style={{ display:"flex" }}>
                <div style={{ width:120,minHeight:120,flexShrink:0,background:C.surfaceSecondary,borderRight:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {p.thumbSrc?<img src={p.thumbSrc} style={{ width:120,height:120,objectFit:"cover" }}/>:<div style={{ textAlign:"center",padding:10 }}><div style={{ fontSize:24 }}>📷</div><div style={{ fontSize:9,color:C.textTertiary,fontFamily:F,marginTop:4 }}>Pas d'image</div></div>}
                </div>
                <div style={{ flex:1,padding:14,display:"flex",flexDirection:"column",gap:8 }}>
                  {p.subject&&<div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F }}>{p.subject}</div>}
                  {p.caption?(<>
                    <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,lineHeight:1.5,maxHeight:80,overflow:"hidden",whiteSpace:"pre-wrap" }}>{p.caption.slice(0,200)}{p.caption.length>200?"…":""}</div>
                    <div style={{ display:"flex",gap:8,marginTop:"auto",flexWrap:"wrap" }}>
                      <button onClick={()=>copyCaption(key,p.caption)} style={{ padding:"6px 14px",borderRadius:8,border:"none",background:isCopied?C.green:C.blue,color:"#fff",cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600,transition:"background .2s" }}>{isCopied?"✓ Copié !":"Copier la caption"}</button>
                      {p.imageUrl&&<a href={p.imageUrl} target="_blank" rel="noopener noreferrer" style={{ padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surfaceSecondary,color:C.text,cursor:"pointer",fontSize:12,fontFamily:F,textDecoration:"none" }}>Ouvrir l'image ↗</a>}
                    </div>
                  </>):<div style={{ fontSize:12,color:C.textTertiary,fontFamily:F,fontStyle:"italic" }}>Pas de caption encore</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  return(
    <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:16 }}>
      <button onClick={()=>setShowReady(true)} style={{ padding:"10px 20px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600,boxShadow:`0 2px 8px ${C.blue}44` }}>📋 Voir les posts prêts à programmer</button>
      <button onClick={handleCSV} disabled={exporting} style={{ padding:"10px 20px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:exporting?"default":"pointer",fontSize:13,fontFamily:F,fontWeight:600,boxShadow:`0 2px 8px ${C.green}44` }}>{exporting?"Export...":"↓ Exporter CSV"}</button>
    </div>
  );
}

function CalendarMonth({ year, month, posts, onDayClick, selectedDay, onDeletePost, onDropPost }) {
  const { accounts } = useContext(AccountsContext);
  const daysInMonth=getDaysInMonth(year,month); const firstDay=getFirstDayOfMonth(year,month);
  const cells=[]; for(let i=0;i<firstDay;i++)cells.push(null); for(let d=1;d<=daysInMonth;d++)cells.push(d); while(cells.length%7!==0)cells.push(null);
  const [dragOver,setDragOver]=useState(null);
  return(
    <div style={cardStyle}>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`1px solid ${C.border}` }}>
        {DAYS_FR.map(d=><div key={d} style={{ padding:"10px 0",textAlign:"center",fontFamily:F,fontSize:11,fontWeight:600,color:C.textTertiary,letterSpacing:1,textTransform:"uppercase",background:C.surfaceSecondary }}>{d}</div>)}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)" }}>
        {cells.map((day,i)=>{
          const dateKey=day?fmtDate(year,month,day):null;
          const dayPosts=dateKey?(posts[dateKey]||[]):[];
          const isSel=day===selectedDay; const isWe=i%7>=5; const isDrag=dragOver===dateKey;
          const isToday=day&&new Date().getDate()===day&&new Date().getMonth()===month&&new Date().getFullYear()===year;
          return(
            <div key={i} onClick={()=>day&&onDayClick(day)}
              onDragOver={e=>{if(!dateKey)return;e.preventDefault();setDragOver(dateKey);}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={e=>{e.preventDefault();setDragOver(null);if(!dateKey)return;try{const data=JSON.parse(e.dataTransfer.getData("text/plain"));if(data.fromDateKey!==dateKey)onDropPost(data.fromDateKey,data.fromIndex,dateKey);}catch{}}}
              style={{ minHeight:90,padding:"6px 6px 4px",borderRight:(i+1)%7!==0?`1px solid ${C.border}`:"none",borderBottom:`1px solid ${C.border}`,cursor:day?"pointer":"default",background:isDrag?`${C.blue}08`:isSel?`${C.blue}06`:isWe&&day?C.surfaceSecondary:day?C.surface:C.surfaceSecondary,transition:"background .12s",position:"relative",outline:isDrag?`2px dashed ${C.blue}`:"none" }}>
              {day&&(<>
                <div style={{ fontSize:13,fontWeight:isToday?700:isSel?600:400,color:isToday?"#fff":isSel?C.blue:isWe?C.textSecondary:C.text,fontFamily:F,marginBottom:4,width:22,height:22,borderRadius:"50%",background:isToday?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center" }}>{day}</div>
                <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                  {dayPosts.map((p,j)=>{
                    const acc=accounts.find(a=>a.id===p.account);
                    const stMap={"Brouillon":{letter:"B",bg:"#FF9500"},"En cours":{letter:"•",bg:C.blue},"Validé":{letter:"✓",bg:C.green},"Programmé":{letter:"P",bg:C.indigo},"Publié":{letter:"✓",bg:C.green}};
                    const st=stMap[p.status||"Brouillon"]||stMap["Brouillon"];
                    const fi=(p.mediaItems||[]).find(m=>(m.fileData&&m.fileData.startsWith("data:image"))||(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));
                    const thumb=fi?.fileData||fi?.url;
                    return(
                      <div key={j} draggable onDragStart={e=>{e.stopPropagation();e.dataTransfer.setData("text/plain",JSON.stringify({fromDateKey:dateKey,fromIndex:j}));}} onClick={e=>e.stopPropagation()}
                        style={{ display:"flex",alignItems:"center",gap:3,cursor:"grab",borderRadius:5,padding:"1px 0" }}>
                        {thumb?<img src={thumb} style={{ width:16,height:16,borderRadius:3,objectFit:"cover",flexShrink:0 }}/>:<div style={{ width:16,height:16,borderRadius:3,background:acc?.color?`${acc.color}30`:"#F0F0F0",flexShrink:0 }}/>}
                        <div style={{ display:"flex",borderRadius:6,overflow:"hidden",fontSize:9,fontWeight:600,fontFamily:F,lineHeight:1 }}>
                          <span style={{ padding:"2px 4px",background:acc?.color||C.textSecondary,color:"#fff" }}>{p.account}</span>
                          <span style={{ padding:"2px 4px",background:acc?`${acc.color}18`:"#F5F5F5",color:acc?.color||"#666" }}>{p.type||"—"}</span>
                        </div>
                        <span style={{ width:12,height:12,borderRadius:"50%",background:st.bg,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><span style={{ color:"#fff",fontSize:7,fontWeight:700 }}>{st.letter}</span></span>
                        <span onClick={e=>{e.stopPropagation();onDeletePost(dateKey,j);}} style={{ fontSize:11,color:C.textTertiary,cursor:"pointer",marginLeft:"auto",padding:"0 2px",lineHeight:1 }} onMouseEnter={e=>e.target.style.color=C.red} onMouseLeave={e=>e.target.style.color=C.textTertiary}>×</span>
                      </div>
                    );
                  })}
                </div>
                {dayPosts.length===0&&<div style={{ fontSize:16,color:C.border,position:"absolute",bottom:4,right:6,fontWeight:300 }}>+</div>}
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostEditor({ post, dateKey, index, onUpdate, onDelete, onGenerate, onDuplicate, generating }) {
  const { accounts, voices, hashtagBank, mandatoryHashtags, bestTimes, mentions, subjectBank } = useContext(AccountsContext);
  const acc=accounts.find(a=>a.id===post.account);
  const [copied,setCopied]=useState(false);
  const [showDup,setShowDup]=useState(false);
  const [dupDate,setDupDate]=useState("");
  const [dupAccount,setDupAccount]=useState("");
  const [showLibrary,setShowLibrary]=useState(false);
  const [analyzingImage,setAnalyzingImage]=useState(false);
  const dow=new Date(dateKey).getDay(); const isWeekend=dow===0||dow===6;
  const suggestedTime=post.account&&bestTimes[post.account]?(isWeekend?bestTimes[post.account].weekend:bestTimes[post.account].weekday):null;
  const subjects=post.account&&subjectBank[post.account]?subjectBank[post.account]:[];
  return(
    <div style={{ background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:10,borderLeft:`3px solid ${acc?.color||C.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap" }}>
        <select value={post.account} onChange={e=>onUpdate("account",e.target.value)} style={selectStyle}>
          <option value="">Compte</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}
        </select>
        <select value={post.type} onChange={e=>onUpdate("type",e.target.value)} style={selectStyle}>
          <option value="">Type</option>
          {POST_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={post.status||"Brouillon"} onChange={e=>onUpdate("status",e.target.value)} style={{ ...selectStyle,background:post.status==="Validé"?"#E8F5E9":post.status==="Programmé"?"#E3EDF7":post.status==="Publié"?"#F5F5F5":"#FFF8E1" }}>
          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setShowDup(!showDup)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.textSecondary,cursor:"pointer",fontSize:10,padding:"2px 8px",fontFamily:F }}>Dupliquer</button>
        <button onClick={onDelete} style={{ background:"none",border:"none",color:C.textTertiary,cursor:"pointer",fontSize:16,padding:"2px 6px" }}>×</button>
      </div>
      {showDup&&(
        <div style={{ padding:10,marginBottom:10,background:C.surfaceSecondary,borderRadius:10,border:"1px solid #E8E8E8" }}>
          <div style={{ fontSize:10,fontWeight:600,color:C.text,marginBottom:6,fontFamily:F,letterSpacing:0.5,textTransform:"uppercase" }}>Dupliquer ce post</div>
          <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
            <input type="date" value={dupDate} onChange={e=>setDupDate(e.target.value)} style={{ ...selectStyle,fontSize:11 }}/>
            <select value={dupAccount} onChange={e=>setDupAccount(e.target.value)} style={{ ...selectStyle,fontSize:11 }}>
              <option value="">Même compte</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}
            </select>
            <button onClick={()=>{if(dupDate){onDuplicate(dupDate,dupAccount||post.account);setShowDup(false);setDupDate("");setDupAccount("");}}} style={{ padding:"3px 10px",borderRadius:6,border:`1px solid ${C.blue}`,background:C.blue,color:"#fff",cursor:"pointer",fontSize:10,fontFamily:F }}>OK</button>
          </div>
        </div>
      )}
      {suggestedTime&&<div style={{ fontSize:10,color:C.blue,fontFamily:F,marginBottom:8,padding:"4px 8px",background:"#F0F6FC",borderRadius:6,display:"inline-block" }}>Horaire suggéré : {suggestedTime} ({isWeekend?"weekend":"semaine"})</div>}
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
          <label style={{ ...labelStyle,marginBottom:0 }}>Sujet</label>
          {subjects.length>0&&<button onClick={()=>onUpdate("subject",subjects[Math.floor(Math.random()*subjects.length)])} style={{ fontSize:10,padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surfaceSecondary,cursor:"pointer",color:"#666",fontFamily:F }}>Générer un sujet</button>}
        </div>
        <input value={post.subject||""} onChange={e=>onUpdate("subject",e.target.value)} onBlur={e=>{if(e.target.value.trim()&&post.account&&!post.caption)onGenerate();}} placeholder="Ex: Vue panoramique depuis la terrasse..." style={inputStyle}/>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={labelStyle}>Crédits (optionnel)</label>
        <input value={post.credits||""} onChange={e=>onUpdate("credits",e.target.value)} placeholder="Ex: Photo @nom_photographe" style={inputStyle}/>
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={labelStyle}>Médias</label>
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {(post.mediaItems||[]).map((item,i)=>(
            <div key={i} style={{ padding:"6px 10px",background:C.surfaceSecondary,borderRadius:8,border:"1px solid #E8E8E8" }}>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <input value={item.name||""} onChange={e=>{const items=[...(post.mediaItems||[])];items[i]={...items[i],name:e.target.value};onUpdate("mediaItems",items);}} placeholder="Nom du fichier" style={{ ...inputStyle,flex:1,fontSize:11,padding:"4px 6px" }}/>
                <label style={{ padding:"3px 8px",borderRadius:6,border:`1px solid ${C.teal}`,background:"#fff",color:C.teal,cursor:"pointer",fontSize:10,fontFamily:F,fontWeight:500,whiteSpace:"nowrap" }}>
                  {item.fileData?"Changer":"Uploader"}
                  <input type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={e=>{const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{const items=[...(post.mediaItems||[])];items[i]={...items[i],fileData:r.result,fileName:file.name,name:items[i].name||file.name};onUpdate("mediaItems",items);};r.readAsDataURL(file);}}/>
                </label>
                <span onClick={()=>{const items=[...(post.mediaItems||[])];items.splice(i,1);onUpdate("mediaItems",items);}} style={{ fontSize:14,color:C.textTertiary,cursor:"pointer",padding:"0 4px" }} onMouseEnter={e=>e.target.style.color=C.red} onMouseLeave={e=>e.target.style.color=C.textTertiary}>×</span>
              </div>
              {item.fileData&&item.fileData.startsWith("data:image")&&<img src={item.fileData} style={{ marginTop:6,maxWidth:120,maxHeight:80,borderRadius:6,objectFit:"cover",border:"1px solid #E8E8E8" }}/>}
              {item.url&&item.fileType?.startsWith("image/")&&!item.fileData&&<img src={item.url} style={{ marginTop:6,maxWidth:120,maxHeight:80,borderRadius:6,objectFit:"cover",border:"1px solid #E8E8E8" }}/>}
              {item.fileData&&item.fileData.startsWith("data:video")&&<div style={{ marginTop:6,fontSize:10,color:C.teal,fontFamily:F }}>Vidéo : {item.fileName||"uploadée"}</div>}
              <div style={{ display:"flex",gap:6,alignItems:"center",marginTop:4 }}>
                <input value={item.driveUrl||""} onChange={e=>{const items=[...(post.mediaItems||[])];items[i]={...items[i],driveUrl:e.target.value};onUpdate("mediaItems",items);}} placeholder="Lien Google Drive (optionnel)" style={{ ...inputStyle,fontSize:10,padding:"3px 6px",flex:1 }}/>
                {item.driveUrl&&<a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:10,color:C.teal,textDecoration:"none",whiteSpace:"nowrap" }}>Ouvrir</a>}
              </div>
            </div>
          ))}
          <div style={{ display:"flex",gap:6 }}>
            <button onClick={()=>{const items=[...(post.mediaItems||[])];items.push({name:"",fileData:null,fileName:"",driveUrl:""});onUpdate("mediaItems",items);}} style={{ flex:1,padding:"6px 12px",borderRadius:8,border:"1px dashed #D0D5DD",background:C.surfaceSecondary,cursor:"pointer",fontSize:11,color:C.textSecondary,fontFamily:F,display:"flex",alignItems:"center",gap:6,justifyContent:"center" }}>+ Uploader un média</button>
            <button onClick={()=>setShowLibrary(true)} style={{ flex:1,padding:"6px 12px",borderRadius:8,border:"1px dashed #1A365D",background:"#F0F4FA",cursor:"pointer",fontSize:11,color:C.text,fontFamily:F,display:"flex",alignItems:"center",gap:6,justifyContent:"center",fontWeight:500 }}>📁 Choisir depuis la librairie</button>
          </div>
        </div>
      </div>
      {showLibrary&&<LibraryPicker onClose={()=>setShowLibrary(false)} accountHint={post.account||"all"} onSelect={item=>{const items=[...(post.mediaItems||[])];items.push({name:item.name,url:item.url,fileType:item.fileType,fileName:item.name,fileData:null,driveUrl:""});onUpdate("mediaItems",items);}}/>}
      {(()=>{
        const fi=(post.mediaItems||[]).find(m=>(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i)))||(m.fileData&&m.fileData.startsWith("data:image")));
        if(!fi||!post.account)return null;
        const hasUrl=fi.url&&fi.url.startsWith("http"); const hasB64=fi.fileData&&fi.fileData.startsWith("data:image");
        if(!hasUrl&&!hasB64)return null;
        return(
          <div style={{ marginBottom:10 }}>
            {!hasUrl&&hasB64&&<div style={{ padding:"8px 12px",borderRadius:8,background:`${C.orange}15`,border:`1px solid ${C.orange}40`,fontSize:11,color:C.orange,fontFamily:F,marginBottom:6 }}>⚠️ Image locale — pour l'analyse IA, préfère une image depuis la Librairie.</div>}
            <button disabled={analyzingImage||generating} onClick={async()=>{
              setAnalyzingImage(true);
              const result=await analyzeImageAndGenerate(hasUrl?fi.url:null,hasB64?fi.fileData:null,post.account,post.credits||"",voices,hashtagBank,mandatoryHashtags,mentions);
              if(result.error)alert(`Erreur : ${result.error}`);
              else{if(result.subject)onUpdate("subject",result.subject);if(result.caption)onUpdate("caption",result.caption);}
              setAnalyzingImage(false);
            }} style={{ width:"100%",padding:"10px 16px",borderRadius:10,border:"none",background:analyzingImage?C.surfaceSecondary:`linear-gradient(135deg,${C.indigo},${C.blue})`,color:analyzingImage?C.textSecondary:"#fff",cursor:analyzingImage?"default":"pointer",fontSize:13,fontFamily:F,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:analyzingImage?"none":`0 2px 12px ${C.blue}44` }}>
              {analyzingImage?<><span>⏳</span> Analyse en cours...</>:<><span>✨</span> Analyser l'image et générer la caption</>}
            </button>
          </div>
        );
      })()}
      {post.caption&&(
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
            <label style={labelStyle}>Caption</label>
            <button onClick={onGenerate} disabled={generating||!post.subject||!post.account} style={{ fontSize:10,padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surfaceSecondary,cursor:"pointer",color:"#666",fontFamily:F }}>Regénérer</button>
          </div>
          <textarea value={post.caption} onChange={e=>onUpdate("caption",e.target.value)} rows={12} style={{ ...inputStyle,lineHeight:1.6,minHeight:200,resize:"vertical" }}/>
        </div>
      )}
      {post.caption&&<button onClick={()=>{navigator.clipboard.writeText(post.caption);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ padding:"6px 14px",borderRadius:8,border:`1px solid ${C.blue}`,background:copied?C.green:C.blue,color:"#fff",cursor:"pointer",fontSize:11,fontFamily:F,letterSpacing:0.5,fontWeight:500,transition:"background .2s" }}>{copied?"Copié !":"Copier la caption"}</button>}
    </div>
  );
}

function DayView({ year, month, day, dateKey, dayName, posts, setPosts }) {
  const { accounts, voices, hashtagBank, mandatoryHashtags, mentions } = useContext(AccountsContext);
  const [generatingKey,setGeneratingKey]=useState(null);
  const handleGen=async(index)=>{
    const post=posts[dateKey]?.[index]; if(!post?.subject||!post?.account)return;
    setGeneratingKey(index);
    const caption=await generateCaption(post.subject,post.account,post.credits||"",voices,hashtagBank,mandatoryHashtags,mentions);
    setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp[index]={...dp[index],caption};u[dateKey]=dp;return u;});
    setGeneratingKey(null);
  };
  const addPost=()=>setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp.push({account:"",type:"",subject:"",caption:"",credits:"",mediaItems:[],status:"Brouillon"});u[dateKey]=dp;return u;});
  const updatePost=(index,field,value)=>setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp[index]={...dp[index],[field]:value};u[dateKey]=dp;return u;});
  const deletePost=(index)=>setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp.splice(index,1);if(dp.length===0)delete u[dateKey];else u[dateKey]=dp;return u;});
  const dupPost=(index,targetDate,targetAccount)=>{const post=posts[dateKey]?.[index];if(!post)return;setPosts(prev=>{const u={...prev};const dp=[...(u[targetDate]||[])];dp.push({...post,account:targetAccount,status:"Brouillon"});u[targetDate]=dp;return u;});};
  const dayPosts=posts[dateKey]||[];
  return(
    <div style={{ background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:20,marginTop:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h3 style={{ fontFamily:F,fontSize:17,fontWeight:700,color:C.text,margin:0,letterSpacing:-0.2 }}>{dayName} {day} {MONTHS_FR[month]} {year}</h3>
        <button onClick={addPost} style={{ padding:"7px 16px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600,boxShadow:`0 2px 8px ${C.blue}44` }}>+ Ajouter</button>
      </div>
      {dayPosts.length===0&&<div style={{ padding:30,textAlign:"center",color:C.textTertiary,fontSize:14,fontFamily:F }}>Aucun post prévu — cliquez sur "+ Ajouter"</div>}
      {dayPosts.map((post,idx)=>(
        <PostEditor key={idx} post={post} dateKey={dateKey} index={idx} generating={generatingKey===idx}
          onUpdate={(field,val)=>{updatePost(idx,field,val);if(field==="account"&&posts[dateKey]?.[idx]?.subject&&val)setTimeout(()=>handleGen(idx),300);}}
          onDelete={()=>deletePost(idx)} onGenerate={()=>handleGen(idx)}
          onDuplicate={(targetDate,targetAccount)=>dupPost(idx,targetDate,targetAccount)}/>
      ))}
    </div>
  );
}

function FeedPreview({ posts }) {
  const { accounts } = useContext(AccountsContext);
  const [sel,setSel]=useState(accounts[0]?.id||"");
  const acc=accounts.find(a=>a.id===sel);
  const allPosts=Object.entries(posts).flatMap(([dateKey,dp])=>dp.filter(p=>p.account===sel).map(p=>({...p,dateKey}))).sort((a,b)=>b.dateKey.localeCompare(a.dateKey));
  const rows=[]; for(let i=0;i<allPosts.length;i+=3)rows.push(allPosts.slice(i,i+3));
  const [lightbox,setLightbox]=useState(null);
  const getThumb=p=>{const img=(p.mediaItems||[]).find(m=>(m.fileData&&m.fileData.startsWith("data:image"))||(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));return img?.fileData||img?.url||null;};
  const statusColors={Brouillon:"#F5C542","En cours":"#7BC67E",Validé:"#1B5E20",Programmé:"#E67E22",Publié:C.green};
  return(
    <div style={{ marginTop:16 }}>
      <div style={{ ...cardStyle,padding:16,marginBottom:16 }}>
        <div style={{ fontSize:11,fontWeight:600,color:C.text,letterSpacing:1,textTransform:"uppercase",fontFamily:F,marginBottom:12 }}>Preview du feed Instagram</div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {accounts.map(a=><button key={a.id} onClick={()=>setSel(a.id)} style={{ padding:"6px 18px",borderRadius:20,border:`2px solid ${a.color}`,background:sel===a.id?a.color:"#fff",color:sel===a.id?"#fff":a.color,cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:700,transition:"all .15s" }}>{a.id}</button>)}
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ padding:"20px 20px 16px",borderBottom:"1px solid #E8E8E8",display:"flex",alignItems:"center",gap:20 }}>
          <div style={{ width:60,height:60,borderRadius:"50%",background:`linear-gradient(135deg,${acc?.color},${acc?.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"3px solid #E8E8E8" }}>
            <span style={{ fontSize:18,fontWeight:700,color:"#fff",fontFamily:F }}>{sel[0]}</span>
          </div>
          <div>
            <div style={{ fontWeight:700,fontSize:16,color:"#1A1A1A",fontFamily:F }}>{acc?.name}</div>
            <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,marginTop:2 }}>{allPosts.length} post{allPosts.length!==1?"s":""} planifié{allPosts.length!==1?"s":""}</div>
          </div>
        </div>
        {allPosts.length===0?(
          <div style={{ padding:60,textAlign:"center" }}>
            <div style={{ fontSize:32,marginBottom:8 }}>📷</div>
            <div style={{ fontSize:14,color:C.textSecondary,fontFamily:F }}>Aucun post planifié pour {sel}</div>
          </div>
        ):(
          <div>
            {rows.map((row,ri)=>(
              <div key={ri} style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3 }}>
                {row.map((p,ci)=>{
                  const thumb=getThumb(p);
                  return(
                    <div key={ci} onClick={()=>setLightbox(p)} style={{ aspectRatio:"1",position:"relative",cursor:"pointer",background:acc?`${acc.color}18`:"#F5F5F5",overflow:"hidden" }}
                      onMouseEnter={e=>e.currentTarget.querySelector(".overlay").style.opacity="1"}
                      onMouseLeave={e=>e.currentTarget.querySelector(".overlay").style.opacity="0"}>
                      {thumb?<img src={thumb} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:(
                        <div style={{ width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:8 }}>
                          <div style={{ fontSize:22,marginBottom:4 }}>📷</div>
                          <div style={{ fontSize:9,color:acc?.color,fontFamily:F,textAlign:"center",fontWeight:500,lineHeight:1.3 }}>{p.subject||"Sans sujet"}</div>
                        </div>
                      )}
                      {p.type==="Carrousel"&&<div style={{ position:"absolute",top:4,right:4 }}><span style={{ background:"rgba(0,0,0,.55)",borderRadius:3,padding:"1px 4px",fontSize:9,color:"#fff",fontFamily:F }}>❏</span></div>}
                      {p.type==="Reel"&&<div style={{ position:"absolute",top:4,right:4 }}><span style={{ background:"rgba(0,0,0,.55)",borderRadius:3,padding:"1px 4px",fontSize:9,color:"#fff",fontFamily:F }}>▶</span></div>}
                      <div className="overlay" style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",opacity:0,transition:"opacity .2s",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:8 }}>
                        <div style={{ fontSize:11,color:"#fff",fontFamily:F,fontWeight:600,textAlign:"center",lineHeight:1.3,marginBottom:4 }}>{p.subject||"Sans sujet"}</div>
                        <div style={{ fontSize:10,color:"#ddd",fontFamily:F }}>{fmtDateFR(p.dateKey)}</div>
                        <div style={{ marginTop:4,width:8,height:8,borderRadius:"50%",background:statusColors[p.status||"Brouillon"] }}/>
                      </div>
                    </div>
                  );
                })}
                {row.length<3&&Array.from({length:3-row.length}).map((_,i)=><div key={`e-${i}`} style={{ aspectRatio:"1",background:C.surfaceSecondary }}/>)}
              </div>
            ))}
          </div>
        )}
      </div>
      {lightbox&&(()=>{
        const acc=accounts.find(a=>a.id===lightbox.account);
        // Build media list for carousel navigation
        const mediaItems=(lightbox.mediaItems||[]).filter(m=>{
          const src=m.fileData||m.url||"";
          return src && (m.fileType?.startsWith("image/")||m.fileType?.startsWith("video/")||src.match(/\.(jpg|jpeg|png|webp|gif|mp4|mov)/i)||src.startsWith("data:"));
        });
        const hasMultiple=mediaItems.length>1||(lightbox.type==="Carrousel"&&mediaItems.length>0);
        const [slideIdx,setSlideIdx]=useState(0);
        const currentMedia=mediaItems[slideIdx]||null;
        const currentSrc=currentMedia?.fileData||currentMedia?.url||getThumb(lightbox)||null;
        const isVideo=currentMedia?.fileType?.startsWith("video/")||currentSrc?.match(/\.(mp4|mov|webm)/i);

        return(
          <div onClick={()=>setLightbox(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:14,overflow:"hidden",display:"flex",maxWidth:"min(900px,95vw)",width:"100%",maxHeight:"88vh" }}>
              {/* Media side */}
              <div style={{ flex:"0 0 55%",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",position:"relative" }}>
                {currentSrc?(
                  isVideo
                    ?<video src={currentSrc} controls autoPlay style={{ maxWidth:"100%",maxHeight:"88vh",objectFit:"contain" }}/>
                    :<img src={currentSrc} style={{ maxWidth:"100%",maxHeight:"88vh",objectFit:"contain" }}/>
                ):(
                  <div style={{ color:"#666",textAlign:"center",padding:40 }}><div style={{ fontSize:48 }}>📷</div><div style={{ fontSize:13,marginTop:8 }}>Pas d'image</div></div>
                )}
                {/* Carousel nav arrows */}
                {hasMultiple&&mediaItems.length>1&&(<>
                  <button onClick={e=>{e.stopPropagation();setSlideIdx(i=>Math.max(0,i-1));}}
                    style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.85)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",opacity:slideIdx===0?0.3:1 }}>‹</button>
                  <button onClick={e=>{e.stopPropagation();setSlideIdx(i=>Math.min(mediaItems.length-1,i+1));}}
                    style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.85)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",opacity:slideIdx===mediaItems.length-1?0.3:1 }}>›</button>
                  {/* Dots */}
                  <div style={{ position:"absolute",bottom:10,left:0,right:0,display:"flex",justifyContent:"center",gap:5 }}>
                    {mediaItems.map((_,i)=>(
                      <div key={i} onClick={e=>{e.stopPropagation();setSlideIdx(i);}}
                        style={{ width:i===slideIdx?18:7,height:7,borderRadius:4,background:i===slideIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all .2s" }}/>
                    ))}
                  </div>
                  {/* Counter */}
                  <div style={{ position:"absolute",top:10,right:12,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:11,fontFamily:F,padding:"2px 8px",borderRadius:10 }}>
                    {slideIdx+1}/{mediaItems.length}
                  </div>
                </>)}
              </div>
              {/* Info side */}
              <div style={{ flex:1,padding:20,overflowY:"auto",display:"flex",flexDirection:"column" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:acc?.color,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:12,fontWeight:700,color:"#fff",fontFamily:F }}>{lightbox.account}</span></div>
                  <div>
                    <div style={{ fontWeight:600,fontSize:13,fontFamily:F,color:C.text }}>{acc?.name}</div>
                    <div style={{ fontSize:11,color:C.textSecondary,fontFamily:F }}>{fmtDateFR(lightbox.dateKey)}</div>
                  </div>
                  <button onClick={()=>setLightbox(null)} style={{ marginLeft:"auto",background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.textSecondary }}>×</button>
                </div>
                <div style={{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" }}>
                  <span style={{ padding:"2px 8px",borderRadius:6,background:`${C.blue}18`,color:C.blue,fontSize:10,fontFamily:F,fontWeight:600 }}>{lightbox.type}</span>
                  {hasMultiple&&<span style={{ padding:"2px 8px",borderRadius:6,background:`${C.indigo}18`,color:C.indigo,fontSize:10,fontFamily:F,fontWeight:600 }}>{mediaItems.length} médias</span>}
                </div>
                {/* Thumbnails strip for carousel */}
                {hasMultiple&&mediaItems.length>1&&(
                  <div style={{ display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:4 }}>
                    {mediaItems.map((m,i)=>{
                      const src=m.fileData||m.url||"";
                      const isVid=m.fileType?.startsWith("video/")||src.match(/\.(mp4|mov)/i);
                      return(
                        <div key={i} onClick={()=>setSlideIdx(i)}
                          style={{ width:48,height:48,borderRadius:6,overflow:"hidden",flexShrink:0,cursor:"pointer",border:`2px solid ${i===slideIdx?C.blue:C.border}`,transition:"border .15s",position:"relative" }}>
                          {isVid?(
                            <div style={{ width:"100%",height:"100%",background:"#000",display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:16 }}>▶</span></div>
                          ):(
                            <img src={src} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {lightbox.subject&&<div style={{ fontWeight:600,fontSize:13,color:C.text,fontFamily:F,marginBottom:8 }}>{lightbox.subject}</div>}
                {lightbox.caption?<div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,lineHeight:1.6,whiteSpace:"pre-wrap",flex:1 }}>{lightbox.caption}</div>:<div style={{ fontSize:12,color:C.textTertiary,fontFamily:F,fontStyle:"italic" }}>Pas de caption</div>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Archive({ posts }) {
  const { accounts } = useContext(AccountsContext);
  const monthKeys=new Set(); Object.keys(posts).forEach(k=>monthKeys.add(k.substring(0,7)));
  const sortedMonths=[...monthKeys].sort().reverse();
  const [expanded,setExpanded]=useState(null);
  if(sortedMonths.length===0)return(<div style={{ ...cardStyle,padding:30,marginTop:16,textAlign:"center" }}><div style={{ color:C.textTertiary,fontSize:13,fontFamily:F }}>Aucun historique pour le moment</div></div>);
  return(
    <div style={{ ...cardStyle,padding:20,marginTop:16 }}>
      <div style={{ fontSize:11,fontWeight:600,color:C.text,letterSpacing:1,textTransform:"uppercase",fontFamily:F,marginBottom:14 }}>Historique</div>
      {sortedMonths.map(mk=>{
        const [y,m]=mk.split("-").map(Number);
        const entries=Object.entries(posts).filter(([k])=>k.startsWith(mk)).sort(([a],[b])=>a.localeCompare(b));
        const total=entries.reduce((s,[,v])=>s+v.length,0);
        const byAcc={}; accounts.forEach(a=>{byAcc[a.id]=0;}); entries.forEach(([,v])=>v.forEach(p=>{if(p.account&&byAcc[p.account]!==undefined)byAcc[p.account]++;}));
        const byType={Photo:0,Carrousel:0,Reel:0}; entries.forEach(([,v])=>v.forEach(p=>{if(p.type)byType[p.type]=(byType[p.type]||0)+1;}));
        const isExp=expanded===mk;
        return(
          <div key={mk} style={{ marginBottom:8 }}>
            <button onClick={()=>setExpanded(isExp?null:mk)} style={{ width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderRadius:10,border:"1px solid #E8E8E8",background:isExp?C.surfaceSecondary:"#fff",cursor:"pointer",fontFamily:F }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <span style={{ fontSize:14,fontWeight:500,color:C.text }}>{MONTHS_FR[m-1]} {y}</span>
                <span style={{ fontSize:12,color:C.textSecondary }}>{total} posts</span>
              </div>
              <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                {accounts.map(a=>byAcc[a.id]>0?<Badge key={a.id} text={`${a.id}: ${byAcc[a.id]}`} bg={a.color} fg="#fff"/>:null)}
                <span style={{ fontSize:14,color:C.textSecondary,marginLeft:8 }}>{isExp?"−":"+"}</span>
              </div>
            </button>
            {isExp&&(
              <div style={{ padding:12,borderLeft:"2px solid #E8E8E8",marginLeft:14,marginTop:4 }}>
                <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                  <Badge text={`${byType.Photo} Photos`} fg="#B8860B" border="#B8860B"/>
                  <Badge text={`${byType.Carrousel} Carrousels`} fg="#2E7D6F" border="#2E7D6F"/>
                  <Badge text={`${byType.Reel} Reels`} fg="#8B3A62" border="#8B3A62"/>
                </div>
                {entries.map(([dateKey,dp])=>dp.map((p,idx)=>(
                  <div key={`${dateKey}-${idx}`} style={{ display:"flex",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px solid #F5F5F5",fontSize:12,fontFamily:F }}>
                    <span style={{ color:C.textSecondary,minWidth:60 }}>{fmtDateFR(dateKey)}</span>
                    <Badge text={p.account} bg={accounts.find(a=>a.id===p.account)?.color} fg="#fff"/>
                    <Badge text={p.type} fg={p.type==="Photo"?"#B8860B":p.type==="Reel"?"#8B3A62":"#2E7D6F"} border={p.type==="Photo"?"#B8860B":p.type==="Reel"?"#8B3A62":"#2E7D6F"}/>
                    <span style={{ color:"#333",flex:1 }}>{p.subject||"—"}</span>
                    <span style={{ color:C.textSecondary,fontSize:10 }}>{p.status||"Brouillon"}</span>
                  </div>
                )))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LibraryPicker({ onSelect, onClose, accountHint }) {
  const { library } = useContext(LibraryContext);
  const { accounts } = useContext(AccountsContext);
  const [search,setSearch]=useState("");
  const [filterAcc,setFilterAcc]=useState(accountHint||"all");
  const filtered=library.filter(x=>filterAcc==="all"?true:(x.account===filterAcc||!x.account)).filter(x=>(x.name||"").toLowerCase().includes(search.toLowerCase()));
  return(
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surface,borderRadius:16,padding:20,width:"min(640px,95vw)",maxHeight:"82vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <span style={{ fontSize:15,fontWeight:700,color:C.text,fontFamily:F }}>Choisir depuis la librairie</span>
          <button onClick={onClose} style={{ background:C.surfaceSecondary,border:"none",width:28,height:28,borderRadius:"50%",cursor:"pointer",color:C.textSecondary,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
        </div>
        <div style={{ display:"flex",gap:5,marginBottom:12,flexWrap:"wrap" }}>
          <button onClick={()=>setFilterAcc("all")} style={{ ...pillBtn(filterAcc==="all"),fontSize:11,padding:"4px 12px" }}>Tous</button>
          {accounts.map(a=><button key={a.id} onClick={()=>setFilterAcc(a.id)} style={{ ...pillBtn(filterAcc===a.id,a.color),fontSize:11,padding:"4px 12px" }}>{a.id}</button>)}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle,marginBottom:12 }}/>
        <div style={{ overflowY:"auto",flex:1 }}>
          {filtered.length===0&&<div style={{ textAlign:"center",color:C.textTertiary,padding:30,fontSize:13,fontFamily:F }}>Aucun fichier trouvé</div>}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8 }}>
            {filtered.map(item=>{
              const acc=accounts.find(a=>a.id===item.account);
              return(
                <div key={item.id} onClick={()=>{onSelect(item);onClose();}} style={{ borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`,cursor:"pointer",background:C.surfaceSecondary,transition:"border-color .15s,transform .12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.transform="scale(1.02)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="scale(1)";}}>
                  {item.fileType?.startsWith("image/")?<img src={item.url} alt={item.name} style={{ width:"100%",aspectRatio:"1",objectFit:"cover",display:"block" }}/>:<div style={{ width:"100%",aspectRatio:"1",background:`${C.blue}10`,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:24 }}>🎬</span></div>}
                  <div style={{ padding:"4px 6px",background:C.surface }}>
                    <div style={{ fontSize:9,color:C.textTertiary,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.name}</div>
                    {acc&&<div style={{ fontSize:9,fontWeight:700,color:acc.color,fontFamily:F }}>{acc.id}</div>}
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

function Library({ library, setLibrary, posts, setPosts, year, month, accountSettings, subfolders, setSubfolders }) {
  const { accounts, voices, hashtagBank, mandatoryHashtags, mentions } = useContext(AccountsContext);
  const [uploading,setUploading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [search,setSearch]=useState("");
  const [lightbox,setLightbox]=useState(null);
  const [selAcc,setSelAcc]=useState("all");
  const [selSub,setSelSub]=useState("all");
  const [upAcc,setUpAcc]=useState(accounts[0]?.id||"");
  const [upSub,setUpSub]=useState("all");
  const [newSfName,setNewSfName]=useState("");
  const [showNewSf,setShowNewSf]=useState(false);
  const [batchMode,setBatchMode]=useState(false);
  const [batchAcc,setBatchAcc]=useState(accounts[0]?.id||"");
  const [batchGroups,setBatchGroups]=useState([]);
  const [batchSel,setBatchSel]=useState([]);
  const [generating,setGenerating]=useState(false);
  const [genProg,setGenProg]=useState({current:0,total:0,label:""});

  // Bulk selection state
  const [bulkMode,setBulkMode]=useState(false);
  const [bulkSel,setBulkSel]=useState([]);
  const [bulkAcc,setBulkAcc]=useState("all");
  const [bulkSub,setBulkSub]=useState("all");
  const [showBulkPanel,setShowBulkPanel]=useState(false);
  const fileInputRef=useRef(null);

  const handleUpload=async(files)=>{
    if(!files||files.length===0)return;
    if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_UPLOAD_PRESET){alert("Cloudinary non configuré");return;}
    setUploading(true);setProgress(0);
    const total=files.length; const added=[];
    const account=upAcc==="all"?null:upAcc;
    const subfolder=upSub==="all"?null:upSub;
    const folder=account?(subfolder?`oh_library/${account}/${subfolder}`:`oh_library/${account}`):"oh_library";
    for(let i=0;i<files.length;i++){
      const file=files[i]; const fd=new FormData();
      fd.append("file",file);fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);fd.append("folder",folder);
      const xhr=new XMLHttpRequest();
      await new Promise((res,rej)=>{
        xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.round(((i+e.loaded/e.total)/total)*100));};
        xhr.onload=async()=>{if(xhr.status===200){const r=JSON.parse(xhr.responseText);const entry={url:r.secure_url,publicId:r.public_id,name:file.name,fileType:file.type,account:account||null,subfolder:subfolder||null,uploadedAt:new Date().toISOString()};if(db){const ref=await addDoc(collection(db,"library"),entry);added.push({id:ref.id,...entry});}else added.push({id:Date.now()+i,...entry});res();}else rej();};
        xhr.onerror=rej;xhr.open("POST",`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);xhr.send(fd);
      });
    }
    setLibrary(prev=>[...added,...prev]);setUploading(false);setProgress(0);
  };

  const addSf=()=>{const n=newSfName.trim();if(!n||upAcc==="all")return;const cur=subfolders[upAcc]||[];if(cur.includes(n))return;setSubfolders(p=>({...p,[upAcc]:[...cur,n]}));setNewSfName("");setShowNewSf(false);};
  const rmSf=(acc,f)=>setSubfolders(p=>({...p,[acc]:(p[acc]||[]).filter(x=>x!==f)}));
  const handleDelete=async(item)=>{if(!window.confirm("Supprimer de la librairie ?"))return;if(db){try{await deleteDoc(doc(db,"library",item.id));}catch{}}setLibrary(p=>p.filter(x=>x.id!==item.id));};

  const toggleBulk=(item)=>setBulkSel(p=>p.find(x=>x.id===item.id)?p.filter(x=>x.id!==item.id):[...p,item]);
  const applyBulk=async()=>{
    if(bulkSel.length===0)return;
    const newAcc=bulkAcc==="all"?null:bulkAcc;
    const newSub=bulkSub==="all"?null:bulkSub;
    // Update Firestore for each selected item
    const updated=[];
    for(const item of bulkSel){
      const entry={...item,account:newAcc,subfolder:newSub};
      if(db){try{await setDoc(doc(db,"library",item.id),entry);}catch(e){console.error(e);}}
      updated.push(entry);
    }
    setLibrary(prev=>prev.map(x=>{const u=updated.find(u=>u.id===x.id);return u||x;}));
    setBulkSel([]);setBulkMode(false);setShowBulkPanel(false);
  };
  const filtered=library.filter(x=>selAcc==="all"?true:x.account===selAcc).filter(x=>selSub==="all"?true:x.subfolder===selSub).filter(x=>(x.name||"").toLowerCase().includes(search.toLowerCase()));
  const countFor=id=>id==="all"?library.length:library.filter(x=>x.account===id).length;
  const curSubs=selAcc!=="all"?(subfolders[selAcc]||[]):[];

  const toggleBatchSel=item=>setBatchSel(p=>p.find(x=>x.id===item.id)?p.filter(x=>x.id!==item.id):[...p,item]);
  const addGroup=()=>{if(batchSel.length===0)return;setBatchGroups(p=>[...p,{images:[...batchSel],type:batchSel.length===1?"Photo":"Carrousel",id:Date.now()}]);setBatchSel([]);};
  const rmGroup=id=>setBatchGroups(p=>p.filter(g=>g.id!==id));
  const setGrpType=(id,t)=>setBatchGroups(p=>p.map(g=>g.id===id?{...g,type:t}:g));

  const getSlots=n=>{
    const dim=new Date(year,month+1,0).getDate();
    const tom=new Date();tom.setDate(tom.getDate()+1);tom.setHours(0,0,0,0);
    const dates=[];
    for(let d=1;d<=dim;d++){const dt=new Date(year,month,d);if(dt.getMonth()!==month||dt<tom)continue;dates.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);}
    const ppw=Math.max(1,parseInt(accountSettings?.[batchAcc]?.postsPerWeek)||3);
    const occ=new Set(Object.entries(posts).filter(([k])=>k.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).flatMap(([k,v])=>v.filter(p=>p.account===batchAcc).map(()=>k)));
    const minGap=Math.max(1,Math.floor(7/ppw));
    const slots=[];let last=null;
    for(const dk of dates){if(slots.length>=n)break;if(occ.has(dk))continue;if(last!==null&&Math.round((new Date(dk)-new Date(last))/86400000)<minGap)continue;slots.push(dk);last=dk;}
    if(slots.length<n){for(const dk of dates){if(slots.length>=n)break;if(slots.includes(dk)||occ.has(dk))continue;slots.push(dk);}}
    return slots;
  };

  const runBatch=async()=>{
    if(batchGroups.length===0)return;
    const slots=getSlots(batchGroups.length);
    if(slots.length===0){alert("Aucun jour disponible ce mois-ci.");return;}
    if(slots.length<batchGroups.length&&!window.confirm(`Seulement ${slots.length} jour(s) disponible(s). Continuer ?`))return;
    setGenerating(true);setGenProg({current:0,total:slots.length,label:"Préparation..."});
    const np={...posts};
    for(let i=0;i<slots.length;i++){
      const grp=batchGroups[i];const dk=slots[i];
      setGenProg({current:i+1,total:slots.length,label:`Post ${i+1}/${slots.length}…`});
      let subject="",caption="";
      try{const r=await analyzeImageAndGenerate(grp.images[0].url||null,null,batchAcc,"",voices,hashtagBank,mandatoryHashtags,mentions);subject=r.subject||"";caption=r.caption||"";}catch{}
      const mediaItems=grp.images.map(img=>({name:img.name,url:img.url,fileType:img.fileType,fileName:img.name,fileData:null,driveUrl:""}));
      const ex=np[dk]||[];ex.push({account:batchAcc,type:grp.type,subject,caption,credits:"",mediaItems,status:"Brouillon"});np[dk]=ex;
    }
    setPosts(np);setGenerating(false);setGenProg({current:0,total:0,label:""});setBatchGroups([]);setBatchSel([]);setBatchMode(false);
    alert(`✅ ${slots.length} post(s) généré(s) !`);
  };

  if(batchMode)return(
    <div style={{ ...cardStyle,padding:20,marginTop:16 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <div><div style={{ fontSize:17,fontWeight:700,color:C.text,fontFamily:F }}>Génération batch</div><div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,marginTop:2 }}>Sélectionne les images, groupe-les, puis génère</div></div>
        <button onClick={()=>{setBatchMode(false);setBatchGroups([]);setBatchSel([]);}} style={{ padding:"7px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceSecondary,color:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F }}>Annuler</button>
      </div>
      <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:20,flexWrap:"wrap",padding:14,borderRadius:12,background:C.surfaceSecondary,border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>Compte :</div>
        <div style={{ display:"flex",gap:6 }}>{accounts.map(a=><button key={a.id} onClick={()=>setBatchAcc(a.id)} style={{ ...pillBtn(batchAcc===a.id,a.color),fontSize:12,padding:"5px 14px" }}>{a.id}</button>)}</div>
        <div style={{ marginLeft:"auto",fontSize:12,color:C.textSecondary,fontFamily:F }}>📅 {MONTHS_FR[month]} {year}</div>
      </div>
      <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 300px" }}>
          <div style={{ fontSize:12,fontWeight:600,color:C.textSecondary,fontFamily:F,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5 }}>1. Sélectionne les images</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle,marginBottom:10,fontSize:12 }}/>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:6,maxHeight:400,overflowY:"auto",padding:2 }}>
            {library.filter(x=>!x.account||x.account===batchAcc).filter(x=>(x.name||"").toLowerCase().includes(search.toLowerCase())).map(item=>{
              const isSel=batchSel.find(x=>x.id===item.id);const inGrp=batchGroups.some(g=>g.images.find(x=>x.id===item.id));
              return(
                <div key={item.id} onClick={()=>!inGrp&&toggleBatchSel(item)} style={{ borderRadius:8,overflow:"hidden",border:`2px solid ${isSel?C.blue:inGrp?C.green:C.border}`,position:"relative",cursor:inGrp?"default":"pointer",opacity:inGrp?.5:1,transition:"border-color .15s" }}>
                  {item.fileType?.startsWith("image/")?<img src={item.url} style={{ width:"100%",aspectRatio:"1",objectFit:"cover" }}/>:<div style={{ width:"100%",aspectRatio:"1",background:`${C.blue}10`,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:20 }}>🎬</span></div>}
                  {(isSel||inGrp)&&<div style={{ position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:isSel?C.blue:C.green,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontSize:11,fontWeight:700 }}>✓</span></div>}
                </div>
              );
            })}
          </div>
          {batchSel.length>0&&<button onClick={addGroup} style={{ width:"100%",marginTop:10,padding:"10px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>＋ Créer un groupe avec {batchSel.length} image{batchSel.length>1?"s":""}{batchSel.length>1?" → Carrousel":" → Photo"}</button>}
        </div>
        <div style={{ flex:"1 1 280px" }}>
          <div style={{ fontSize:12,fontWeight:600,color:C.textSecondary,fontFamily:F,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5 }}>2. Groupes ({batchGroups.length} post{batchGroups.length!==1?"s":""})</div>
          {batchGroups.length===0&&<div style={{ padding:30,textAlign:"center",color:C.textTertiary,fontSize:13,fontFamily:F,border:`2px dashed ${C.border}`,borderRadius:12 }}>Sélectionne des images à gauche</div>}
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {batchGroups.map((grp,gi)=>(
              <div key={grp.id} style={{ borderRadius:12,border:`1px solid ${C.border}`,background:C.surface,overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.surfaceSecondary,borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:12,fontWeight:600,color:C.text,fontFamily:F }}>Post {gi+1}</span>
                  <div style={{ display:"flex",gap:4,marginLeft:"auto" }}>
                    {["Photo","Carrousel","Reel"].map(t=><button key={t} onClick={()=>setGrpType(grp.id,t)} style={{ padding:"2px 8px",borderRadius:6,border:`1px solid ${grp.type===t?C.blue:C.border}`,background:grp.type===t?C.blue:"transparent",color:grp.type===t?"#fff":C.textSecondary,cursor:"pointer",fontSize:10,fontFamily:F,fontWeight:600 }}>{t}</button>)}
                    <button onClick={()=>rmGroup(grp.id)} style={{ padding:"2px 6px",borderRadius:6,border:"none",background:"none",color:C.textTertiary,cursor:"pointer",fontSize:14 }}>×</button>
                  </div>
                </div>
                <div style={{ display:"flex",gap:4,padding:8,flexWrap:"wrap" }}>{grp.images.map(img=><img key={img.id} src={img.url} style={{ width:48,height:48,borderRadius:6,objectFit:"cover" }}/>)}</div>
              </div>
            ))}
          </div>
          {batchGroups.length>0&&(
            <button onClick={runBatch} disabled={generating} style={{ width:"100%",marginTop:12,padding:"12px",borderRadius:10,border:"none",background:generating?C.surfaceSecondary:`linear-gradient(135deg,${C.indigo},${C.blue})`,color:generating?C.textSecondary:"#fff",cursor:generating?"default":"pointer",fontSize:14,fontFamily:F,fontWeight:700,boxShadow:generating?"none":`0 3px 14px ${C.blue}44` }}>
              {generating?`✨ ${genProg.label}`:`✨ Générer ${batchGroups.length} post${batchGroups.length>1?"s":""} avec l'IA`}
            </button>
          )}
          {generating&&genProg.total>0&&(
            <div style={{ marginTop:10 }}>
              <div style={{ height:5,borderRadius:3,background:C.border,overflow:"hidden" }}><div style={{ height:"100%",width:`${(genProg.current/genProg.total)*100}%`,background:C.blue,borderRadius:3,transition:"width .4s" }}/></div>
              <div style={{ fontSize:11,color:C.textSecondary,fontFamily:F,marginTop:4,textAlign:"center" }}>{genProg.current}/{genProg.total} posts générés</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return(
    <div style={{ ...cardStyle,padding:20,marginTop:16 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div style={{ fontSize:12,fontWeight:600,color:C.textSecondary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F }}>Librairie — {filtered.length} fichier{filtered.length!==1?"s":""}</div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>{setBulkMode(b=>!b);setBulkSel([]);}} style={{ padding:"8px 16px",borderRadius:10,border:`1px solid ${bulkMode?C.orange:C.border}`,background:bulkMode?`${C.orange}15`:"transparent",color:bulkMode?C.orange:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>
            {bulkMode?`✓ ${bulkSel.length} sélectionné${bulkSel.length>1?"s":""}` :"☑ Sélection multiple"}
          </button>
          <button onClick={()=>setBatchMode(true)} style={{ padding:"8px 16px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.indigo},${C.blue})`,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600,boxShadow:`0 2px 10px ${C.blue}44` }}>✨ Batch</button>
        </div>
      </div>

      {/* Bulk action panel */}
      {bulkMode&&bulkSel.length>0&&(
        <div style={{ padding:14,borderRadius:12,background:`${C.orange}10`,border:`1px solid ${C.orange}44`,marginBottom:14 }}>
          <div style={{ fontSize:12,fontWeight:600,color:C.orange,fontFamily:F,marginBottom:10 }}>{bulkSel.length} image{bulkSel.length>1?"s":""} sélectionnée{bulkSel.length>1?"s":""} — Modifier les tags</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:10,color:C.textTertiary,fontFamily:F,marginBottom:4 }}>Établissement</div>
              <select value={bulkAcc} onChange={e=>setBulkAcc(e.target.value)} style={{ ...selectStyle,fontSize:12 }}>
                <option value="all">— Aucun —</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.id} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10,color:C.textTertiary,fontFamily:F,marginBottom:4 }}>Sous-dossier</div>
              <select value={bulkSub} onChange={e=>setBulkSub(e.target.value)} style={{ ...selectStyle,fontSize:12 }}>
                <option value="all">— Racine —</option>
                {(bulkAcc!=="all"?subfolders[bulkAcc]||[]:accounts.flatMap(a=>subfolders[a.id]||[])).filter((v,i,a)=>a.indexOf(v)===i).map(sf=><option key={sf} value={sf}>{sf}</option>)}
              </select>
            </div>
            <button onClick={applyBulk} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:C.orange,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>
              Appliquer
            </button>
            <button onClick={()=>{setBulkSel([]);setBulkMode(false);}} style={{ padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F }}>
              Annuler
            </button>
          </div>
        </div>
      )}
      <div style={{ display:"flex",gap:6,marginBottom:10,flexWrap:"wrap" }}>
        <button onClick={()=>{setSelAcc("all");setSelSub("all");}} style={{ ...pillBtn(selAcc==="all"),fontSize:12 }}>Tous ({countFor("all")})</button>
        {accounts.map(a=><button key={a.id} onClick={()=>{setSelAcc(a.id);setSelSub("all");}} style={{ ...pillBtn(selAcc===a.id,a.color),fontSize:12 }}>{a.id} ({countFor(a.id)})</button>)}
      </div>
      {selAcc!=="all"&&curSubs.length>0&&(
        <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",paddingLeft:8,borderLeft:`3px solid ${accounts.find(a=>a.id===selAcc)?.color||C.border}` }}>
          <button onClick={()=>setSelSub("all")} style={{ padding:"3px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:selSub==="all"?C.text:"transparent",color:selSub==="all"?"#fff":C.textSecondary,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:500 }}>Tous</button>
          {curSubs.map(sf=><button key={sf} onClick={()=>setSelSub(sf)} style={{ padding:"3px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:selSub===sf?C.text:"transparent",color:selSub===sf?"#fff":C.textSecondary,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:500 }}>{sf}</button>)}
        </div>
      )}
      <div style={{ padding:14,borderRadius:12,background:C.surfaceSecondary,border:`1px solid ${C.border}`,marginBottom:14 }}>
        <div style={{ fontSize:11,fontWeight:600,color:C.textSecondary,fontFamily:F,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Uploader des images</div>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>Compte :</span>
            <select value={upAcc} onChange={e=>{setUpAcc(e.target.value);setUpSub("all");}} style={{ ...selectStyle,fontSize:12 }}>{accounts.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}</select>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>Dossier :</span>
            <select value={upSub} onChange={e=>setUpSub(e.target.value)} style={{ ...selectStyle,fontSize:12 }}>
              <option value="all">— Racine —</option>
              {(subfolders[upAcc]||[]).map(sf=><option key={sf} value={sf}>{sf}</option>)}
            </select>
          </div>
        </div>
        {showNewSf?(
          <div style={{ display:"flex",gap:8,marginBottom:10 }}>
            <input value={newSfName} onChange={e=>setNewSfName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSf()} placeholder="Nom du sous-dossier" style={{ ...inputStyle,flex:1,fontSize:12 }} autoFocus/>
            <button onClick={addSf} style={{ padding:"7px 14px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600 }}>Créer</button>
            <button onClick={()=>{setShowNewSf(false);setNewSfName("");}} style={{ padding:"7px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:12,fontFamily:F }}>Annuler</button>
          </div>
        ):<button onClick={()=>setShowNewSf(true)} style={{ fontSize:11,color:C.blue,background:"none",border:"none",cursor:"pointer",fontFamily:F,fontWeight:500,marginBottom:10,padding:0 }}>+ Créer un sous-dossier pour {upAcc}</button>}
        {(subfolders[upAcc]||[]).length>0&&<div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>{(subfolders[upAcc]||[]).map(sf=><div key={sf} style={{ display:"flex",alignItems:"center",gap:4,padding:"2px 8px 2px 10px",borderRadius:20,background:C.surface,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.textSecondary }}>{sf}<span onClick={()=>rmSf(upAcc,sf)} style={{ cursor:"pointer",fontSize:13,color:C.textTertiary,lineHeight:1 }} onMouseEnter={e=>e.target.style.color=C.red} onMouseLeave={e=>e.target.style.color=C.textTertiary}>×</span></div>)}</div>}
      </div>
      <div onClick={()=>!uploading&&fileInputRef.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.blue;}} onDragLeave={e=>{e.currentTarget.style.borderColor=C.border;}} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.border;handleUpload(Array.from(e.dataTransfer.files));}}
        style={{ border:`2px dashed ${C.border}`,borderRadius:12,padding:"20px",textAlign:"center",cursor:uploading?"default":"pointer",background:C.surfaceSecondary,marginBottom:16,transition:"all .2s" }}>
        {uploading?(
          <div>
            <div style={{ fontSize:13,color:C.text,fontFamily:F,marginBottom:8 }}>Upload en cours... {progress}%</div>
            <div style={{ height:5,borderRadius:3,background:C.border,overflow:"hidden",maxWidth:300,margin:"0 auto" }}><div style={{ height:"100%",width:`${progress}%`,background:C.blue,borderRadius:3,transition:"width .3s" }}/></div>
          </div>
        ):(
          <><div style={{ fontSize:22,marginBottom:4 }}>📁</div><div style={{ fontSize:13,color:C.text,fontFamily:F,fontWeight:500 }}>Cliquer ou glisser-déposer → <strong>{upAcc}</strong>{upSub!=="all"?` / ${upSub}`:""}</div><div style={{ fontSize:11,color:C.textSecondary,fontFamily:F,marginTop:2 }}>JPG, PNG, WEBP, GIF, MP4</div></>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={e=>{handleUpload(Array.from(e.target.files));e.target.value="";}}/>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher par nom..." style={{ ...inputStyle,marginBottom:16 }}/>
      {filtered.length===0&&<div style={{ textAlign:"center",color:C.textTertiary,padding:40,fontSize:13,fontFamily:F }}>Aucune image{selAcc!=="all"?` pour ${selAcc}`:""}</div>}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10 }}>
        {filtered.map(item=>{
          const acc=accounts.find(a=>a.id===item.account);
          const isBulkSel=bulkSel.find(x=>x.id===item.id);
          return(
            <div key={item.id} onClick={()=>bulkMode&&toggleBulk(item)}
              style={{ borderRadius:10,overflow:"hidden",border:`2px solid ${isBulkSel?C.orange:C.border}`,background:isBulkSel?`${C.orange}08`:C.surfaceSecondary,position:"relative",cursor:bulkMode?"pointer":"default",transition:"border-color .15s" }}>
              {isBulkSel&&<div style={{ position:"absolute",top:6,left:6,width:22,height:22,borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2 }}><span style={{ color:"#fff",fontSize:12,fontWeight:700 }}>✓</span></div>}
              {item.fileType?.startsWith("image/")?
                <img src={item.url} alt={item.name} onClick={()=>!bulkMode&&setLightbox(item)} style={{ width:"100%",aspectRatio:"1",objectFit:"cover",cursor:bulkMode?"pointer":"pointer",display:"block" }}/>:
                <div style={{ width:"100%",aspectRatio:"1",background:`${C.blue}10`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }} onClick={()=>!bulkMode&&setLightbox(item)}><span style={{ fontSize:28 }}>🎬</span></div>}
              <div style={{ padding:"5px 6px",background:C.surface,borderTop:`1px solid ${C.border}` }}>
                <div style={{ fontSize:9,color:C.textTertiary,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.name}</div>
                <div style={{ display:"flex",gap:4,marginTop:2,flexWrap:"wrap" }}>
                  {acc&&<div style={{ fontSize:9,fontWeight:700,color:acc.color,fontFamily:F }}>{acc.id}</div>}
                  {item.subfolder&&<div style={{ fontSize:9,color:C.textTertiary,fontFamily:F }}>/ {item.subfolder}</div>}
                </div>
              </div>
              {!bulkMode&&<button onClick={()=>handleDelete(item)} style={{ position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",border:"none",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>}
            </div>
          );
        })}
      </div>
      {lightbox&&(
        <div onClick={()=>setLightbox(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"relative",maxWidth:"90vw" }}>
            <img src={lightbox.url} style={{ maxWidth:"85vw",maxHeight:"80vh",objectFit:"contain",borderRadius:10,display:"block" }}/>
            <div style={{ marginTop:8,textAlign:"center",color:"#fff",fontSize:12,fontFamily:F }}>{lightbox.name}</div>
            <button onClick={()=>setLightbox(null)} style={{ position:"absolute",top:-14,right:-14,width:28,height:28,borderRadius:"50%",border:"none",background:"#fff",color:C.text,cursor:"pointer",fontSize:15,fontWeight:700 }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Publication ───────────────────────────────────────────────────────────────
function Publication({ posts, setPosts, config }) {
  const accounts = config?.accounts || [];
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [copiedKey, setCopiedKey] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const STATUSES = ["Brouillon","En cours","Validé","Programmé","Publié"];
  const STATUS_COLORS = { "Brouillon":"#FF9500","En cours":C.blue,"Validé":C.green,"Programmé":C.indigo,"Publié":C.green };

  // Flatten all posts sorted by date asc
  const allPosts = Object.entries(posts)
    .sort(([a],[b])=>a.localeCompare(b))
    .flatMap(([dateKey,dayPosts])=>
      dayPosts.map((p,idx)=>{
        const acc = accounts.find(a=>a.id===p.account);
        const dow = new Date(dateKey).getDay();
        const isWe = dow===0||dow===6;
        const bt = config?.bestTimes?.[p.account];
        const time = bt ? (isWe ? bt.weekend : bt.weekday) : "";
        const firstImg = (p.mediaItems||[]).find(m=>(m.fileData&&m.fileData.startsWith("data:image"))||(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));
        const thumbSrc = firstImg?.fileData||firstImg?.url||null;
        const imageUrl = firstImg?.url||null;
        return { ...p, dateKey, idx, acc, time, thumbSrc, imageUrl, key:`${dateKey}-${p.account}-${idx}` };
      })
    );

  const filtered = allPosts
    .filter(p=> filterAcc==="all" ? true : p.account===filterAcc)
    .filter(p=> filterStatus==="all" ? true : p.status===filterStatus);

  const copyCaption = (key, caption) => {
    navigator.clipboard.writeText(caption||"");
    setCopiedKey(key);
    setTimeout(()=>setCopiedKey(null), 2000);
  };

  const updateStatus = (dateKey, idx, status) => {
    setPosts(prev=>{
      const u={...prev};
      const dp=[...(u[dateKey]||[])];
      dp[idx]={...dp[idx],status};
      u[dateKey]=dp;
      return u;
    });
  };

  const downloadImage = (url, filename) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const downloadAll = async () => {
    if (zipping) return;
    const toDownload = filtered.filter(p=>p.imageUrl);
    if (toDownload.length === 0) { alert("Aucune image avec URL disponible dans cette sélection."); return; }
    setZipping(true);
    try {
      // Download images one by one with a small delay
      for (const p of toDownload) {
        const [y,m,d] = p.dateKey.split("-");
        const filename = `${p.dateKey}_${p.account}_${p.type||"post"}.jpg`;
        downloadImage(p.imageUrl, filename);
        await new Promise(r=>setTimeout(r,400));
      }
    } catch(e) { console.error(e); }
    setZipping(false);
  };

  const copyAllCaptions = () => {
    const text = filtered.filter(p=>p.caption).map(p=>{
      const [y,m,d]=p.dateKey.split("-");
      return `── ${parseInt(d)} ${MONTHS_FR[Number(m)-1]} ${y} | ${p.account} | ${p.type||""} | ${p.time||""} ──\n${p.caption}\n`;
    }).join("\n");
    navigator.clipboard.writeText(text);
    alert("Toutes les captions copiées !");
  };

  const countFor = id => id==="all" ? allPosts.length : allPosts.filter(p=>p.account===id).length;

  return (
    <div style={{ marginTop:16 }}>
      {/* Header */}
      <div style={{ ...cardStyle, padding:20, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontSize:17,fontWeight:700,color:C.text,fontFamily:F }}>📤 Publication</div>
            <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,marginTop:2 }}>{filtered.length} post{filtered.length!==1?"s":""} affichés</div>
          </div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            <button onClick={copyAllCaptions} style={{ padding:"8px 16px",borderRadius:10,border:"none",background:C.indigo,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>
              📋 Copier toutes les captions
            </button>
            <button onClick={downloadAll} disabled={zipping} style={{ padding:"8px 16px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:zipping?"default":"pointer",fontSize:13,fontFamily:F,fontWeight:600,opacity:zipping?0.7:1 }}>
              {zipping ? "Téléchargement..." : "⬇ Télécharger toutes les images"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
            <button onClick={()=>setFilterAcc("all")} style={{ padding:"4px 12px",borderRadius:20,border:`1.5px solid ${C.blue}`,background:filterAcc==="all"?C.blue:"transparent",color:filterAcc==="all"?"#fff":C.blue,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:600 }}>
              Tous ({countFor("all")})
            </button>
            {accounts.map(a=>(
              <button key={a.id} onClick={()=>setFilterAcc(a.id)} style={{ padding:"4px 12px",borderRadius:20,border:`1.5px solid ${a.color}`,background:filterAcc===a.id?a.color:"transparent",color:filterAcc===a.id?"#fff":a.color,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:600 }}>
                {a.id} ({countFor(a.id)})
              </button>
            ))}
          </div>
          <div style={{ width:1,height:20,background:C.border }} />
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ ...selectStyle,fontSize:12 }}>
            <option value="all">Tous les statuts</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {filtered.length===0&&(
        <div style={{ ...cardStyle,padding:60,textAlign:"center" }}>
          <div style={{ fontSize:32,marginBottom:8 }}>📭</div>
          <div style={{ fontSize:14,color:C.textSecondary,fontFamily:F }}>Aucun post dans cette sélection</div>
        </div>
      )}

      {/* Post cards */}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {filtered.map((p,i)=>{
          const [y,m,d]=p.dateKey.split("-");
          const dow=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][new Date(Number(y),Number(m)-1,Number(d)).getDay()];
          const isCopied=copiedKey===p.key;
          const statusColor=STATUS_COLORS[p.status||"Brouillon"]||C.textTertiary;

          return (
            <div key={p.key} style={{ background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
              {/* Top bar */}
              <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:p.acc?`${p.acc.color}10`:C.surfaceSecondary,borderBottom:`1px solid ${C.border}`,flexWrap:"wrap" }}>
                <div style={{ fontWeight:700,fontSize:13,color:p.acc?.color||C.text,fontFamily:F }}>{p.account}</div>
                <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F }}>{dow} {parseInt(d)} {MONTHS_FR[Number(m)-1]} {y}</div>
                {p.time&&<div style={{ fontSize:11,color:C.blue,fontFamily:F,background:`${C.blue}12`,padding:"2px 8px",borderRadius:6,fontWeight:600 }}>🕐 {p.time}</div>}
                <div style={{ fontSize:11,color:"#fff",fontFamily:F,background:`${p.acc?.color||"#999"}`,padding:"2px 8px",borderRadius:6,fontWeight:600 }}>{p.type||"—"}</div>
                <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ width:8,height:8,borderRadius:"50%",background:statusColor,display:"inline-block" }}/>
                  <select value={p.status||"Brouillon"} onChange={e=>updateStatus(p.dateKey,p.idx,e.target.value)}
                    style={{ ...selectStyle,fontSize:11,padding:"2px 6px",color:statusColor,fontWeight:600,borderColor:statusColor }}>
                    {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Content */}
              <div style={{ display:"flex",gap:0 }}>
                {/* Image */}
                <div style={{ width:160,flexShrink:0,background:C.surfaceSecondary,borderRight:`1px solid ${C.border}`,position:"relative",cursor:p.thumbSrc?"pointer":"default" }}
                  onClick={()=>p.thumbSrc&&setLightbox(p)}>
                  {p.thumbSrc ? (
                    <img src={p.thumbSrc} style={{ width:160,height:160,objectFit:"cover",display:"block" }}/>
                  ) : (
                    <div style={{ width:160,height:160,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                      <div style={{ fontSize:28 }}>📷</div>
                      <div style={{ fontSize:10,color:C.textTertiary,fontFamily:F,marginTop:4 }}>Pas d'image</div>
                    </div>
                  )}
                  {p.thumbSrc&&(
                    <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s" }}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.35)";e.currentTarget.querySelector("span").style.opacity="1";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0)";e.currentTarget.querySelector("span").style.opacity="0";}}>
                      <span style={{ opacity:0,fontSize:20,transition:"opacity .2s" }}>🔍</span>
                    </div>
                  )}
                </div>

                {/* Caption + actions */}
                <div style={{ flex:1,padding:16,display:"flex",flexDirection:"column",gap:10,minWidth:0 }}>
                  {p.subject&&<div style={{ fontSize:14,fontWeight:600,color:C.text,fontFamily:F }}>{p.subject}</div>}

                  {p.caption ? (
                    <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,lineHeight:1.6,whiteSpace:"pre-wrap",flex:1,maxHeight:120,overflow:"hidden",position:"relative" }}>
                      {p.caption}
                      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:30,background:`linear-gradient(transparent, ${C.surface})` }}/>
                    </div>
                  ) : (
                    <div style={{ fontSize:12,color:C.textTertiary,fontFamily:F,fontStyle:"italic",flex:1 }}>Pas de caption</div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginTop:"auto" }}>
                    {p.caption&&(
                      <button onClick={()=>copyCaption(p.key,p.caption)}
                        style={{ padding:"7px 16px",borderRadius:10,border:"none",background:isCopied?C.green:C.blue,color:"#fff",cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600,transition:"background .2s",flexShrink:0 }}>
                        {isCopied?"✓ Copié !":"📋 Copier la caption"}
                      </button>
                    )}
                    {p.imageUrl&&(
                      <button onClick={()=>{const[y2,m2,d2]=p.dateKey.split("-");downloadImage(p.imageUrl,`${p.dateKey}_${p.account}_${p.type||"post"}.jpg`);}}
                        style={{ padding:"7px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceSecondary,color:C.text,cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:500,flexShrink:0 }}>
                        ⬇ Télécharger l'image
                      </button>
                    )}
                    {p.imageUrl&&(
                      <a href={p.imageUrl} target="_blank" rel="noopener noreferrer"
                        style={{ padding:"7px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:500,textDecoration:"none",flexShrink:0 }}>
                        Ouvrir ↗
                      </a>
                    )}
                    {(p.mediaItems||[]).filter(m=>m.url).length > 1 && (
                      <span style={{ fontSize:11,color:C.textTertiary,fontFamily:F,alignSelf:"center" }}>
                        +{(p.mediaItems||[]).filter(m=>m.url).length-1} autre{(p.mediaItems||[]).filter(m=>m.url).length>2?"s":""} image{(p.mediaItems||[]).filter(m=>m.url).length>2?"s":""}
                      </span>
                    )}
                  </div>

                  {/* All images for carrousels */}
                  {(p.mediaItems||[]).filter(m=>m.url||(m.fileData&&m.fileData.startsWith("data:image"))).length > 1 && (
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginTop:4 }}>
                      {(p.mediaItems||[]).filter(m=>m.url||(m.fileData&&m.fileData.startsWith("data:image"))).map((m,mi)=>(
                        <div key={mi} style={{ position:"relative" }}>
                          <img src={m.fileData||m.url} style={{ width:48,height:48,borderRadius:8,objectFit:"cover",border:`1px solid ${C.border}`,cursor:"pointer" }}
                            onClick={()=>setLightbox({...p,thumbSrc:m.fileData||m.url,imageUrl:m.url})}/>
                          {m.url&&(
                            <button onClick={()=>downloadImage(m.url,`${p.dateKey}_${p.account}_${mi+1}.jpg`)}
                              style={{ position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center" }}>
                              ⬇
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox&&(
        <div onClick={()=>setLightbox(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"relative",maxWidth:"90vw",display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}>
            <img src={lightbox.thumbSrc} style={{ maxWidth:"85vw",maxHeight:"78vh",objectFit:"contain",borderRadius:10,display:"block" }}/>
            <div style={{ display:"flex",gap:10 }}>
              {lightbox.imageUrl&&(
                <button onClick={()=>downloadImage(lightbox.imageUrl,`${lightbox.dateKey}_${lightbox.account}.jpg`)}
                  style={{ padding:"8px 18px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>
                  ⬇ Télécharger
                </button>
              )}
              {lightbox.imageUrl&&(
                <a href={lightbox.imageUrl} target="_blank" rel="noopener noreferrer"
                  style={{ padding:"8px 18px",borderRadius:10,border:`1px solid rgba(255,255,255,0.3)`,background:"transparent",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,textDecoration:"none" }}>
                  Ouvrir ↗
                </a>
              )}
            </div>
            <button onClick={()=>setLightbox(null)} style={{ position:"absolute",top:-14,right:-14,width:30,height:30,borderRadius:"50%",border:"none",background:"#fff",color:C.text,cursor:"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Guide ─────────────────────────────────────────────────────────────────────
function Guide() {
  const [open,setOpen]=useState(null);
  const sections=[
    { id:"start",emoji:"🚀",title:"Par où commencer ?",color:C.blue,steps:[
      {label:"1. Configure les établissements",desc:"Clique sur l'icône ⚙️ en haut à gauche pour accéder aux Paramètres. Définis pour chaque compte le statut ouvert/fermé, le nombre de posts par semaine, et les dates indicatives."},
      {label:"2. Upload tes images dans la Librairie",desc:"Va dans l'onglet Librairie et uploade tes photos par établissement et sous-dossier. Glisse-dépose plusieurs images à la fois."},
      {label:"3. Génère le planning",desc:"Dans le Calendrier, clique sur \"Générer le planning\". Le système répartit automatiquement les posts selon le rythme défini, en tenant compte des semaines coupées."},
      {label:"4. Complète les fiches",desc:"Clique sur un jour pour ouvrir le panneau. Édite chaque fiche : choisis l'image, génère la caption avec l'IA, modifie le sujet."},
      {label:"5. Publie depuis l'onglet Publication",desc:"L'onglet Publication affiche tous tes posts avec image + caption côte à côte. Change les statuts, copie les captions, télécharge les images."},
    ]},
    { id:"calendar",emoji:"📅",title:"Calendrier",color:"#5856D6",steps:[
      {label:"Naviguer entre les mois",desc:"Utilise les flèches ‹ › de part et d'autre du nom du mois."},
      {label:"Cliquer sur un jour",desc:"Un clic ouvre le panneau de la journée. Recliquer ferme le panneau."},
      {label:"Déplacer un post (drag & drop)",desc:"Attrape une fiche et glisse-la vers une autre case. La case cible se surligne en bleu."},
      {label:"Miniature dans le calendrier",desc:"Si un post a une image, une miniature apparaît dans la case pour une vision rapide du contenu."},
      {label:"Générer le planning",desc:"Répartit automatiquement les posts en respectant le rythme posts/semaine et la proratisation des semaines coupées."},
      {label:"Effacer le planning",desc:"Supprime tous les posts du mois en cours. Les autres mois ne sont pas affectés."},
    ]},
    { id:"posts",emoji:"✏️",title:"Fiches post",color:"#FF9500",steps:[
      {label:"Créer un post",desc:"Dans le panneau d'un jour, clique sur \"+ Ajouter\". Choisis le compte, le type et le statut."},
      {label:"Analyser l'image avec l'IA ✨",desc:"Dès qu'une image et un compte sont sélectionnés, le bouton \"✨ Analyser l'image\" apparaît. L'IA analyse la photo et génère sujet + caption adaptés à l'établissement."},
      {label:"Générer / Regénérer la caption",desc:"Si tu remplis le sujet manuellement, la caption se génère automatiquement. Tu peux la regénérer à tout moment."},
      {label:"Copier la caption",desc:"Le bouton \"Copier\" copie tout le texte dans le presse-papier."},
      {label:"Dupliquer un post",desc:"Copie un post vers une autre date avec possibilité de changer le compte."},
      {label:"Statuts",desc:"5 statuts : Brouillon → En cours → Validé → Programmé → Publié. Visible dans le calendrier et modifiable dans Publication."},
    ]},
    { id:"publication",emoji:"📤",title:"Publication",color:C.green,steps:[
      {label:"Vue principale",desc:"Affiche tous les posts triés par date avec image, caption, date et heure suggérée."},
      {label:"Filtres",desc:"Filtre par compte (APG, CSM...) et par statut pour n'afficher que ce dont tu as besoin."},
      {label:"Copier une caption",desc:"Le bouton \"📋 Copier la caption\" copie le texte en un clic, prêt à coller dans Meta Business Suite ou Later."},
      {label:"Télécharger une image",desc:"Le bouton \"⬇ Télécharger l'image\" télécharge directement le fichier depuis Cloudinary."},
      {label:"Télécharger toutes les images",desc:"Le bouton en haut télécharge toutes les images de la sélection en cours, une par une avec des noms explicites (date_compte_type.jpg)."},
      {label:"Copier toutes les captions",desc:"Copie toutes les captions de la sélection dans le presse-papier, séparées par post."},
      {label:"Lightbox",desc:"Clique sur une image pour l'agrandir. Tu peux la télécharger ou l'ouvrir dans un nouvel onglet depuis la lightbox."},
      {label:"Carrousels",desc:"Les posts avec plusieurs images affichent toutes les miniatures en bas avec un bouton de téléchargement individuel pour chacune."},
    ]},
    { id:"library",emoji:"📁",title:"Librairie",color:C.green,steps:[
      {label:"Upload avec sous-dossiers",desc:"Sélectionne le compte et le sous-dossier avant d'uploader. Les images sont organisées dans Cloudinary : oh_library/APG/Chambres/photo.jpg"},
      {label:"Créer un sous-dossier",desc:"Clique sur \"+ Créer un nouveau sous-dossier\" dans la zone d'upload. Il est sauvegardé pour tous les utilisateurs."},
      {label:"Filtrer par compte et sous-dossier",desc:"Les onglets en haut filtrent par compte. Une seconde rangée apparaît pour filtrer par sous-dossier."},
      {label:"Génération batch ✨",desc:"Sélectionne des images, groupe-les, et génère des posts complets avec l'IA en une fois. Les posts sont placés automatiquement dans le calendrier."},
    ]},
    { id:"hashtags",emoji:"#️⃣",title:"Hashtags",color:"#FF9500",steps:[
      {label:"Banque par compte",desc:"Chaque établissement a sa propre banque de hashtags. Sélectionne le compte avec les boutons en haut."},
      {label:"Exactement 5 hashtags par caption",desc:"Les hashtags obligatoires sont inclus en premier, complétés par des hashtags aléatoires de la banque jusqu'à 5 au total."},
      {label:"Modifier les hashtags",desc:"En mode édition (bouton ✏️), tu peux ajouter ou supprimer des hashtags de la banque et des hashtags obligatoires."},
    ]},
  ];

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ ...cardStyle,padding:28,marginBottom:14,background:`linear-gradient(135deg, ${C.blue}06, ${C.indigo}06)` }}>
        <div style={{ fontSize:24,fontWeight:700,color:C.text,fontFamily:F,marginBottom:6,letterSpacing:-0.5 }}>📖 Guide d'utilisation</div>
        <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F,lineHeight:1.6,maxWidth:580 }}>
          Tout ce qu'il faut savoir pour utiliser le Calendrier Éditorial efficacement.
        </div>
        <div style={{ display:"flex",gap:6,marginTop:14,flexWrap:"wrap" }}>
          {sections.map(s=>(
            <button key={s.id} onClick={()=>setOpen(open===s.id?null:s.id)}
              style={{ padding:"5px 14px",borderRadius:20,border:`1.5px solid ${s.color}`,background:open===s.id?s.color:"transparent",color:open===s.id?"#fff":s.color,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:600,transition:"all .15s" }}>
              {s.emoji} {s.title}
            </button>
          ))}
        </div>
      </div>
      {sections.map(s=>(
        <div key={s.id} style={{ ...cardStyle,marginBottom:8 }}>
          <button onClick={()=>setOpen(open===s.id?null:s.id)}
            style={{ width:"100%",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,background:"none",border:"none",cursor:"pointer",textAlign:"left" }}>
            <div style={{ width:38,height:38,borderRadius:10,background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{s.emoji}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14,fontWeight:700,color:C.text,fontFamily:F }}>{s.title}</div>
              <div style={{ fontSize:11,color:C.textSecondary,fontFamily:F,marginTop:1 }}>{s.steps.length} point{s.steps.length>1?"s":""}</div>
            </div>
            <div style={{ fontSize:16,color:C.textTertiary,transform:open===s.id?"rotate(90deg)":"rotate(0)",transition:"transform .2s" }}>›</div>
          </button>
          {open===s.id&&(
            <div style={{ padding:"0 20px 18px",borderTop:`1px solid ${C.border}` }}>
              {s.steps.map((step,i)=>(
                <div key={i} style={{ display:"flex",gap:14,padding:"11px 0",borderBottom:i<s.steps.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ width:26,height:26,borderRadius:"50%",background:`${s.color}18`,border:`1.5px solid ${s.color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                    <span style={{ fontSize:10,fontWeight:700,color:s.color,fontFamily:F }}>{i+1}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F,marginBottom:3 }}>{step.label}</div>
                    <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,lineHeight:1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const today=new Date();
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const [posts,setPosts]=useState({});
  const [accountSettings,setAccountSettings]=useState(
    Object.fromEntries(DEFAULT_ACCOUNTS.map(a=>[a.id,{isOpen:true,postsPerWeek:3,closingDate:"",openingDate:""}]))
  );

  // ── Auth state ────────────────────────────────────────────────────────────
  const [user, setUser]         = useState(null);   // null = not logged in
  const [authChecked, setAuthChecked] = useState(!auth); // if no Firebase, skip

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); } catch {}
  };

  // ── Configurable data (was hardcoded) ─────────────────────────────────────
  const [config,setConfig]=useState({
    accounts:          DEFAULT_ACCOUNTS,
    voices:            DEFAULT_VOICES,
    hashtagBank:       DEFAULT_HASHTAG_BANK,
    mandatoryHashtags: DEFAULT_MANDATORY,
    bestTimes:         DEFAULT_BEST_TIMES,
    mentions:          DEFAULT_MENTION,
    subjectBank:       DEFAULT_SUBJECT_BANK,
  });
  const [subfolders,setSubfolders]=useState(DEFAULT_SUBFOLDERS);
  const [library,setLibrary]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const skipSync=useRef(false);

  const openStatus=Object.fromEntries(config.accounts.map(a=>[a.id,accountSettings[a.id]?.isOpen!==false]));
  const [selectedDay,setSelectedDay]=useState(null);
  const [view,setView]=useState("calendar");

  // ── Load from Firestore / localStorage ───────────────────────────────────
  useEffect(()=>{
    if(!db){
      try{const s=localStorage.getItem("editorial-cal-v3");if(s){const d=JSON.parse(s);if(d.posts)setPosts(d.posts);if(d.accountSettings)setAccountSettings(d.accountSettings);if(d.config)setConfig(d.config);if(d.subfolders)setSubfolders(d.subfolders);}}catch{}
      setLoaded(true);return;
    }
    (async()=>{
      const keys=[["posts","posts"],["accountSettings","accountSettings"],["config","config"],["subfolders","subfolders"]];
      const setters={posts:setPosts,accountSettings:setAccountSettings,config:setConfig,subfolders:setSubfolders};
      for(const[docId,key]of keys){
        try{const snap=await getDoc(doc(db,"calendar",docId));if(snap.exists()&&snap.data().data){skipSync.current=true;setters[key](snap.data().data);setTimeout(()=>{skipSync.current=false;},100);}}catch(e){console.error(e);}
      }
      try{const q=query(collection(db,"library"),orderBy("uploadedAt","desc"));const snap=await getDocs(q);setLibrary(snap.docs.map(d=>({id:d.id,...d.data()})));}catch{}
      setLoaded(true);
    })();
  },[]);

  // ── Save ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!loaded||skipSync.current)return;
    if(db){
      setDoc(doc(db,"calendar","posts"),{data:posts});
      setDoc(doc(db,"calendar","accountSettings"),{data:accountSettings});
      setDoc(doc(db,"calendar","config"),{data:config});
      setDoc(doc(db,"calendar","subfolders"),{data:subfolders});
    }else{
      try{localStorage.setItem("editorial-cal-v3",JSON.stringify({posts,accountSettings,config,subfolders}));}catch{}
    }
  },[posts,accountSettings,config,subfolders,loaded]);

  const monthPrefix=`${year}-${String(month+1).padStart(2,"0")}`;
  const monthPosts=Object.fromEntries(Object.entries(posts).filter(([k])=>k.startsWith(monthPrefix)));
  const prevMonth=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);setSelectedDay(null);};
  const nextMonth=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);setSelectedDay(null);};

  const generatePlanning=()=>{
    const np={...posts};
    config.accounts.forEach(a=>{
      const s=accountSettings[a.id]||{};
      const ppw=Math.max(1,parseInt(s.postsPerWeek)||3);
      const mix=s.typeMix||{Photo:1,Carrousel:1,Reel:1};
      const mixTotal=(mix.Photo||0)+(mix.Carrousel||0)+(mix.Reel||0);

      // Build a weighted type sequence from the mix
      // e.g. {Reel:3, Carrousel:1, Photo:1} → [Reel,Reel,Reel,Carrousel,Photo] repeated
      const typeSeq=[];
      ["Reel","Carrousel","Photo"].forEach(t=>{ for(let i=0;i<(mix[t]||0);i++) typeSeq.push(t); });
      // If mix doesn't cover all posts, fill remainder with Photo
      const remainder=ppw-mixTotal;
      if(remainder>0) for(let i=0;i<remainder;i++) typeSeq.push("Photo");
      // Shuffle for variety within the sequence
      const shuffled=[...typeSeq].sort(()=>Math.random()-0.5);
      let ti=0;

      const fom=new Date(year,month,1);
      const dow1=fom.getDay();const mo=dow1===0?-6:1-dow1;
      const fm=new Date(year,month,1+mo);
      const weeks=Array.from({length:4},(_,wi)=>Array.from({length:7},(_,di)=>{const d=new Date(fm);d.setDate(fm.getDate()+wi*7+di);return d;}));
      weeks.forEach(wd=>{
        const dim=wd.filter(d=>d.getMonth()===month&&d.getFullYear()===year).length;
        const pfw=Math.round((dim/7)*ppw);if(pfw===0)return;
        const md=wd.filter(d=>d.getMonth()===month&&d.getFullYear()===year);
        const ppd=Math.floor(pfw/md.length);const extra=pfw%md.length;
        const ei=new Set();if(extra>0){const idx=Array.from({length:md.length},(_,i)=>i);const seed=a.id.charCodeAt(0)+md[0].getDate();idx.sort((x,y)=>((x*1664525+seed)%md.length)-((y*1664525+seed)%md.length));idx.slice(0,extra).forEach(i=>ei.add(i));}
        md.forEach((date,di)=>{
          const n=ppd+(ei.has(di)?1:0);if(n===0)return;
          const dk=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
          const ex=np[dk]||[];const already=ex.filter(p=>p.account===a.id).length;
          for(let k=0;k<n-already;k++){
            const type=shuffled.length>0?shuffled[ti%shuffled.length]:"Photo";
            ex.push({account:a.id,type,subject:"",caption:"",credits:"",mediaItems:[],status:"Brouillon"});
            ti++;
          }
          np[dk]=ex;
        });
      });
    });
    setPosts(np);
  };

  const clearPlanning=()=>{const np={...posts};Object.keys(np).forEach(k=>{if(k.startsWith(monthPrefix))delete np[k];});setPosts(np);};
  const [showSettings,setShowSettings]=useState(false);

  const tabs=[
    {id:"calendar",label:"Calendrier"},{id:"preview",label:"Preview"},{id:"recap",label:"Récap"},
    {id:"archive",label:"Archive"},{id:"library",label:"Librairie"},{id:"publication",label:"📤 Publication"},{id:"guide",label:"📖 Guide"},
  ];

  return(
    <AccountsContext.Provider value={config}>
    <LibraryContext.Provider value={{ library,setLibrary }}>

    {/* ── Auth guards ── */}
    {!authChecked && (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:13, color:C.textSecondary, fontFamily:F }}>Chargement…</div>
      </div>
    )}
    {authChecked && !user && auth && <LoginPage />}
    {authChecked && (user || !auth) && (

    <div style={{ fontFamily:F,background:C.bg,minHeight:"100vh",padding:"28px 20px" }}>
      <div style={{ textAlign:"center",marginBottom:28, position:"relative" }}>
        {/* ⚙️ Settings icon top-left */}
        <button onClick={()=>setShowSettings(true)}
          title="Paramètres"
          style={{ position:"absolute",left:0,top:0,width:36,height:36,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",transition:"all .15s" }}>
          ⚙️
        </button>

        <h1 style={{ fontSize:32,fontWeight:700,color:C.text,margin:0,letterSpacing:-0.5 }}>Calendrier Éditorial</h1>
        <div style={{ fontSize:12,color:C.textTertiary,marginTop:5,letterSpacing:1.5,fontWeight:500 }}>
          {config.accounts.map(a=>a.id).join(" · ")}
        </div>
        {user && (
          <div style={{ position:"absolute", right:0, top:0, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:12, color:C.textSecondary, fontFamily:F }}>{user.email}</span>
            <button onClick={handleLogout} style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:C.surface, color:C.textSecondary, cursor:"pointer", fontSize:12, fontFamily:F, fontWeight:500, transition:"all .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSecondary;}}>
              Déconnexion
            </button>
          </div>
        )}
      </div>

      {/* Settings modal */}
      {showSettings&&(
        <div onClick={()=>setShowSettings(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9000,display:"flex",alignItems:"flex-start",justifyContent:"flex-start",padding:"80px 20px" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface,borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",width:"min(580px,95vw)",maxHeight:"82vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F }}>⚙️ Paramètres</span>
              <button onClick={()=>setShowSettings(false)} style={{ background:C.surfaceSecondary,border:"none",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:16,color:C.textSecondary,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
            </div>
            <div style={{ padding:20 }}><Settings config={config} setConfig={setConfig}/></div>
          </div>
        </div>
      )}

      <div style={{ display:"flex",justifyContent:"center",marginBottom:24 }}>
        <div style={{ display:"inline-flex",background:"rgba(118,118,128,0.12)",borderRadius:12,padding:3,gap:2,flexWrap:"wrap" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)} style={{ padding:"7px 18px",borderRadius:10,border:"none",background:view===t.id?C.surface:"transparent",color:view===t.id?C.text:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:view===t.id?600:400,transition:"all .18s",boxShadow:view===t.id?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>{t.label}</button>
          ))}
        </div>
      </div>

      {(view==="calendar"||view==="recap")&&(
        <div style={{ display:"flex",alignItems:"center",gap:16,justifyContent:"center",marginBottom:20 }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <h2 style={{ fontFamily:F,fontSize:22,fontWeight:700,color:C.text,letterSpacing:-0.3,margin:0,minWidth:220,textAlign:"center" }}>{MONTHS_FR[month]} {year}</h2>
          <button onClick={nextMonth} style={navBtn}>›</button>
        </div>
      )}

      {view==="calendar"&&(<>
        <OpenClosedPanel accountSettings={accountSettings} setAccountSettings={setAccountSettings} month={month} onGenerate={generatePlanning} onClear={clearPlanning}/>
        <Stats posts={monthPosts}/>
        <CalendarMonth year={year} month={month} posts={posts} onDayClick={d=>setSelectedDay(p=>p===d?null:d)} selectedDay={selectedDay}
          onDeletePost={(dk,i)=>{setPosts(p=>{const u={...p};const dp=[...(u[dk]||[])];dp.splice(i,1);if(dp.length===0)delete u[dk];else u[dk]=dp;return u;});}}
          onDropPost={(from,fi,to)=>{setPosts(p=>{const u={...p};const fa=[...(u[from]||[])];const[mv]=fa.splice(fi,1);if(fa.length===0)delete u[from];else u[from]=fa;const ta=[...(u[to]||[])];ta.push(mv);u[to]=ta;return u;});}}/>
        {selectedDay&&(()=>{
          const dk=fmtDate(year,month,selectedDay);
          const dw=new Date(year,month,selectedDay).getDay();
          const mb=dw===0?6:dw-1;
          return <DayView year={year} month={month} day={selectedDay} dateKey={dk} dayName={DAYS_FULL[mb]} posts={posts} setPosts={setPosts}/>;
        })()}
      </>)}

      {view==="recap"&&(<>
        <OpenClosedPanel accountSettings={accountSettings} setAccountSettings={setAccountSettings} month={month}/>
        <MonthlyRecap year={year} month={month} posts={posts} openStatus={openStatus}/>
        <div style={{ marginTop:16,textAlign:"center" }}><ExportButton year={year} month={month} posts={posts}/></div>
      </>)}

      {view==="preview"&&<FeedPreview posts={posts}/>}
      {view==="archive"&&<Archive posts={posts}/>}
      {view==="library"&&<Library library={library} setLibrary={setLibrary} posts={posts} setPosts={setPosts} year={year} month={month} accountSettings={accountSettings} subfolders={subfolders} setSubfolders={setSubfolders}/>}
      {view==="publication"&&<Publication posts={posts} setPosts={setPosts} config={config}/>}
      {view==="guide"&&<Guide/>}
      {view==="settings"&&<Settings config={config} setConfig={setConfig}/>}
    </div>
    )} {/* end authChecked && user */}
    </LibraryContext.Provider>
    </AccountsContext.Provider>
  );
}
