import { useState, useRef, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, selectStyle, inputStyle, cardStyle, pillBtn, btnPrimary } from "../lib/tokens.js";
import { MONTHS_FR } from "../lib/dates.js";
import { analyzeImageAndGenerate } from "../lib/ai.js";
import { db, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, collection, addDoc, deleteDoc, doc, setDoc } from "../lib/firebase.js";

export default function Library({ library, setLibrary, posts, setPosts, year, month, accountSettings, subfolders, setSubfolders }) {
  const { accounts, voices, hashtagBank, mandatoryHashtags, mentions } = useContext(AccountsContext);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [selAcc, setSelAcc] = useState("all");
  const [selSub, setSelSub] = useState("all");
  const [upAcc, setUpAcc] = useState(accounts[0]?.id||"");
  const [upSub, setUpSub] = useState("all");
  const [newSfName, setNewSfName] = useState("");
  const [showNewSf, setShowNewSf] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchAcc, setBatchAcc] = useState(accounts[0]?.id||"");
  const [batchSub, setBatchSub] = useState("all");
  const [batchGroups, setBatchGroups] = useState([]);
  const [batchSel, setBatchSel] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genProg, setGenProg] = useState({current:0,total:0,label:""});
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSel, setBulkSel] = useState([]);
  const [bulkAcc, setBulkAcc] = useState("all");
  const [bulkSub, setBulkSub] = useState("all");
  const fileInputRef = useRef(null);

  const handleUpload = async (files) => {
    if(!files||files.length===0) return;
    if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_UPLOAD_PRESET){alert("Cloudinary non configuré");return;}
    setUploading(true); setProgress(0);
    const total = files.length; const added = [];
    const account = upAcc==="all" ? null : upAcc;
    const subfolder = upSub==="all" ? null : upSub;
    const folder = account?(subfolder?`oh_library/${account}/${subfolder}`:`oh_library/${account}`):"oh_library";
    for(let i=0;i<files.length;i++){
      const file = files[i]; const fd = new FormData();
      fd.append("file",file); fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET); fd.append("folder",folder);
      const xhr = new XMLHttpRequest();
      await new Promise((res,rej)=>{
        xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.round(((i+e.loaded/e.total)/total)*100));};
        xhr.onload=async()=>{if(xhr.status===200){const r=JSON.parse(xhr.responseText);const entry={url:r.secure_url,publicId:r.public_id,name:file.name,fileType:file.type,account:account||null,subfolder:subfolder||null,uploadedAt:new Date().toISOString()};if(db){const ref=await addDoc(collection(db,"library"),entry);added.push({id:ref.id,...entry});}else added.push({id:Date.now()+i,...entry});res();}else rej();};
        xhr.onerror=rej; xhr.open("POST",`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`); xhr.send(fd);
      });
    }
    setLibrary(prev=>[...added,...prev]); setUploading(false); setProgress(0);
  };

  const addSf = () => {const n=newSfName.trim();if(!n||upAcc==="all")return;const cur=subfolders[upAcc]||[];if(cur.includes(n))return;setSubfolders(p=>({...p,[upAcc]:[...cur,n]}));setNewSfName("");setShowNewSf(false);};
  const rmSf = (acc,f) => setSubfolders(p=>({...p,[acc]:(p[acc]||[]).filter(x=>x!==f)}));
  const handleDelete = async (item) => {if(!window.confirm("Supprimer de la librairie ?"))return;if(db){try{await deleteDoc(doc(db,"library",item.id));}catch{}}setLibrary(p=>p.filter(x=>x.id!==item.id));};

  const toggleBulk = (item) => setBulkSel(p=>p.find(x=>x.id===item.id)?p.filter(x=>x.id!==item.id):[...p,item]);
  const applyBulk = async () => {
    if(bulkSel.length===0) return;
    const newAcc = bulkAcc==="all" ? null : bulkAcc;
    const newSub = bulkSub==="all" ? null : bulkSub;
    const updated = [];
    for(const item of bulkSel){
      const entry = {...item,account:newAcc,subfolder:newSub};
      if(db){try{await setDoc(doc(db,"library",item.id),entry);}catch(e){console.error(e);}}
      updated.push(entry);
    }
    setLibrary(prev=>prev.map(x=>{const u=updated.find(u=>u.id===x.id);return u||x;}));
    setBulkSel([]); setBulkMode(false); setBulkSel([]);
  };

  const filtered = library
    .filter(x=>selAcc==="all"?true:x.account===selAcc)
    .filter(x=>selSub==="all"?true:x.subfolder===selSub)
    .filter(x=>(x.name||"").toLowerCase().includes(search.toLowerCase()));
  const countFor = id => id==="all" ? library.length : library.filter(x=>x.account===id).length;
  const curSubs = selAcc!=="all" ? (subfolders[selAcc]||[]) : [];

  const toggleBatchSel = item => setBatchSel(p=>p.find(x=>x.id===item.id)?p.filter(x=>x.id!==item.id):[...p,item]);
  const addGroup = () => {if(batchSel.length===0)return;setBatchGroups(p=>[...p,{images:[...batchSel],type:batchSel.length===1?"Photo":"Carrousel",id:Date.now()}]);setBatchSel([]);};
  const rmGroup = id => setBatchGroups(p=>p.filter(g=>g.id!==id));
  const setGrpType = (id,t) => setBatchGroups(p=>p.map(g=>g.id===id?{...g,type:t}:g));

  const getSlots = (n) => {
    const dim = new Date(year,month+1,0).getDate();
    const tom = new Date(); tom.setDate(tom.getDate()+1); tom.setHours(0,0,0,0);
    const dates = [];
    for(let d=1;d<=dim;d++){const dt=new Date(year,month,d);if(dt.getMonth()!==month||dt<tom)continue;dates.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);}
    const ppw = Math.max(1,parseInt(accountSettings?.[batchAcc]?.postsPerWeek)||3);
    const occ = new Set(Object.entries(posts).filter(([k])=>k.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).flatMap(([k,v])=>v.filter(p=>p.account===batchAcc).map(()=>k)));
    const minGap = Math.max(1,Math.floor(7/ppw));
    const slots = []; let last = null;
    for(const dk of dates){if(slots.length>=n)break;if(occ.has(dk))continue;if(last!==null&&Math.round((new Date(dk)-new Date(last))/86400000)<minGap)continue;slots.push(dk);last=dk;}
    if(slots.length<n){for(const dk of dates){if(slots.length>=n)break;if(slots.includes(dk)||occ.has(dk))continue;slots.push(dk);}}
    return slots;
  };

  const runBatch = async () => {
    if(batchGroups.length===0) return;
    const slots = getSlots(batchGroups.length);
    if(slots.length===0){alert("Aucun jour disponible ce mois-ci.");return;}
    if(slots.length<batchGroups.length&&!window.confirm(`Seulement ${slots.length} jour(s) disponible(s). Continuer ?`))return;
    setGenerating(true); setGenProg({current:0,total:slots.length,label:"Préparation..."});
    const np = {...posts};
    for(let i=0;i<slots.length;i++){
      const grp = batchGroups[i]; const dk = slots[i];
      setGenProg({current:i+1,total:slots.length,label:`Post ${i+1}/${slots.length}…`});
      let subject="",caption="";
      try{const r=await analyzeImageAndGenerate(grp.images[0].url||null,null,batchAcc,"",voices,hashtagBank,mandatoryHashtags,mentions);subject=r.subject||"";caption=r.caption||"";}catch{}
      const mediaItems = grp.images.map(img=>({name:img.name,url:img.url,fileType:img.fileType,fileName:img.name,fileData:null,driveUrl:""}));
      const ex = np[dk]||[]; ex.push({account:batchAcc,type:grp.type,subject,caption,credits:"",mediaItems,status:"Brouillon"}); np[dk]=ex;
    }
    setPosts(np); setGenerating(false); setGenProg({current:0,total:0,label:""}); setBatchGroups([]); setBatchSel([]); setBatchMode(false); setBatchSub("all");
    alert(`✅ ${slots.length} post(s) généré(s) !`);
  };

  if (batchMode) return (
    <div style={{ ...cardStyle,padding:20,marginTop:16 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <div><div style={{ fontSize:17,fontWeight:700,color:C.text,fontFamily:F }}>Génération batch</div><div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,marginTop:2 }}>Sélectionne les images, groupe-les, puis génère</div></div>
        <button onClick={()=>{setBatchMode(false);setBatchGroups([]);setBatchSel([]);setBatchSub("all");}} style={{ padding:"7px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surfaceSecondary,color:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F }}>Annuler</button>
      </div>
      <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:12,flexWrap:"wrap",padding:14,borderRadius:12,background:C.surfaceSecondary,border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>Compte :</div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>{accounts.map(a=><button key={a.id} onClick={()=>{setBatchAcc(a.id);setBatchSub("all");}} style={{ ...pillBtn(batchAcc===a.id,a.color),fontSize:12,padding:"5px 14px" }}>{a.id}</button>)}</div>
        <div style={{ marginLeft:"auto",fontSize:12,color:C.textSecondary,fontFamily:F }}>📅 {MONTHS_FR[month]} {year}</div>
      </div>
      {(subfolders[batchAcc]||[]).length>0&&(
        <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",paddingLeft:8,borderLeft:`3px solid ${accounts.find(a=>a.id===batchAcc)?.color||C.border}` }}>
          <button onClick={()=>setBatchSub("all")} style={{ padding:"3px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:batchSub==="all"?C.text:"transparent",color:batchSub==="all"?"#fff":C.textSecondary,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:500 }}>Tous</button>
          {(subfolders[batchAcc]||[]).map(sf=><button key={sf} onClick={()=>setBatchSub(sf)} style={{ padding:"3px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:batchSub===sf?C.text:"transparent",color:batchSub===sf?"#fff":C.textSecondary,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:500 }}>{sf}</button>)}
        </div>
      )}
      <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 300px" }}>
          <div style={{ fontSize:12,fontWeight:600,color:C.textSecondary,fontFamily:F,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5 }}>1. Sélectionne les images</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle,marginBottom:10,fontSize:12 }}/>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:6,maxHeight:400,overflowY:"auto",padding:2 }}>
            {library.filter(x=>!x.account||x.account===batchAcc).filter(x=>batchSub==="all"?true:x.subfolder===batchSub).filter(x=>(x.name||"").toLowerCase().includes(search.toLowerCase())).map(item=>{
              const isSel = batchSel.find(x=>x.id===item.id); const inGrp = batchGroups.some(g=>g.images.find(x=>x.id===item.id));
              return (
                <div key={item.id} onClick={()=>!inGrp&&toggleBatchSel(item)} style={{ borderRadius:8,overflow:"hidden",border:`2px solid ${isSel?C.blue:inGrp?C.green:C.border}`,position:"relative",cursor:inGrp?"default":"pointer",opacity:inGrp?.5:1,transition:"border-color .15s" }}>
                  {item.fileType?.startsWith("image/")?<img src={item.url} style={{ width:"100%",aspectRatio:"1",objectFit:"cover" }}/>:<div style={{ width:"100%",aspectRatio:"1",background:`${C.blue}10`,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:20 }}>🎬</span></div>}
                  {(isSel||inGrp)&&<div style={{ position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:isSel?C.blue:C.green,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontSize:11,fontWeight:700 }}>✓</span></div>}
                </div>
              );
            })}
          </div>
          {batchSel.length>0&&<button onClick={addGroup} style={{ width:"100%",marginTop:10,padding:"10px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>＋ Créer un groupe avec {batchSel.length} image{batchSel.length>1?"s":""}{batchSel.length>1?" → Carrousel":" → Photo"}</button>}
        </div>
        <div style={{ flex:"1 1 280px" }}>
          <div style={{ fontSize:12,fontWeight:600,color:C.textSecondary,fontFamily:F,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5 }}>2. Groupes ({batchGroups.length} post{batchGroups.length!==1?"s":""})</div>
          {batchGroups.length===0&&<div style={{ padding:30,textAlign:"center",color:C.textTertiary,fontSize:13,fontFamily:F,border:`2px dashed ${C.border}`,borderRadius:12 }}>Sélectionne des images à gauche</div>}
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {batchGroups.map((grp,gi)=>(
              <div key={grp.id} style={{ borderRadius:12,border:`1px solid ${C.border}`,background:C.surface,overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.surfaceSecondary,borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:12,fontWeight:600,color:C.text,fontFamily:F }}>Post {gi+1}</span>
                  <div style={{ display:"flex",gap:4,marginLeft:"auto" }}>
                    {["Photo","Carrousel","Reel"].map(t=><button key={t} onClick={()=>setGrpType(grp.id,t)} style={{ padding:"2px 8px",borderRadius:6,border:`1px solid ${grp.type===t?C.blue:C.border}`,background:grp.type===t?C.blue:"transparent",color:grp.type===t?"#fff":C.textSecondary,cursor:"pointer",fontSize:10,fontFamily:F,fontWeight:600 }}>{t}</button>)}
                    <button onClick={()=>rmGroup(grp.id)} style={{ padding:"2px 6px",borderRadius:6,border:"none",background:"none",color:C.textTertiary,cursor:"pointer",fontSize:14 }}>×</button>
                  </div>
                </div>
                <div style={{ display:"flex",gap:4,padding:8,flexWrap:"wrap" }}>{grp.images.map(img=><img key={img.id} src={img.url} style={{ width:48,height:48,borderRadius:6,objectFit:"cover" }}/>)}</div>
              </div>
            ))}
          </div>
          {batchGroups.length>0&&(
            <button onClick={runBatch} disabled={generating} style={{ width:"100%",marginTop:12,padding:"12px",borderRadius:10,border:"none",background:generating?C.surfaceSecondary:`linear-gradient(135deg,${C.indigo},${C.blue})`,color:generating?C.textSecondary:"#fff",cursor:generating?"default":"pointer",fontSize:14,fontFamily:F,fontWeight:700,boxShadow:generating?"none":`0 3px 14px ${C.blue}44` }}>
              {generating?`✨ ${genProg.label}`:`✨ Générer ${batchGroups.length} post${batchGroups.length>1?"s":""} avec l'IA`}
            </button>
          )}
          {generating&&genProg.total>0&&(
            <div style={{ marginTop:10 }}>
              <div style={{ height:5,borderRadius:3,background:C.border,overflow:"hidden" }}><div style={{ height:"100%",width:`${(genProg.current/genProg.total)*100}%`,background:C.blue,borderRadius:3,transition:"width .4s" }}/></div>
              <div style={{ fontSize:11,color:C.textSecondary,fontFamily:F,marginTop:4,textAlign:"center" }}>{genProg.current}/{genProg.total} posts générés</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ ...cardStyle,padding:20,marginTop:16 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10 }}>
        <div style={{ fontSize:12,fontWeight:600,color:C.textSecondary,letterSpacing:0.5,textTransform:"uppercase",fontFamily:F }}>Librairie — {filtered.length} fichier{filtered.length!==1?"s":""}</div>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>{setBulkMode(b=>!b);setBulkSel([]);}} style={{ padding:"8px 16px",borderRadius:10,border:`1px solid ${bulkMode?C.orange:C.border}`,background:bulkMode?`${C.orange}15`:"transparent",color:bulkMode?C.orange:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>
            {bulkMode?`✓ ${bulkSel.length} sélectionné${bulkSel.length>1?"s":""}` :"☑ Sélection multiple"}
          </button>
          <button onClick={()=>setBatchMode(true)} style={{ ...btnPrimary(), fontSize:12, padding:"7px 14px" }}>
            ✨ Batch
          </button>
        </div>
      </div>

      {bulkMode&&bulkSel.length>0&&(
        <div style={{ padding:14,borderRadius:12,background:`${C.orange}10`,border:`1px solid ${C.orange}44`,marginBottom:14 }}>
          <div style={{ fontSize:12,fontWeight:600,color:C.orange,fontFamily:F,marginBottom:10 }}>{bulkSel.length} image{bulkSel.length>1?"s":""} sélectionnée{bulkSel.length>1?"s":""} — Modifier les tags</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:10,color:C.textTertiary,fontFamily:F,marginBottom:4 }}>Établissement</div>
              <select value={bulkAcc} onChange={e=>setBulkAcc(e.target.value)} style={{ ...selectStyle,fontSize:12 }}>
                <option value="all">— Aucun —</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.id} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize:10,color:C.textTertiary,fontFamily:F,marginBottom:4 }}>Sous-dossier</div>
              <select value={bulkSub} onChange={e=>setBulkSub(e.target.value)} style={{ ...selectStyle,fontSize:12 }}>
                <option value="all">— Racine —</option>
                {(bulkAcc!=="all"?subfolders[bulkAcc]||[]:accounts.flatMap(a=>subfolders[a.id]||[])).filter((v,i,a)=>a.indexOf(v)===i).map(sf=><option key={sf} value={sf}>{sf}</option>)}
              </select>
            </div>
            <button onClick={applyBulk} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:C.orange,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>Appliquer</button>
            <button onClick={()=>{setBulkSel([]);setBulkMode(false);}} style={{ padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:13,fontFamily:F }}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ display:"flex",gap:6,marginBottom:10,flexWrap:"wrap" }}>
        <button onClick={()=>{setSelAcc("all");setSelSub("all");}} style={{ ...pillBtn(selAcc==="all"),fontSize:12 }}>Tous ({countFor("all")})</button>
        {accounts.map(a=><button key={a.id} onClick={()=>{setSelAcc(a.id);setSelSub("all");}} style={{ ...pillBtn(selAcc===a.id,a.color),fontSize:12 }}>{a.id} ({countFor(a.id)})</button>)}
      </div>
      {selAcc!=="all"&&curSubs.length>0&&(
        <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",paddingLeft:8,borderLeft:`3px solid ${accounts.find(a=>a.id===selAcc)?.color||C.border}` }}>
          <button onClick={()=>setSelSub("all")} style={{ padding:"3px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:selSub==="all"?C.text:"transparent",color:selSub==="all"?"#fff":C.textSecondary,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:500 }}>Tous</button>
          {curSubs.map(sf=><button key={sf} onClick={()=>setSelSub(sf)} style={{ padding:"3px 12px",borderRadius:20,border:`1px solid ${C.border}`,background:selSub===sf?C.text:"transparent",color:selSub===sf?"#fff":C.textSecondary,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:500 }}>{sf}</button>)}
        </div>
      )}

      <div style={{ padding:14,borderRadius:12,background:C.surfaceSecondary,border:`1px solid ${C.border}`,marginBottom:14 }}>
        <div style={{ fontSize:11,fontWeight:600,color:C.textSecondary,fontFamily:F,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10 }}>Uploader des images</div>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>Compte :</span>
            <select value={upAcc} onChange={e=>{setUpAcc(e.target.value);setUpSub("all");}} style={{ ...selectStyle,fontSize:12 }}>{accounts.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}</select>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:12,color:C.textSecondary,fontFamily:F }}>Dossier :</span>
            <select value={upSub} onChange={e=>setUpSub(e.target.value)} style={{ ...selectStyle,fontSize:12 }}>
              <option value="all">— Racine —</option>
              {(subfolders[upAcc]||[]).map(sf=><option key={sf} value={sf}>{sf}</option>)}
            </select>
          </div>
        </div>
        {showNewSf?(
          <div style={{ display:"flex",gap:8,marginBottom:10 }}>
            <input value={newSfName} onChange={e=>setNewSfName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSf()} placeholder="Nom du sous-dossier" style={{ ...inputStyle,flex:1,fontSize:12 }} autoFocus/>
            <button onClick={addSf} style={{ padding:"7px 14px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:600 }}>Créer</button>
            <button onClick={()=>{setShowNewSf(false);setNewSfName("");}} style={{ padding:"7px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.textSecondary,cursor:"pointer",fontSize:12,fontFamily:F }}>Annuler</button>
          </div>
        ):<button onClick={()=>setShowNewSf(true)} style={{ fontSize:11,color:C.blue,background:"none",border:"none",cursor:"pointer",fontFamily:F,fontWeight:500,marginBottom:10,padding:0 }}>+ Créer un sous-dossier pour {upAcc}</button>}
        {(subfolders[upAcc]||[]).length>0&&<div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>{(subfolders[upAcc]||[]).map(sf=><div key={sf} style={{ display:"flex",alignItems:"center",gap:4,padding:"2px 8px 2px 10px",borderRadius:20,background:C.surface,border:`1px solid ${C.border}`,fontSize:11,fontFamily:F,color:C.textSecondary }}>{sf}<span onClick={()=>rmSf(upAcc,sf)} style={{ cursor:"pointer",fontSize:13,color:C.textTertiary,lineHeight:1 }} onMouseEnter={e=>e.target.style.color=C.red} onMouseLeave={e=>e.target.style.color=C.textTertiary}>×</span></div>)}</div>}
      </div>

      <div onClick={()=>!uploading&&fileInputRef.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.blue;}} onDragLeave={e=>{e.currentTarget.style.borderColor=C.border;}} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.border;handleUpload(Array.from(e.dataTransfer.files));}}
        style={{ border:`2px dashed ${C.border}`,borderRadius:12,padding:"20px",textAlign:"center",cursor:uploading?"default":"pointer",background:C.surfaceSecondary,marginBottom:16,transition:"all .2s" }}>
        {uploading?(
          <div>
            <div style={{ fontSize:13,color:C.text,fontFamily:F,marginBottom:8 }}>Upload en cours... {progress}%</div>
            <div style={{ height:5,borderRadius:3,background:C.border,overflow:"hidden",maxWidth:300,margin:"0 auto" }}><div style={{ height:"100%",width:`${progress}%`,background:C.blue,borderRadius:3,transition:"width .3s" }}/></div>
          </div>
        ):(
          <><div style={{ fontSize:22,marginBottom:4 }}>📁</div><div style={{ fontSize:13,color:C.text,fontFamily:F,fontWeight:500 }}>Cliquer ou glisser-déposer → <strong>{upAcc}</strong>{upSub!=="all"?` / ${upSub}`:""}</div><div style={{ fontSize:11,color:C.textSecondary,fontFamily:F,marginTop:2 }}>JPG, PNG, WEBP, GIF, MP4</div></>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={e=>{handleUpload(Array.from(e.target.files));e.target.value="";}}/>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher par nom..." style={{ ...inputStyle,marginBottom:16 }}/>
      {filtered.length===0&&<div style={{ textAlign:"center",color:C.textTertiary,padding:40,fontSize:13,fontFamily:F }}>Aucune image{selAcc!=="all"?` pour ${selAcc}`:""}</div>}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10 }}>
        {filtered.map(item=>{
          const acc = accounts.find(a=>a.id===item.account);
          const isBulkSel = bulkSel.find(x=>x.id===item.id);
          return (
            <div key={item.id} onClick={()=>bulkMode&&toggleBulk(item)}
              style={{ borderRadius:10,overflow:"hidden",border:`2px solid ${isBulkSel?C.orange:C.border}`,background:isBulkSel?`${C.orange}08`:C.surfaceSecondary,position:"relative",cursor:bulkMode?"pointer":"default",transition:"border-color .15s" }}>
              {isBulkSel&&<div style={{ position:"absolute",top:6,left:6,width:22,height:22,borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2 }}><span style={{ color:"#fff",fontSize:12,fontWeight:700 }}>✓</span></div>}
              {item.fileType?.startsWith("image/")?
                <img src={item.url} alt={item.name} onClick={()=>!bulkMode&&setLightbox(item)} style={{ width:"100%",aspectRatio:"1",objectFit:"cover",cursor:"pointer",display:"block" }}/>:
                <div style={{ width:"100%",aspectRatio:"1",background:`${C.blue}10`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }} onClick={()=>!bulkMode&&setLightbox(item)}><span style={{ fontSize:28 }}>🎬</span></div>}
              <div style={{ padding:"5px 6px",background:C.surface,borderTop:`1px solid ${C.border}` }}>
                <div style={{ fontSize:9,color:C.textTertiary,fontFamily:F,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{item.name}</div>
                <div style={{ display:"flex",gap:4,marginTop:2,flexWrap:"wrap" }}>
                  {acc&&<div style={{ fontSize:9,fontWeight:700,color:acc.color,fontFamily:F }}>{acc.id}</div>}
                  {item.subfolder&&<div style={{ fontSize:9,color:C.textTertiary,fontFamily:F }}>/ {item.subfolder}</div>}
                </div>
              </div>
              {!bulkMode&&<button onClick={()=>handleDelete(item)} style={{ position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",border:"none",background:"rgba(0,0,0,.5)",color:"#fff",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>}
            </div>
          );
        })}
      </div>

      {lightbox&&(
        <div onClick={()=>setLightbox(null)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"relative",maxWidth:"90vw" }}>
            <img src={lightbox.url} style={{ maxWidth:"85vw",maxHeight:"80vh",objectFit:"contain",borderRadius:10,display:"block" }}/>
            <div style={{ marginTop:8,textAlign:"center",color:"#fff",fontSize:12,fontFamily:F }}>{lightbox.name}</div>
            <button onClick={()=>setLightbox(null)} style={{ position:"absolute",top:-14,right:-14,width:28,height:28,borderRadius:"50%",border:"none",background:"#fff",color:C.text,cursor:"pointer",fontSize:15,fontWeight:700 }}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
