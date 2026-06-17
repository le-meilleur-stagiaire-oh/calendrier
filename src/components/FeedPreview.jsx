import { useState, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, cardStyle } from "../lib/tokens.jsx";
import { MONTHS_FR, fmtDateFR } from "../lib/dates.js";

export default function FeedPreview({ posts }) {
  const { accounts } = useContext(AccountsContext);
  const [sel, setSel] = useState(accounts[0]?.id||"");
  const acc = accounts.find(a=>a.id===sel);
  const allPosts = Object.entries(posts).flatMap(([dateKey,dp])=>dp.filter(p=>p.account===sel).map(p=>({...p,dateKey}))).sort((a,b)=>b.dateKey.localeCompare(a.dateKey));
  const rows = []; for(let i=0;i<allPosts.length;i+=3) rows.push(allPosts.slice(i,i+3));
  const [lightbox, setLightbox] = useState(null);
  const getThumb = p => {const img=(p.mediaItems||[]).find(m=>(m.fileData&&m.fileData.startsWith("data:image"))||(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i))));return img?.fileData||img?.url||null;};
  const statusColors = {Brouillon:"#F5C542","En cours":"#7BC67E",Validé:"#1B5E20",Programmé:"#E67E22",Publié:C.green};

  return (
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
                  const thumb = getThumb(p);
                  return (
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
        const lbAcc = accounts.find(a=>a.id===lightbox.account);
        const mediaItems = (lightbox.mediaItems||[]).filter(m=>{
          const src = m.fileData||m.url||"";
          return src && (m.fileType?.startsWith("image/")||m.fileType?.startsWith("video/")||src.match(/\.(jpg|jpeg|png|webp|gif|mp4|mov)/i)||src.startsWith("data:"));
        });
        const hasMultiple = mediaItems.length>1||(lightbox.type==="Carrousel"&&mediaItems.length>0);
        const [slideIdx, setSlideIdx] = useState(0);
        const currentMedia = mediaItems[slideIdx]||null;
        const currentSrc = currentMedia?.fileData||currentMedia?.url||getThumb(lightbox)||null;
        const isVideo = currentMedia?.fileType?.startsWith("video/")||currentSrc?.match(/\.(mp4|mov|webm)/i);
        return (
          <div onClick={()=>setLightbox(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:14,overflow:"hidden",display:"flex",maxWidth:"min(900px,95vw)",width:"100%",maxHeight:"88vh" }}>
              <div style={{ flex:"0 0 55%",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",position:"relative" }}>
                {currentSrc?(
                  isVideo
                    ?<video src={currentSrc} controls autoPlay style={{ maxWidth:"100%",maxHeight:"88vh",objectFit:"contain" }}/>
                    :<img src={currentSrc} style={{ maxWidth:"100%",maxHeight:"88vh",objectFit:"contain" }}/>
                ):(
                  <div style={{ color:"#666",textAlign:"center",padding:40 }}><div style={{ fontSize:48 }}>📷</div><div style={{ fontSize:13,marginTop:8 }}>Pas d'image</div></div>
                )}
                {hasMultiple&&mediaItems.length>1&&(<>
                  <button onClick={e=>{e.stopPropagation();setSlideIdx(i=>Math.max(0,i-1));}} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.85)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",opacity:slideIdx===0?0.3:1 }}>‹</button>
                  <button onClick={e=>{e.stopPropagation();setSlideIdx(i=>Math.min(mediaItems.length-1,i+1));}} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.85)",cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",opacity:slideIdx===mediaItems.length-1?0.3:1 }}>›</button>
                  <div style={{ position:"absolute",bottom:10,left:0,right:0,display:"flex",justifyContent:"center",gap:5 }}>
                    {mediaItems.map((_,i)=>(
                      <div key={i} onClick={e=>{e.stopPropagation();setSlideIdx(i);}} style={{ width:i===slideIdx?18:7,height:7,borderRadius:4,background:i===slideIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all .2s" }}/>
                    ))}
                  </div>
                  <div style={{ position:"absolute",top:10,right:12,background:"rgba(0,0,0,0.5)",color:"#fff",fontSize:11,fontFamily:F,padding:"2px 8px",borderRadius:10 }}>{slideIdx+1}/{mediaItems.length}</div>
                </>)}
              </div>
              <div style={{ flex:1,padding:20,overflowY:"auto",display:"flex",flexDirection:"column" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
                  <div style={{ width:36,height:36,borderRadius:"50%",background:lbAcc?.color,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:12,fontWeight:700,color:"#fff",fontFamily:F }}>{lightbox.account}</span></div>
                  <div>
                    <div style={{ fontWeight:600,fontSize:13,fontFamily:F,color:C.text }}>{lbAcc?.name}</div>
                    <div style={{ fontSize:11,color:C.textSecondary,fontFamily:F }}>{fmtDateFR(lightbox.dateKey)}</div>
                  </div>
                  <button onClick={()=>setLightbox(null)} style={{ marginLeft:"auto",background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.textSecondary }}>×</button>
                </div>
                <div style={{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" }}>
                  <span style={{ padding:"2px 8px",borderRadius:6,background:`${C.blue}18`,color:C.blue,fontSize:10,fontFamily:F,fontWeight:600 }}>{lightbox.type}</span>
                  {hasMultiple&&<span style={{ padding:"2px 8px",borderRadius:6,background:`${C.indigo}18`,color:C.indigo,fontSize:10,fontFamily:F,fontWeight:600 }}>{mediaItems.length} médias</span>}
                </div>
                {hasMultiple&&mediaItems.length>1&&(
                  <div style={{ display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:4 }}>
                    {mediaItems.map((m,i)=>{
                      const src = m.fileData||m.url||"";
                      const isVid = m.fileType?.startsWith("video/")||src.match(/\.(mp4|mov)/i);
                      return (
                        <div key={i} onClick={()=>setSlideIdx(i)} style={{ width:48,height:48,borderRadius:6,overflow:"hidden",flexShrink:0,cursor:"pointer",border:`2px solid ${i===slideIdx?C.blue:C.border}`,transition:"border .15s",position:"relative" }}>
                          {isVid?(<div style={{ width:"100%",height:"100%",background:"#000",display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:16 }}>▶</span></div>):(<img src={src} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>)}
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
