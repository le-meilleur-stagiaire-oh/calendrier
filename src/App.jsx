import { useState, useEffect, useRef } from "react";
import { db, auth, doc, getDoc, setDoc, collection, getDocs, query, orderBy, onAuthStateChanged, signOut } from "./lib/firebase.js";
import { AccountsContext, LibraryContext, DEFAULT_ACCOUNTS, DEFAULT_VOICES, DEFAULT_HASHTAG_BANK, DEFAULT_MANDATORY, DEFAULT_BEST_TIMES, DEFAULT_MENTION, DEFAULT_SUBFOLDERS, DEFAULT_SUBJECT_BANK } from "./lib/defaults.js";
import { C, F, FH, navBtn } from "./lib/tokens.jsx";
import { MONTHS_FR, DAYS_FULL, fmtDate, getDaysInMonth, getWeeksOfMonth } from "./lib/dates.js";
import { useIsMobile } from "./hooks/useIsMobile.js";

import LoginPage      from "./components/LoginPage.jsx";
import Settings       from "./components/Settings.jsx";
import OpenClosedPanel from "./components/OpenClosedPanel.jsx";
import Stats          from "./components/Stats.jsx";
import MonthlyRecap   from "./components/MonthlyRecap.jsx";
import ExportButton   from "./components/ExportButton.jsx";
import CalendarMonth  from "./components/CalendarMonth.jsx";
import DayView        from "./components/DayView.jsx";
import FeedPreview    from "./components/FeedPreview.jsx";
import Archive        from "./components/Archive.jsx";
import Library        from "./components/Library.jsx";
import Publication    from "./components/Publication.jsx";
import Guide          from "./components/Guide.jsx";

