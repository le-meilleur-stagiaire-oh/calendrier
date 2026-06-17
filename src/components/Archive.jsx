import { useState, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, cardStyle, Badge } from "../lib/tokens.jsx";
import { MONTHS_FR, fmtDateFR } from "../lib/dates.js";

export default function Archive({ posts }) {
  const { accounts } = useContext(AccountsContext);
  const monthKeys = new Set(); Object.keys(posts).forEach(k=>monthKeys.add(k.substring(0,7)));
  const sortedMonths = [...monthKeys].sort().reverse();
  const [expanded, setExpanded] = useState(null);

  if (sortedMonths.length===0) return (
    <div style={{ ...cardStyle,padding:30,marginTop:16,textAlign:"center" }}>
      <div style={{ color:C.textTertiary,fontSize:13,fontFamily:F }}>Aucun historique pour le moment</div>
    </div>
  );

  return (
    <div style={{ ...cardStyle,padding:20,marginTop:16 }}>
      <div style={{ fontSize:11,fontWeight:600,color:C.text,letterSpacing:1,textTransform:"uppercase",fontFamily:F,marginBottom:14 }}>Historique</div>
      {sortedMonths.map(mk=>{
        const [y,m] = mk.split("-").map(Number);
        const entries = Object.entries(posts).filter(([k])=>k.startsWith(mk)).sort(([a],[b])=>a.localeCompare(b));
        const total = entries.reduce((s,[,v])=>s+v.length,0);
        const byAcc = {}; accounts.forEach(a=>{byAcc[a.id]=0;}); entries.forEach(([,v])=>v.forEach(p=>{if(p.account&&byAcc[p.account]!==undefined)byAcc[p.account]++;}));
        const byType = {Photo:0,Carrousel:0,Reel:0}; entries.forEach(([,v])=>v.forEach(p=>{if(p.type)byType[p.type]=(byType[p.type]||0)+1;}));
        const isExp = expanded===mk;
        return (
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
