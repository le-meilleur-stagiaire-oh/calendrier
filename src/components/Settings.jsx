import { useState, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, selectStyle, inputStyle, labelStyle, cardStyle, btnPrimary, btnSecondary } from "../lib/tokens.js";

export default function Settings({ config, setConfig }) {
  const [tab, setTab]           = useState("accounts");
  const [editingId, setEditing] = useState(null);
  const [draft, setDraft]       = useState(null);
  const [newAccForm, setNewAcc] = useState({ id:"", name:"", color:"#007AFF", light:"#E5F0FF" });
  const [showNewAcc, setShowNew] = useState(false);

  const { accounts, voices, hashtagBank, mandatoryHashtags, bestTimes, mentions, subjectBank } = config;

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

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ ...cardStyle, padding:20, marginBottom:16, background:`linear-gradient(135deg,${C.blue}08,${C.indigo}08)` }}>
        <div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F,marginBottom:4 }}>⚙️ Paramètres</div>
        <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F }}>
          Configure les comptes, les voix IA, les hashtags et les horaires. Tout est sauvegardé automatiquement dans Firestore.
        </div>
      </div>

      <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap" }}>
        {[["accounts","Comptes"],["hashtags","Hashtags"],["times","Horaires"],["voices","Voix IA"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"7px 18px",borderRadius:10,border:`1px solid ${tab===k?C.blue:C.border}`,background:tab===k?C.blue:"transparent",color:tab===k?"#fff":C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:tab===k?600:400,transition:"all .18s" }}>{l}</button>
        ))}
      </div>

      {tab === "accounts" && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {accounts.map(acc => (
            <div key={acc.id} style={{ ...cardStyle,padding:0,overflow:"hidden",borderLeft:`4px solid ${acc.color}` }}>
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
