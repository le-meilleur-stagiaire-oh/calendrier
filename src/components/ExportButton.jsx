import { useState, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, cardStyle, pillBtn, btnPrimary, Badge } from "../lib/tokens.jsx";
import { MONTHS_FR, fmtDateFR } from "../lib/dates.js";

export default function ExportButton({ year, month, posts }) {
  const { accounts, bestTimes } = useContext(AccountsContext);
  const [exporting, setExporting] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [filterAcc, setFilterAcc] = useState("all");
  const [copiedKey, setCopiedKey] = useState(null);

  const prefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const allPosts = Object.entries(posts).filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)).flatMap(([dateKey,dp])=>dp.map((p,idx)=>{
    const dow = new Date(dateKey).getDay(); const isWe = dow===0||dow===6;
    const time = p.account&&bestTimes[p.account]?(isWe?bestTimes[p.account].weekend:bestTimes[p.account].weekday):"";
    const fi = (p.mediaItems||[]).find(m=>(m.fileData&&m.fileData.startsWith("data:image"))||(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));
    return {...p,dateKey,time,idx,thumbSrc:fi?.fileData||fi?.url||null,imageUrl:fi?.url||null};
  }));
  const filtered = filterAcc==="all" ? allPosts : allPosts.filter(p=>p.account===filterAcc);

  const handleCSV = () => {
    if(allPosts.length===0) return; setExporting(true);
    accounts.forEach(acc=>{
      const ap = allPosts.filter(p=>p.account===acc.id); if(ap.length===0) return;
      const rows = [["Date","Heure","Type","Statut","Sujet","Caption","Image URL","Crédits"],...ap.map(p=>[p.dateKey,p.time,p.type||"",p.status||"Brouillon",p.subject||"",`"${(p.caption||"").replace(/"/g,'""')}"`,p.imageUrl||"",p.credits||""])];
      const csv = rows.map(r=>r.join(";")).join("\n");
      const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`${acc.id}_${MONTHS_FR[month].toLowerCase()}_${year}.csv`; a.click(); URL.revokeObjectURL(url);
    }); setExporting(false);
  };

  const copyCaption = (key, cap) => { navigator.clipboard.writeText(cap); setCopiedKey(key); setTimeout(()=>setCopiedKey(null),2000); };

  if (showReady) return (
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
          const acc = accounts.find(a=>a.id===p.account);
          const key = `${p.dateKey}-${p.account}-${p.idx}`;
          const isCopied = copiedKey===key;
          const [y,m,d] = p.dateKey.split("-");
          const dateObj = new Date(Number(y),Number(m)-1,Number(d));
          const dow = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][dateObj.getDay()];
          return (
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

  return (
    <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:16 }}>
      <button onClick={()=>setShowReady(true)} style={{ padding:"10px 20px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600,boxShadow:`0 2px 8px ${C.blue}44` }}>📋 Voir les posts prêts à programmer</button>
      <button onClick={handleCSV} disabled={exporting} style={{ padding:"10px 20px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:exporting?"default":"pointer",fontSize:13,fontFamily:F,fontWeight:600,boxShadow:`0 2px 8px ${C.green}44` }}>{exporting?"Export...":"↓ Exporter CSV"}</button>
    </div>
  );
}