export default function App() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [posts, setPosts] = useState({});
  const [accountSettings, setAccountSettings] = useState(
    Object.fromEntries(DEFAULT_ACCOUNTS.map(a=>[a.id,{isOpen:true,postsPerWeek:3,closingDate:"",openingDate:""}]))
  );

  const [user, setUser]               = useState(null);
  const [authChecked, setAuthChecked] = useState(!auth);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthChecked(true); });
    return unsub;
  }, []);

  const handleLogout = async () => { try { await signOut(auth); } catch {} };

  const [config, setConfig] = useState({
    accounts:          DEFAULT_ACCOUNTS,
    voices:            DEFAULT_VOICES,
    hashtagBank:       DEFAULT_HASHTAG_BANK,
    mandatoryHashtags: DEFAULT_MANDATORY,
    bestTimes:         DEFAULT_BEST_TIMES,
    mentions:          DEFAULT_MENTION,
    subjectBank:       DEFAULT_SUBJECT_BANK,
  });
  const [subfolders, setSubfolders] = useState(DEFAULT_SUBFOLDERS);
  const [library,    setLibrary]    = useState([]);
  const [loaded,     setLoaded]     = useState(false);
  const skipSync = useRef(false);

  const openStatus = Object.fromEntries(config.accounts.map(a=>[a.id,accountSettings[a.id]?.isOpen!==false]));
  const [selectedDay,    setSelectedDay]    = useState(null);
  const [view,           setView]           = useState("calendar");
  const [showSettings,   setShowSettings]   = useState(false);

  useEffect(() => {
    if (!db) {
      try {
        const s = localStorage.getItem("editorial-cal-v3");
        if (s) {
          const d = JSON.parse(s);
          if (d.posts)           setPosts(d.posts);
          if (d.accountSettings) setAccountSettings(d.accountSettings);
          if (d.config)          setConfig(d.config);
          if (d.subfolders)      setSubfolders(d.subfolders);
        }
      } catch {}
      setLoaded(true);
      return;
    }
    (async () => {
      const keys    = [["posts","posts"],["accountSettings","accountSettings"],["config","config"],["subfolders","subfolders"]];
      const setters = {posts:setPosts,accountSettings:setAccountSettings,config:setConfig,subfolders:setSubfolders};
      for (const [docId, key] of keys) {
        try {
          const snap = await getDoc(doc(db,"calendar",docId));
          if (snap.exists() && snap.data().data) {
            skipSync.current = true;
            setters[key](snap.data().data);
            setTimeout(() => { skipSync.current = false; }, 100);
          }
        } catch (e) { console.error(e); }
      }
      try {
        const q    = query(collection(db,"library"), orderBy("uploadedAt","desc"));
        const snap = await getDocs(q);
        setLibrary(snap.docs.map(d=>({id:d.id,...d.data()})));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || skipSync.current) return;
    if (db) {
      setDoc(doc(db,"calendar","posts"),           {data:posts});
      setDoc(doc(db,"calendar","accountSettings"), {data:accountSettings});
      setDoc(doc(db,"calendar","config"),          {data:config});
      setDoc(doc(db,"calendar","subfolders"),      {data:subfolders});
    } else {
      try { localStorage.setItem("editorial-cal-v3", JSON.stringify({posts,accountSettings,config,subfolders})); } catch {}
    }
  }, [posts, accountSettings, config, subfolders, loaded]);

  const monthPrefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthPosts  = Object.fromEntries(Object.entries(posts).filter(([k])=>k.startsWith(monthPrefix)));
  const prevMonth   = () => { if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth   = () => { if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); setSelectedDay(null); };

  const generatePlanning = () => {
    const np = {...posts};
    config.accounts.forEach(a => {
      const s   = accountSettings[a.id] || {};
      const ppw = Math.max(1, parseInt(s.postsPerWeek)||3);
      const mix = s.typeMix || {Photo:1,Carrousel:1,Reel:1};
      const mixTotal = (mix.Photo||0)+(mix.Carrousel||0)+(mix.Reel||0);
      const typeSeq = [];
      ["Reel","Carrousel","Photo"].forEach(t=>{ for(let i=0;i<(mix[t]||0);i++) typeSeq.push(t); });
      const remainder = ppw - mixTotal;
      if (remainder>0) for(let i=0;i<remainder;i++) typeSeq.push("Photo");
      const shuffled = [...typeSeq].sort(()=>Math.random()-0.5);
      let ti = 0;
      const fom  = new Date(year,month,1);
      const dow1 = fom.getDay(); const mo = dow1===0?-6:1-dow1;
      const fm   = new Date(year,month,1+mo);
      const weeks = Array.from({length:4},(_,wi)=>Array.from({length:7},(_,di)=>{const d=new Date(fm);d.setDate(fm.getDate()+wi*7+di);return d;}));
      weeks.forEach(wd => {
        const dim = wd.filter(d=>d.getMonth()===month&&d.getFullYear()===year).length;
        const pfw = Math.round((dim/7)*ppw); if(pfw===0) return;
        const md  = wd.filter(d=>d.getMonth()===month&&d.getFullYear()===year);
        const ppd = Math.floor(pfw/md.length); const extra = pfw%md.length;
        const ei  = new Set();
        if (extra>0) {
          const idx = Array.from({length:md.length},(_,i)=>i);
          const seed = a.id.charCodeAt(0)+md[0].getDate();
          idx.sort((x,y)=>((x*1664525+seed)%md.length)-((y*1664525+seed)%md.length));
          idx.slice(0,extra).forEach(i=>ei.add(i));
        }
        md.forEach((date,di) => {
          const n = ppd+(ei.has(di)?1:0); if(n===0) return;
          const dk = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
          const ex = np[dk]||[]; const already = ex.filter(p=>p.account===a.id).length;
          for(let k=0;k<n-already;k++){
            const type = shuffled.length>0 ? shuffled[ti%shuffled.length] : "Photo";
            ex.push({account:a.id,type,subject:"",caption:"",credits:"",mediaItems:[],status:"Brouillon"});
            ti++;
          }
          np[dk] = ex;
        });
      });
    });
    setPosts(np);
  };

  const clearPlanning = () => {
    const np = {...posts};
    Object.keys(np).forEach(k=>{if(k.startsWith(monthPrefix))delete np[k];});
    setPosts(np);
  };

  const isMobile = useIsMobile();

  const tabs = [
    {id:"calendar",   label:"Calendrier", icon:"📅"},
    {id:"library",    label:"Librairie",  icon:"📁"},
    {id:"publication",label:"Publication",icon:"📤"},
    {id:"recap",      label:"Récap",      icon:"📊"},
    {id:"more",       label:"Plus",       icon:"⋯"},
  ];
  const moreTabs = [
    {id:"preview",  label:"Preview"},
    {id:"archive",  label:"Archive"},
    {id:"guide",    label:"Guide"},
    {id:"settings", label:"Paramètres"},
  ];
  const [showMore, setShowMore] = useState(false);
  const handleTabClick = (id) => { if(id==="more"){setShowMore(s=>!s);return;} setView(id);setShowMore(false); };

  const mainContent = (
    <>
      {showSettings&&(
        <div onClick={()=>setShowSettings(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9000,display:"flex",alignItems:"flex-start",justifyContent:"flex-start",padding:isMobile?"60px 12px":"80px 20px" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface,borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",width:isMobile?"100%":"min(580px,95vw)",maxHeight:"82vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:16,fontWeight:700,color:C.text,fontFamily:F }}>⚙️ Paramètres</span>
              <button onClick={()=>setShowSettings(false)} style={{ background:C.surfaceSecondary,border:"none",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:16,color:C.textSecondary,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
            </div>
            <div style={{ padding:20 }}><Settings config={config} setConfig={setConfig}/></div>
          </div>
        </div>
      )}

      {showMore&&isMobile&&(
        <div onClick={()=>setShowMore(false)} style={{ position:"fixed",inset:0,zIndex:8000 }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"absolute",bottom:70,right:12,background:C.surface,borderRadius:14,boxShadow:"0 4px 24px rgba(0,0,0,0.15)",padding:8,minWidth:160,border:`1px solid ${C.border}` }}>
            {moreTabs.map(t=>(
              <button key={t.id} onClick={()=>{setView(t.id);setShowMore(false);}}
                style={{ display:"block",width:"100%",padding:"11px 16px",border:"none",background:view===t.id?`${C.blue}12`:"transparent",color:view===t.id?C.blue:C.text,cursor:"pointer",fontSize:14,fontFamily:F,fontWeight:view===t.id?600:400,borderRadius:8,textAlign:"left" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(view==="calendar"||view==="recap")&&(
        <div style={{ display:"flex",alignItems:"center",gap:16,justifyContent:"center",marginBottom:16 }}>
          <button onClick={prevMonth} style={{ ...navBtn, fontSize:20, color:C.textSecondary }}>‹</button>
          <h2 style={{ fontFamily:FH,fontSize:isMobile?17:21,fontWeight:700,color:C.text,letterSpacing:0,margin:0,minWidth:isMobile?160:220,textAlign:"center" }}>{MONTHS_FR[month]} <span style={{ color:C.gold }}>{year}</span></h2>
          <button onClick={nextMonth} style={{ ...navBtn, fontSize:20, color:C.textSecondary }}>›</button>
        </div>
      )}

      {view==="calendar"&&(<>
        <OpenClosedPanel accountSettings={accountSettings} setAccountSettings={setAccountSettings} month={month} onGenerate={generatePlanning} onClear={clearPlanning}/>
        <Stats posts={monthPosts}/>
        <CalendarMonth year={year} month={month} posts={posts}
          onDayClick={d=>setSelectedDay(p=>p===d?null:d)} selectedDay={selectedDay}
          onDeletePost={(dk,i)=>{setPosts(p=>{const u={...p};const dp=[...(u[dk]||[])];dp.splice(i,1);if(dp.length===0)delete u[dk];else u[dk]=dp;return u;});}}
          onDropPost={(from,fi,to)=>{setPosts(p=>{const u={...p};const fa=[...(u[from]||[])];const[mv]=fa.splice(fi,1);if(fa.length===0)delete u[from];else u[from]=fa;const ta=[...(u[to]||[])];ta.push(mv);u[to]=ta;return u;});}}/>
        {selectedDay&&(()=>{
          const dk = fmtDate(year,month,selectedDay);
          const dw = new Date(year,month,selectedDay).getDay();
          const mb = dw===0?6:dw-1;
          return <DayView year={year} month={month} day={selectedDay} dateKey={dk} dayName={DAYS_FULL[mb]} posts={posts} setPosts={setPosts} onClose={()=>setSelectedDay(null)}/>;
        })()}
      </>)}

      {view==="recap"&&(<>
        <OpenClosedPanel accountSettings={accountSettings} setAccountSettings={setAccountSettings} month={month}/>
        <MonthlyRecap year={year} month={month} posts={posts} openStatus={openStatus}/>
        <div style={{ marginTop:16,textAlign:"center" }}><ExportButton year={year} month={month} posts={posts}/></div>
      </>)}

      {view==="preview"    && <FeedPreview posts={posts}/>}
      {view==="archive"    && <Archive posts={posts}/>}
      {view==="library"    && <Library library={library} setLibrary={setLibrary} posts={posts} setPosts={setPosts} year={year} month={month} accountSettings={accountSettings} subfolders={subfolders} setSubfolders={setSubfolders}/>}
      {view==="publication"&& <Publication posts={posts} setPosts={setPosts} config={config}/>}
      {view==="guide"      && <Guide/>}
      {view==="settings"   && <Settings config={config} setConfig={setConfig}/>}
    </>
  );

  if (isMobile) return (
    <AccountsContext.Provider value={config}>
    <LibraryContext.Provider value={{ library,setLibrary }}>
      {!authChecked&&<div style={{ minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ fontSize:13,color:C.textSecondary,fontFamily:F }}>Chargement…</div></div>}
      {authChecked&&!user&&auth&&<LoginPage/>}
      {authChecked&&(user||!auth)&&(
        <div style={{ fontFamily:F,background:C.bg,minHeight:"100vh",paddingBottom:70 }}>
          <div style={{ position:"sticky",top:0,zIndex:100,background:C.elevated,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,padding:"10px 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <button onClick={()=>setShowSettings(true)} style={{ width:34,height:34,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 2px rgba(26,35,50,0.06)" }}>⚙️</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
                <span style={{ fontSize:12 }}>😉</span>
                <span style={{ fontSize:14,fontWeight:700,color:C.text,fontFamily:FH,letterSpacing:0 }}>Winking 247</span>
              </div>
              <div style={{ fontSize:9,color:C.gold,fontFamily:F,letterSpacing:2,marginTop:1,fontWeight:600,textTransform:"uppercase" }}>{config.accounts.map(a=>a.id).join(" · ")}</div>
            </div>
            {user
              ?<button onClick={handleLogout} style={{ width:34,height:34,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",color:C.textSecondary }}>↩</button>
              :<div style={{ width:34 }}/>
            }
          </div>
          <div style={{ padding:"16px 12px" }}>{mainContent}</div>
          <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:C.elevated,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
            {tabs.map(t=>{
              const isActive = t.id==="more" ? (showMore||moreTabs.some(mt=>mt.id===view)) : view===t.id;
              return (
                <button key={t.id} onClick={()=>handleTabClick(t.id)}
                  style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,padding:"8px 4px 10px",border:"none",background:"transparent",cursor:"pointer",color:isActive?C.gold:C.textTertiary,fontFamily:F,transition:"color .15s" }}>
                  <span style={{ fontSize:20,lineHeight:1 }}>{t.icon}</span>
                  <span style={{ fontSize:9,fontWeight:isActive?600:400,letterSpacing:0.2 }}>{t.label}</span>
                  {isActive&&<div style={{ width:16,height:2,borderRadius:1,background:C.gold,position:"absolute",bottom:6 }}/>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </LibraryContext.Provider>
    </AccountsContext.Provider>
  );

  return (
    <AccountsContext.Provider value={config}>
    <LibraryContext.Provider value={{ library,setLibrary }}>
      {!authChecked&&(
        <div style={{ minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F }}>Chargement…</div>
        </div>
      )}
      {authChecked&&!user&&auth&&<LoginPage/>}
      {authChecked&&(user||!auth)&&(
        <div style={{ fontFamily:F,background:C.bg,minHeight:"100vh",padding:"32px 24px" }}>
          <div style={{ textAlign:"center",marginBottom:36,position:"relative" }}>
            <button onClick={()=>setShowSettings(true)} title="Paramètres"
              style={{ position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:36,height:36,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.surface,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(26,35,50,0.07)" }}>
              ⚙️
            </button>
            <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginBottom:10,padding:"4px 14px",borderRadius:20,background:C.surface,border:`1px solid ${C.borderStrong}`,boxShadow:"0 1px 3px rgba(26,35,50,0.06)" }}>
              <span style={{ fontSize:12 }}>😉</span>
              <span style={{ fontSize:10,fontWeight:700,color:C.gold,letterSpacing:2,textTransform:"uppercase",fontFamily:F }}>Winking 247</span>
            </div>
            <h1 style={{ fontSize:30,fontWeight:700,color:C.text,margin:0,letterSpacing:-0.3,lineHeight:1.1,fontFamily:FH }}>Calendrier Éditorial</h1>
            <div style={{ fontSize:11,color:C.textTertiary,marginTop:8,letterSpacing:2.5,fontWeight:500,fontFamily:F }}>
              {config.accounts.map(a=>a.id).join("  ·  ")}
            </div>
            {user&&(
              <div style={{ position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontSize:11,color:C.textTertiary,fontFamily:F }}>{user.email}</span>
                <button onClick={handleLogout}
                  style={{ padding:"5px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.textSecondary,cursor:"pointer",fontSize:12,fontFamily:F,fontWeight:500 }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.red;e.currentTarget.style.color=C.red;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSecondary;}}>
                  Déconnexion
                </button>
              </div>
            )}
          </div>

          <div style={{ display:"flex",justifyContent:"center",marginBottom:30 }}>
            <div style={{ display:"inline-flex",background:C.surface,borderRadius:14,padding:4,gap:1,border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(26,35,50,0.07)" }}>
              {[...tabs.filter(t=>t.id!=="more"),...moreTabs].map(t=>(
                <button key={t.id} onClick={()=>setView(t.id)}
                  style={{ padding:"7px 18px",borderRadius:10,border:"none",background:view===t.id?C.bg:"transparent",color:view===t.id?C.text:C.textTertiary,cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:view===t.id?600:400,transition:"all .15s",boxShadow:view===t.id?`0 1px 3px rgba(26,35,50,0.09), 0 0 0 1px ${C.border}`:"none",letterSpacing:0.1,position:"relative" }}>
                  {t.label}
                  {view===t.id&&<div style={{ position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:16,height:2,borderRadius:1,background:C.gold }}/>}
                </button>
              ))}
            </div>
          </div>

          {mainContent}
        </div>
      )}
    </LibraryContext.Provider>
    </AccountsContext.Provider>
  );
}
