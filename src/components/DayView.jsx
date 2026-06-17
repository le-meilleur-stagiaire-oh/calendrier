import { useState, useContext } from "react";
import { AccountsContext } from "../lib/defaults.js";
import { C, F, btnPrimary } from "../lib/tokens.jsx";
import { MONTHS_FR, DAYS_FULL } from "../lib/dates.js";
import { generateCaption } from "../lib/ai.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import PostEditor from "./PostEditor.jsx";

export default function DayView({ year, month, day, dateKey, dayName, posts, setPosts, onClose }) {
  const isMobile = useIsMobile();
  const { accounts, voices, hashtagBank, mandatoryHashtags, mentions } = useContext(AccountsContext);
  const [generatingKey, setGeneratingKey] = useState(null);

  const handleGen = async (index) => {
    const post = posts[dateKey]?.[index]; if(!post?.subject||!post?.account) return;
    setGeneratingKey(index);
    const caption = await generateCaption(post.subject, post.account, post.credits||"", voices, hashtagBank, mandatoryHashtags, mentions);
    setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp[index]={...dp[index],caption};u[dateKey]=dp;return u;});
    setGeneratingKey(null);
  };

  const addPost = () => setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp.push({account:"",type:"",subject:"",caption:"",credits:"",mediaItems:[],status:"Brouillon"});u[dateKey]=dp;return u;});
  const updatePost = (index,field,value) => setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp[index]={...dp[index],[field]:value};u[dateKey]=dp;return u;});
  const deletePost = (index) => setPosts(prev=>{const u={...prev};const dp=[...(u[dateKey]||[])];dp.splice(index,1);if(dp.length===0)delete u[dateKey];else u[dateKey]=dp;return u;});
  const dupPost = (index,targetDate,targetAccount) => {const post=posts[dateKey]?.[index];if(!post)return;setPosts(prev=>{const u={...prev};const dp=[...(u[targetDate]||[])];dp.push({...post,account:targetAccount,status:"Brouillon"});u[targetDate]=dp;return u;});};
  const dayPosts = posts[dateKey]||[];

  if (isMobile) return (
    <div style={{ position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
      <div onClick={onClose} style={{ flex:1,background:"rgba(0,0,0,0.3)" }}/>
      <div style={{ background:C.surface,borderRadius:"20px 20px 0 0",maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 30px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex",justifyContent:"center",padding:"10px 0 0" }}>
          <div style={{ width:36,height:4,borderRadius:2,background:C.border }}/>
        </div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px 12px" }}>
          <h3 style={{ fontFamily:F,fontSize:15,fontWeight:700,color:C.text,margin:0 }}>{dayName} {day} {MONTHS_FR[month]}</h3>
          <button onClick={addPost} style={{ padding:"8px 16px",borderRadius:10,border:"none",background:C.blue,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:F,fontWeight:600 }}>+ Ajouter</button>
        </div>
        <div style={{ overflowY:"auto",flex:1,padding:"0 12px 32px" }}>
          {dayPosts.length===0&&<div style={{ padding:30,textAlign:"center",color:C.textTertiary,fontSize:14,fontFamily:F }}>Aucun post — tapez "+ Ajouter"</div>}
          {dayPosts.map((post,idx)=>(
            <PostEditor key={idx} post={post} dateKey={dateKey} index={idx} generating={generatingKey===idx}
              onUpdate={(field,val)=>{updatePost(idx,field,val);if(field==="account"&&posts[dateKey]?.[idx]?.subject&&val)setTimeout(()=>handleGen(idx),300);}}
              onDelete={()=>deletePost(idx)} onGenerate={()=>handleGen(idx)}
              onDuplicate={(targetDate,targetAccount)=>dupPost(idx,targetDate,targetAccount)}/>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:20,marginTop:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h3 style={{ fontFamily:F,fontSize:16,fontWeight:700,color:C.text,margin:0,letterSpacing:-0.2 }}>{dayName} {day} {MONTHS_FR[month]} {year}</h3>
        <button onClick={addPost} style={{ ...btnPrimary(), fontSize:12, padding:"7px 16px" }}>+ Ajouter</button>
      </div>
      {dayPosts.length===0&&<div style={{ padding:30,textAlign:"center",color:C.textTertiary,fontSize:13,fontFamily:F }}>Aucun post prévu — cliquez sur "+ Ajouter"</div>}
      {dayPosts.map((post,idx)=>(
        <PostEditor key={idx} post={post} dateKey={dateKey} index={idx} generating={generatingKey===idx}
          onUpdate={(field,val)=>{updatePost(idx,field,val);if(field==="account"&&posts[dateKey]?.[idx]?.subject&&val)setTimeout(()=>handleGen(idx),300);}}
          onDelete={()=>deletePost(idx)} onGenerate={()=>handleGen(idx)}
          onDuplicate={(targetDate,targetAccount)=>dupPost(idx,targetDate,targetAccount)}/>
      ))}
    </div>
  );
}
