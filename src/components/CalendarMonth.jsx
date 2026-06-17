import { useState, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, cardStyle } from "../lib/tokens.js";
import { DAYS_FR, getDaysInMonth, getFirstDayOfMonth, fmtDate, STATUS_COLORS, getEffectiveStatus } from "../lib/dates.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

export default function CalendarMonth({ year, month, posts, onDayClick, selectedDay, onDeletePost, onDropPost }) {
  const isMobile = useIsMobile();
  const { accounts } = useContext(AccountsContext);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = []; for(let i=0;i<firstDay;i++) cells.push(null); for(let d=1;d<=daysInMonth;d++) cells.push(d); while(cells.length%7!==0) cells.push(null);
  const [dragOver, setDragOver] = useState(null);

  return (
    <div style={cardStyle}>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`1px solid ${C.border}` }}>
        {DAYS_FR.map(d=><div key={d} style={{ padding:"10px 0",textAlign:"center",fontFamily:F,fontSize:11,fontWeight:600,color:C.textTertiary,letterSpacing:1,textTransform:"uppercase",background:C.surfaceSecondary }}>{d}</div>)}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)" }}>
        {cells.map((day,i)=>{
          const dateKey = day ? fmtDate(year, month, day) : null;
          const dayPosts = dateKey ? (posts[dateKey]||[]) : [];
          const isSel = day===selectedDay; const isWe = i%7>=5; const isDrag = dragOver===dateKey;
          const isToday = day&&new Date().getDate()===day&&new Date().getMonth()===month&&new Date().getFullYear()===year;
          const statusBg = (()=>{
            if(!day||dayPosts.length===0) return null;
            const eff = dayPosts.map(p=>getEffectiveStatus(p, dateKey));
            if(eff.some(s=>s==="Manqué")) return `${STATUS_COLORS["Manqué"]}10`;
            if(eff.every(s=>s==="Publié")) return `${STATUS_COLORS["Publié"]}18`;
            if(eff.every(s=>s==="Prêt"||s==="Publié")) return `${STATUS_COLORS["Prêt"]}10`;
            if(eff.some(s=>s==="Programmé")) return `${STATUS_COLORS["Programmé"]}10`;
            if(eff.some(s=>s==="En cours")) return `${STATUS_COLORS["En cours"]}08`;
            return null;
          })();
          return (
            <div key={i} onClick={()=>day&&onDayClick(day)}
              onDragOver={e=>{if(!dateKey)return;e.preventDefault();setDragOver(dateKey);}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={e=>{e.preventDefault();setDragOver(null);if(!dateKey)return;try{const data=JSON.parse(e.dataTransfer.getData("text/plain"));if(data.fromDateKey!==dateKey)onDropPost(data.fromDateKey,data.fromIndex,dateKey);}catch{}}}
              style={{ minHeight:isMobile?60:90,padding:isMobile?"3px 3px":"6px 6px 4px",borderRight:(i+1)%7!==0?`1px solid ${C.border}`:"none",borderBottom:`1px solid ${C.border}`,cursor:day?"pointer":"default",background:isDrag?`${C.blue}10`:isSel?`${C.blue}05`:statusBg||(isWe&&day?C.surfaceSecondary:day?C.surface:C.surfaceSecondary),transition:"background .12s",position:"relative",outline:isDrag?`2px dashed ${C.blue}`:"none" }}>
              {day&&(<>
                <div style={{ fontSize:13,fontWeight:isToday?700:isSel?600:400,color:isToday?"#fff":isSel?C.blue:isWe?C.textSecondary:C.text,fontFamily:F,marginBottom:4,width:22,height:22,borderRadius:"50%",background:isToday?C.blue:"transparent",display:"flex",alignItems:"center",justifyContent:"center" }}>{day}</div>
                <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                  {dayPosts.map((p,j)=>{
                    const acc = accounts.find(a=>a.id===p.account);
                    const stMap = {"Brouillon":{letter:"B",bg:STATUS_COLORS["Brouillon"]},"En cours":{letter:"•",bg:STATUS_COLORS["En cours"]},"Prêt":{letter:"✓",bg:STATUS_COLORS["Prêt"]},"Programmé":{letter:"P",bg:STATUS_COLORS["Programmé"]},"Publié":{letter:"✓",bg:STATUS_COLORS["Publié"]},"Manqué":{letter:"!",bg:STATUS_COLORS["Manqué"]}};
                    const effStatus = getEffectiveStatus(p, dateKey);
                    const st = stMap[effStatus]||stMap["Brouillon"];
                    const fi = (p.mediaItems||[]).find(m=>(m.fileData&&m.fileData.startsWith("data:image"))||(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));
                    const thumb = fi?.fileData||fi?.url;
                    return (
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
