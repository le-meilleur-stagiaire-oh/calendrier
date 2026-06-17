import { useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, cardStyle, Badge } from "../lib/tokens.js";
import { MONTHS_FR, fmtDateFR, getWeeksOfMonth } from "../lib/dates.js";

export default function MonthlyRecap({ year, month, posts, openStatus }) {
  const { accounts } = useContext(AccountsContext);
  const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthPosts = Object.entries(posts).filter(([k])=>k.startsWith(prefix)).flatMap(([k,v])=>v.map(p=>({...p,date:k})));
  const byAccount = {};
  accounts.forEach(a=>{byAccount[a.id]={total:0,Photo:0,Carrousel:0,Reel:0};});
  monthPosts.forEach(p=>{if(p.account&&byAccount[p.account]){byAccount[p.account].total++;if(p.type)byAccount[p.account][p.type]=(byAccount[p.account][p.type]||0)+1;}});
  const numWeeks = getWeeksOfMonth(year, month).length;
  const dayAccMap = {};
  monthPosts.forEach(p=>{const k=`${p.date}-${p.account}`;dayAccMap[k]=(dayAccMap[k]||0)+1;});
  const conflicts = Object.entries(dayAccMap).filter(([,c])=>c>1);

  return (
    <div style={{ ...cardStyle,padding:16,marginTop:16 }}>
      <div style={{ fontSize:11,fontWeight:600,color:C.text,letterSpacing:1,textTransform:"uppercase",fontFamily:F,marginBottom:14 }}>Récap — {MONTHS_FR[month]} {year}</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:14 }}>
        {accounts.map(a=>{
          const isOpen = openStatus[a.id] !== false;
          const target = isOpen ? numWeeks*3 : numWeeks*2;
          const actual = (byAccount[a.id]||{}).total||0;
          const diff = actual-target; const ok = diff>=0;
          const hasReel = (byAccount[a.id]||{}).Reel>0;
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
