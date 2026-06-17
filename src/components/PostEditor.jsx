import { useState, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, selectStyle, inputStyle, labelStyle } from "../lib/tokens.jsx";
import { POST_TYPES, STATUSES, STATUS_COLORS } from "../lib/dates.js";
import { analyzeImageAndGenerate } from "../lib/ai.js";
import LibraryPicker from "./LibraryPicker.jsx";

function CarouselPreview({ items }) {
  const [previewIdx, setPreviewIdx] = useState(0);
  const cur = items[previewIdx] || {};
  const src = cur.fileData || cur.url || "";
  const isVid = cur.fileType?.startsWith("video/") || src.match(/\.(mp4|mov|webm)/i) || src.startsWith("data:video");
  return (
    <div style={{ marginBottom:10,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`,background:"#000",position:"relative" }}>
      <div style={{ aspectRatio:"1",maxHeight:280,display:"flex",alignItems:"center",justifyContent:"center",background:"#000" }}>
        {src ? (
          isVid
            ? <video key={src} src={src} controls autoPlay muted loop playsInline style={{ maxWidth:"100%",maxHeight:280,objectFit:"contain",display:"block" }}/>
            : <img src={src} style={{ maxWidth:"100%",maxHeight:280,objectFit:"contain",display:"block" }}/>
        ) : (
          <div style={{ color:"#666",fontSize:13,fontFamily:F,textAlign:"center",padding:20 }}>
            <div style={{ fontSize:28,marginBottom:6 }}>📷</div>Pas de média
          </div>
        )}
      </div>
      {previewIdx > 0 && <button onClick={()=>setPreviewIdx(i=>i-1)} style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.85)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600 }}>‹</button>}
      {previewIdx < items.length-1 && <button onClick={()=>setPreviewIdx(i=>i+1)} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.85)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600 }}>›</button>}
      <div style={{ position:"absolute",top:8,right:10,background:"rgba(0,0,0,0.55)",color:"#fff",fontSize:10,fontFamily:F,padding:"2px 7px",borderRadius:10,fontWeight:600 }}>{previewIdx+1}/{items.length}</div>
      <div style={{ position:"absolute",bottom:8,left:0,right:0,display:"flex",justifyContent:"center",gap:4 }}>
        {items.map((_,idx)=>(
          <div key={idx} onClick={()=>setPreviewIdx(idx)} style={{ width:idx===previewIdx?16:6,height:6,borderRadius:3,background:idx===previewIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all .2s" }}/>
        ))}
      </div>
    </div>
  );
}

export default function PostEditor({ post, dateKey, index, onUpdate, onDelete, onGenerate, onDuplicate, generating }) {
  const { accounts, voices, hashtagBank, mandatoryHashtags, bestTimes, mentions, subjectBank } = useContext(AccountsContext);
  const acc = accounts.find(a=>a.id===post.account);
  const [copied, setCopied] = useState(false);
  const [showDup, setShowDup] = useState(false);
  const [dupDate, setDupDate] = useState("");
  const [dupAccount, setDupAccount] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const dow = new Date(dateKey).getDay(); const isWeekend = dow===0||dow===6;
  const suggestedTime = post.account&&bestTimes[post.account]?(isWeekend?bestTimes[post.account].weekend:bestTimes[post.account].weekday):null;
  const subjects = post.account&&subjectBank[post.account]?subjectBank[post.account]:[];

  return (
    <div style={{ background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:10,borderLeft:`3px solid ${acc?.color||C.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap" }}>
        <select value={post.account} onChange={e=>onUpdate("account",e.target.value)} style={selectStyle}>
          <option value="">Compte</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}
        </select>
        <select value={post.type} onChange={e=>onUpdate("type",e.target.value)} style={selectStyle}>
          <option value="">Type</option>
          {POST_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={post.status||"Brouillon"} onChange={e=>onUpdate("status",e.target.value)} style={{ ...selectStyle,color:STATUS_COLORS[post.status||"Brouillon"],fontWeight:600,borderColor:STATUS_COLORS[post.status||"Brouillon"],background:`${STATUS_COLORS[post.status||"Brouillon"]}12` }}>
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
          {subjects.length>0&&<button onClick={()=>onUpdate("subject",subjects[Math.floor(Math.random()*subjects.length)])} style={{ fontSize:10,padding:"3px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surfaceSecondary,cursor:"pointer",color:C.textSecondary,fontFamily:F,fontWeight:500,letterSpacing:0.2 }}>↻ Générer un sujet</button>}
        </div>
        <input value={post.subject||""} onChange={e=>onUpdate("subject",e.target.value)} onBlur={e=>{if(e.target.value.trim()&&post.account&&!post.caption)onGenerate();}} placeholder="Ex: Vue panoramique depuis la terrasse..." style={inputStyle}/>
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={labelStyle}>Crédits (optionnel)</label>
        <input value={post.credits||""} onChange={e=>onUpdate("credits",e.target.value)} placeholder="Ex: Photo @nom_photographe" style={inputStyle}/>
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
          <label style={labelStyle}>Médias {(post.mediaItems||[]).length>0&&`(${(post.mediaItems||[]).length})`}</label>
          {(post.mediaItems||[]).length>1&&<span style={{ fontSize:10,color:C.textTertiary,fontFamily:F }}>Glisser pour réordonner</span>}
        </div>

        {(post.mediaItems||[]).length>1&&<CarouselPreview items={post.mediaItems}/>}

        {(post.mediaItems||[]).length>1&&(
          <div style={{ display:"flex",gap:6,marginBottom:8,overflowX:"auto",paddingBottom:4 }}>
            {(post.mediaItems||[]).map((item,i)=>{
              const src = item.fileData||item.url||"";
              const isVid = item.fileType?.startsWith("video/")||src.match(/\.(mp4|mov)/i)||src.startsWith("data:video");
              return (
                <div key={i} draggable
                  onDragStart={e=>e.dataTransfer.setData("text/plain",String(i))}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();const from=parseInt(e.dataTransfer.getData("text/plain"));if(from===i)return;const arr=[...(post.mediaItems||[])];const[moved]=arr.splice(from,1);arr.splice(i,0,moved);onUpdate("mediaItems",arr);}}
                  style={{ width:52,height:52,borderRadius:8,overflow:"hidden",flexShrink:0,cursor:"grab",border:`2px solid ${C.border}`,position:"relative",transition:"border-color .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                  {isVid?(
                    <div style={{ width:"100%",height:"100%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:18 }}>▶</span></div>
                  ):src?(
                    <img src={src} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
                  ):(
                    <div style={{ width:"100%",height:"100%",background:C.surfaceSecondary,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:16 }}>📷</span></div>
                  )}
                  <button onClick={()=>{const arr=[...(post.mediaItems||[])];arr.splice(i,1);onUpdate("mediaItems",arr);}} style={{ position:"absolute",top:1,right:1,width:16,height:16,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.6)",color:"#fff",cursor:"pointer",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1 }}>×</button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {(post.mediaItems||[]).map((item,i)=>(
            <div key={i} style={{ padding:"8px 10px",background:C.surfaceSecondary,borderRadius:8,border:`1px solid ${C.border}` }}>
              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <div style={{ width:20,height:20,borderRadius:"50%",background:C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <span style={{ fontSize:9,fontWeight:700,color:C.textSecondary,fontFamily:F }}>{i+1}</span>
                </div>
                <input value={item.name||""} onChange={e=>{const arr=[...(post.mediaItems||[])];arr[i]={...arr[i],name:e.target.value};onUpdate("mediaItems",arr);}} placeholder="Nom du fichier" style={{ ...inputStyle,flex:1,fontSize:11,padding:"4px 6px" }}/>
                <label style={{ padding:"3px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface,color:C.textSecondary,cursor:"pointer",fontSize:10,fontFamily:F,fontWeight:500,whiteSpace:"nowrap" }}>
                  {item.fileData?"Changer":"Uploader"}
                  <input type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={e=>{
                    const file=e.target.files?.[0]; if(!file)return;
                    const r=new FileReader();
                    r.onload=()=>{const arr=[...(post.mediaItems||[])];arr[i]={...arr[i],fileData:r.result,fileType:file.type,fileName:file.name,name:arr[i].name||file.name};onUpdate("mediaItems",arr);};
                    r.readAsDataURL(file);
                  }}/>
                </label>
                <span onClick={()=>{const arr=[...(post.mediaItems||[])];arr.splice(i,1);onUpdate("mediaItems",arr);}} style={{ fontSize:14,color:C.textTertiary,cursor:"pointer",padding:"0 4px" }} onMouseEnter={e=>e.target.style.color=C.red} onMouseLeave={e=>e.target.style.color=C.textTertiary}>×</span>
              </div>
              {(post.mediaItems||[]).length===1&&(()=>{
                const src = item.fileData||item.url||"";
                const isVid = item.fileType?.startsWith("video/")||src.match(/\.(mp4|mov|webm)/i)||src.startsWith("data:video");
                if(!src) return null;
                return isVid
                  ?<video key={src} src={src} controls muted playsInline style={{ marginTop:8,width:"100%",maxHeight:200,borderRadius:8,display:"block",background:"#000" }}/>
                  :<img src={src} style={{ marginTop:6,maxWidth:"100%",maxHeight:160,borderRadius:8,objectFit:"cover",border:`1px solid ${C.border}` }}/>;
              })()}
              <div style={{ display:"flex",gap:6,alignItems:"center",marginTop:6 }}>
                <input value={item.driveUrl||""} onChange={e=>{const arr=[...(post.mediaItems||[])];arr[i]={...arr[i],driveUrl:e.target.value};onUpdate("mediaItems",arr);}} placeholder="Lien Google Drive (optionnel)" style={{ ...inputStyle,fontSize:10,padding:"3px 6px",flex:1 }}/>
                {item.driveUrl&&<a href={item.driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:10,color:C.blue,textDecoration:"none",whiteSpace:"nowrap" }}>Ouvrir</a>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex",gap:6,marginTop:6 }}>
          <button onClick={()=>{const arr=[...(post.mediaItems||[])];arr.push({name:"",fileData:null,fileType:"",fileName:"",driveUrl:""});onUpdate("mediaItems",arr);}} style={{ flex:1,padding:"7px 12px",borderRadius:8,border:`1px dashed ${C.border}`,background:C.surfaceSecondary,cursor:"pointer",fontSize:11,color:C.textSecondary,fontFamily:F,display:"flex",alignItems:"center",gap:6,justifyContent:"center" }}>+ Uploader un média</button>
          <button onClick={()=>setShowLibrary(true)} style={{ flex:1,padding:"7px 12px",borderRadius:8,border:`1px dashed ${C.border}`,background:C.surfaceSecondary,cursor:"pointer",fontSize:11,color:C.text,fontFamily:F,display:"flex",alignItems:"center",gap:6,justifyContent:"center",fontWeight:500 }}>📁 Choisir depuis la librairie</button>
        </div>
      </div>

      {showLibrary&&<LibraryPicker multiSelect onClose={()=>setShowLibrary(false)} accountHint={post.account||"all"} onSelect={items=>{const arr=(Array.isArray(items)?items:[items]).map(item=>({name:item.name,url:item.url,fileType:item.fileType,fileName:item.name,fileData:null,driveUrl:""}));onUpdate("mediaItems",[...(post.mediaItems||[]),...arr]);}}/>}

      {(()=>{
        const fi = (post.mediaItems||[]).find(m=>(m.url&&(m.fileType?.startsWith("image/")||m.url.match(/\.(jpg|jpeg|png|webp|gif)/i)))||(m.fileData&&m.fileData.startsWith("data:image")));
        if(!fi||!post.account) return null;
        const hasUrl = fi.url&&fi.url.startsWith("http"); const hasB64 = fi.fileData&&fi.fileData.startsWith("data:image");
        if(!hasUrl&&!hasB64) return null;
        return (
          <div style={{ marginBottom:10 }}>
            {!hasUrl&&hasB64&&<div style={{ padding:"8px 12px",borderRadius:8,background:`${C.orange}15`,border:`1px solid ${C.orange}40`,fontSize:11,color:C.orange,fontFamily:F,marginBottom:6 }}>⚠️ Image locale — pour l'analyse IA, préfère une image depuis la Librairie.</div>}
            <button disabled={analyzingImage||generating} onClick={async()=>{
              setAnalyzingImage(true);
              const result = await analyzeImageAndGenerate(hasUrl?fi.url:null,hasB64?fi.fileData:null,post.account,post.credits||"",voices,hashtagBank,mandatoryHashtags,mentions);
              if(result.error) alert(`Erreur : ${result.error}`);
              else{if(result.subject)onUpdate("subject",result.subject);if(result.caption)onUpdate("caption",result.caption);}
              setAnalyzingImage(false);
            }} style={{ width:"100%",padding:"10px 16px",borderRadius:10,border:"none",background:analyzingImage?C.surfaceSecondary:C.text,color:analyzingImage?C.textSecondary:"#fff",cursor:analyzingImage?"default":"pointer",fontSize:13,fontFamily:F,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:analyzingImage?"none":"0 1px 3px rgba(0,0,0,0.15)",letterSpacing:0.2 }}>
              {analyzingImage?<><span>⏳</span> Analyse en cours...</>:<><span>✨</span> Analyser l'image et générer la caption</>}
            </button>
          </div>
        );
      })()}

      {post.caption&&(
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
            <label style={labelStyle}>Caption</label>
            <button onClick={onGenerate} disabled={generating||!post.subject||!post.account} style={{ fontSize:10,padding:"3px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surfaceSecondary,cursor:"pointer",color:C.textSecondary,fontFamily:F,fontWeight:500 }}>↻ Regénérer</button>
          </div>
          <textarea value={post.caption} onChange={e=>onUpdate("caption",e.target.value)} rows={12} style={{ ...inputStyle,lineHeight:1.6,minHeight:200,resize:"vertical" }}/>
        </div>
      )}
      {post.caption&&<button onClick={()=>{navigator.clipboard.writeText(post.caption);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ padding:"7px 16px",borderRadius:8,border:"none",background:copied?C.green:C.text,color:"#fff",cursor:"pointer",fontSize:12,fontFamily:F,letterSpacing:0.3,fontWeight:500,transition:"background .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.12)" }}>{copied?"✓ Copié !":"Copier la caption"}</button>}
    </div>
  );
}
