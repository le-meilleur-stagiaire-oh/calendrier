import { useState } from "react";
import { auth, signInWithEmailAndPassword } from "../lib/firebase.js";
import { C, F, FH, inputStyle, labelStyle } from "../lib/tokens.jsx";

export default function LoginPage() {
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
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginBottom:12,padding:"4px 14px",borderRadius:20,background:C.surface,border:`1px solid ${C.borderStrong}`,boxShadow:"0 1px 3px rgba(26,35,50,0.06)" }}>
            <span style={{ fontSize:12 }}>😉</span>
            <span style={{ fontSize:10,fontWeight:700,color:C.gold,letterSpacing:2,textTransform:"uppercase",fontFamily:F }}>Winking 247</span>
          </div>
          <h1 style={{ fontSize:28, fontWeight:700, color:C.text, margin:0, letterSpacing:0, fontFamily:FH }}>Calendrier Éditorial</h1>
          <p style={{ fontSize:13, color:C.textSecondary, marginTop:8, fontFamily:F }}>Connecte-toi pour accéder à l'outil</p>
        </div>

        <div style={{ background:C.surface, borderRadius:20, border:`1px solid ${C.border}`, padding:28, boxShadow:"0 2px 12px rgba(26,35,50,0.07), 0 8px 32px rgba(26,35,50,0.05)" }}>
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="prenom@exemple.com" autoComplete="email" autoFocus
                style={{ ...inputStyle, fontSize:15 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Mot de passe</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                style={{ ...inputStyle, fontSize:15 }}
              />
            </div>

            {error && (
              <div style={{ padding:"10px 14px", borderRadius:10, background:`${C.red}10`, border:`1px solid ${C.red}25`, fontSize:13, color:C.red, fontFamily:F }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{ padding:"13px", borderRadius:12, border:"none", background: loading||!email||!password ? C.surfaceSecondary : C.text, color: loading||!email||!password ? C.textTertiary : "#fff", cursor: loading||!email||!password ? "default" : "pointer", fontSize:15, fontFamily:FH, fontWeight:700, transition:"all .2s", boxShadow: loading||!email||!password ? "none" : `0 2px 12px rgba(26,35,50,0.25)`, marginTop:4, letterSpacing:0.3 }}>
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
