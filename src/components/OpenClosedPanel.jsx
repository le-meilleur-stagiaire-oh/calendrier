import { useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, cardStyle, btnPrimary, btnSecondary } from "../lib/tokens.jsx";
import { MONTHS_FR } from "../lib/dates.js";

export default function OpenClosedPanel({ accountSettings, setAccountSettings, month, onGenerate, onClear }) {
  const { accounts } = useContext(AccountsContext);
  const updateSetting = (id,field,val) => setAccountSettings(p=>({...p,[id]:{...p[id],[field]:val}}));

  const updateTypeMix = (id, type, val) => {
    setAccountSettings(p => {
      const s = p[id] || {};
      const mix = { ...(s.typeMix || { Photo:1, Carrousel:1, Reel:1 }), [type]: Math.max(0, parseInt(val)||0) };
      const total = (mix.Photo||0) + (mix.Carrousel||0) + (mix.Reel||0);
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
      <div style={{ display:"flex",gap:8,marginTop:16,justifyContent:"flex-end" }}>
        {onClear&&<button onClick={onClear} style={{ ...btnSecondary, color:C.red, borderColor:`${C.red}40` }}>Effacer le planning</button>}
        {onGenerate&&<button onClick={onGenerate} style={{ ...btnPrimary() }}>Générer le planning</button>}
      </div>
    </div>
  );
}
