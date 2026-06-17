import { useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F } from "../lib/tokens.js";
import { POST_TYPES } from "../lib/dates.js";

export default function Stats({ posts }) {
  const { accounts } = useContext(AccountsContext);
  const all = Object.values(posts).flat();
  const byAcc = {}; accounts.forEach(a=>{byAcc[a.id]=0;}); all.forEach(p=>{if(p.account&&byAcc[p.account]!==undefined)byAcc[p.account]++;});
  const byType = {Photo:0,Carrousel:0,Reel:0}; all.forEach(p=>{if(p.type&&byType[p.type]!==undefined)byType[p.type]++;});
  const box = { background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:"10px 18px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" };
  return (
    <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
      <div style={box}><div style={{ fontSize:10,color:C.textTertiary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,fontWeight:600 }}>Total</div><div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F }}>{all.length}</div></div>
      {accounts.map(a=><div key={a.id} style={{ ...box,borderBottom:`2px solid ${a.color}` }}><div style={{ fontSize:10,color:C.textTertiary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,fontWeight:600 }}>{a.id}</div><div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F }}>{byAcc[a.id]||0}</div></div>)}
      {POST_TYPES.map(t=><div key={t} style={box}><div style={{ fontSize:10,color:C.textTertiary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F,fontWeight:600 }}>{t}s</div><div style={{ fontSize:22,fontWeight:700,color:C.text,fontFamily:F }}>{byType[t]}</div></div>)}
    </div>
  );
}
