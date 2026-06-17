import { useState } from "react";
import { C, F, FH, selectStyle, cardStyle, btnPrimary } from "../lib/tokens.js";
import { MONTHS_FR, STATUSES, STATUS_COLORS, getEffectiveStatus } from "../lib/dates.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

export default function Publication({ posts, setPosts, config }) {
  const isMobile = useIsMobile();
  const accounts = config?.accounts || [];
  const [filterAcc, setFilterAcc] = useState("all");
  const [copiedKey, setCopiedKey] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const allPosts = Object.entries(posts)
    .flatMap(([dateKey, dayPosts]) =>
      dayPosts.map((p, idx) => {
        const eff = getEffectiveStatus(p, dateKey);
        const acc = accounts.find(a => a.id === p.account);
        const dow = new Date(dateKey).getDay(); const isWe = dow === 0 || dow === 6;
        const bt = config?.bestTimes?.[p.account];
        const time = bt ? (isWe ? bt.weekend : bt.weekday) : "";
        const firstImg = (p.mediaItems || []).find(m =>
          (m.fileData && m.fileData.startsWith("data:image")) ||
          (m.url && (m.fileType?.startsWith("image/") || m.url.match(/\.(jpg|jpeg|png|webp|gif)/i)))
        );
        const thumbSrc = firstImg?.fileData || firstImg?.url || null;
        const imageUrl = firstImg?.url || null;
        return { ...p, dateKey, idx, acc, time, thumbSrc, imageUrl, effectiveStatus: eff, key: `${dateKey}-${p.account}-${idx}` };
      })
    )
    .filter(p => p.effectiveStatus === "Manqué" || p.effectiveStatus === "Programmé");

  const filtered = filterAcc === "all" ? allPosts : allPosts.filter(p => p.account === filterAcc);

  const sorted = [
    ...filtered.filter(p => p.effectiveStatus === "Manqué").sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    ...filtered.filter(p => p.effectiveStatus === "Programmé").sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
  ];

  const copyCaption = (key, caption) => { navigator.clipboard.writeText(caption || ""); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 2000); };

  const updateStatus = (dateKey, idx, status) => {
    setPosts(prev => { const u = { ...prev }; const dp = [...(u[dateKey] || [])]; dp[idx] = { ...dp[idx], status }; u[dateKey] = dp; return u; });
  };

  const downloadImage = (url, filename) => {
    const a = document.createElement("a"); a.href = url; a.download = filename; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
  };

  const downloadAll = async () => {
    if (zipping) return;
    const toDownload = sorted.filter(p => p.imageUrl);
    if (toDownload.length === 0) { alert("Aucune image avec URL disponible dans cette sélection."); return; }
    setZipping(true);
    try {
      for (const p of toDownload) { downloadImage(p.imageUrl, `${p.dateKey}_${p.account}_${p.type || "post"}.jpg`); await new Promise(r => setTimeout(r, 400)); }
    } catch (e) { console.error(e); }
    setZipping(false);
  };

  const copyAllCaptions = () => {
    const text = sorted.filter(p => p.caption).map(p => {
      const [y, m, d] = p.dateKey.split("-");
      return `── ${parseInt(d)} ${MONTHS_FR[Number(m) - 1]} ${y} | ${p.account} | ${p.type || ""} | ${p.time || ""} ──\n${p.caption}\n`;
    }).join("\n");
    navigator.clipboard.writeText(text);
    alert("Toutes les captions copiées !");
  };

  const countFor = id => id === "all" ? allPosts.length : allPosts.filter(p => p.account === id).length;
  const manqueCount = filtered.filter(p => p.effectiveStatus === "Manqué").length;
  const programmeCount = filtered.filter(p => p.effectiveStatus === "Programmé").length;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ ...cardStyle, padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FH }}>📤 Publication</div>
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              {manqueCount > 0 && <span style={{ fontSize: 12, color: STATUS_COLORS["Manqué"], fontFamily: F, fontWeight: 600 }}>● {manqueCount} manqué{manqueCount > 1 ? "s" : ""}</span>}
              {programmeCount > 0 && <span style={{ fontSize: 12, color: STATUS_COLORS["Programmé"], fontFamily: F, fontWeight: 600 }}>● {programmeCount} programmé{programmeCount > 1 ? "s" : ""}</span>}
              {manqueCount === 0 && programmeCount === 0 && <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F }}>Aucun post à afficher</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={copyAllCaptions} style={{ ...btnPrimary(C.indigo), fontSize: 12, padding: "8px 14px" }}>Copier toutes les captions</button>
            <button onClick={downloadAll} disabled={zipping} style={{ ...btnPrimary(C.green), fontSize: 12, padding: "8px 14px", opacity: zipping ? 0.6 : 1 }}>
              {zipping ? "Téléchargement..." : "⬇ Télécharger toutes les images"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <button onClick={() => setFilterAcc("all")} style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${C.blue}`, background: filterAcc === "all" ? C.blue : "transparent", color: filterAcc === "all" ? "#fff" : C.blue, cursor: "pointer", fontSize: 11, fontFamily: F, fontWeight: 600 }}>Tous ({countFor("all")})</button>
          {accounts.map(a => (
            <button key={a.id} onClick={() => setFilterAcc(a.id)} style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${a.color}`, background: filterAcc === a.id ? a.color : "transparent", color: filterAcc === a.id ? "#fff" : a.color, cursor: "pointer", fontSize: 11, fontFamily: F, fontWeight: 600 }}>
              {a.id} ({countFor(a.id)})
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 && (
        <div style={{ ...cardStyle, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, color: C.textSecondary, fontFamily: F }}>Rien à faire — aucun post manqué ni programmé</div>
        </div>
      )}

      {manqueCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 14px", borderRadius: 10, background: `${STATUS_COLORS["Manqué"]}10`, border: `1px solid ${STATUS_COLORS["Manqué"]}30` }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS["Manqué"], display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS["Manqué"], fontFamily: F }}>Posts manqués — à traiter en priorité</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((p, pi) => {
          const [y, m, d] = p.dateKey.split("-");
          const dow = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
          const isCopied = copiedKey === p.key;
          const statusColor = STATUS_COLORS[p.effectiveStatus] || C.textTertiary;
          const isManque = p.effectiveStatus === "Manqué";

          const isProgrammeHeader = !isManque && (pi === 0 || sorted[pi - 1]?.effectiveStatus === "Manqué");

          return (
            <>
              {isProgrammeHeader && (
                <div key={`header-prog-${pi}`} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: manqueCount > 0 ? 12 : 0, marginBottom: 4, padding: "8px 14px", borderRadius: 10, background: `${STATUS_COLORS["Programmé"]}10`, border: `1px solid ${STATUS_COLORS["Programmé"]}30` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS["Programmé"], display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS["Programmé"], fontFamily: F }}>Posts programmés</span>
                </div>
              )}
              <div key={p.key} style={{ background: C.surface, borderRadius: 16, border: `1px solid ${isManque ? `${STATUS_COLORS["Manqué"]}40` : C.border}`, overflow: "hidden", boxShadow: isManque ? `0 0 0 1px ${STATUS_COLORS["Manqué"]}20` : "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: isManque ? `${STATUS_COLORS["Manqué"]}08` : p.acc ? `${p.acc.color}10` : C.surfaceSecondary, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: p.acc?.color || C.text, fontFamily: F }}>{p.account}</div>
                  <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: F }}>{dow} {parseInt(d)} {MONTHS_FR[Number(m) - 1]} {y}</div>
                  {p.time && <div style={{ fontSize: 11, color: C.blue, fontFamily: F, background: `${C.blue}12`, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>🕐 {p.time}</div>}
                  <div style={{ fontSize: 11, color: "#fff", fontFamily: F, background: `${p.acc?.color || "#999"}`, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{p.type || "—"}</div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
                    <select value={p.status || "Brouillon"} onChange={e => updateStatus(p.dateKey, p.idx, e.target.value)}
                      style={{ ...selectStyle, fontSize: 11, padding: "2px 6px", color: statusColor, fontWeight: 600, borderColor: statusColor }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 0, flexDirection: isMobile ? "column" : "row" }}>
                  <div style={{ width: isMobile ? "100%" : 160, height: isMobile ? 200 : 160, flexShrink: 0, background: C.surfaceSecondary, borderRight: isMobile ? "none" : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : "none", position: "relative", cursor: p.thumbSrc ? "pointer" : "default" }}
                    onClick={() => p.thumbSrc && setLightbox(p)}>
                    {p.thumbSrc ? (
                      <img src={p.thumbSrc} style={{ width: "100%", height: isMobile ? 200 : 160, objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: isMobile ? 200 : 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontSize: 28 }}>📷</div>
                        <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F, marginTop: 4 }}>Pas d'image</div>
                      </div>
                    )}
                    {p.thumbSrc && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.35)"; e.currentTarget.querySelector("span").style.opacity = "1"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0)"; e.currentTarget.querySelector("span").style.opacity = "0"; }}>
                        <span style={{ opacity: 0, fontSize: 20, transition: "opacity .2s" }}>🔍</span>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                    {p.subject && <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: F }}>{p.subject}</div>}
                    {p.caption ? (
                      <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, lineHeight: 1.6, whiteSpace: "pre-wrap", flex: 1, maxHeight: 120, overflow: "hidden", position: "relative" }}>
                        {p.caption}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 30, background: `linear-gradient(transparent, ${C.surface})` }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F, fontStyle: "italic", flex: 1 }}>Pas de caption</div>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                      {p.caption && (
                        <button onClick={() => copyCaption(p.key, p.caption)}
                          style={{ padding: "7px 16px", borderRadius: 10, border: "none", background: isCopied ? C.green : C.blue, color: "#fff", cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 600, transition: "background .2s", flexShrink: 0 }}>
                          {isCopied ? "✓ Copié !" : "📋 Copier la caption"}
                        </button>
                      )}
                      {p.imageUrl && (
                        <button onClick={() => downloadImage(p.imageUrl, `${p.dateKey}_${p.account}_${p.type || "post"}.jpg`)}
                          style={{ padding: "7px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceSecondary, color: C.text, cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 500, flexShrink: 0 }}>
                          ⬇ Télécharger l'image
                        </button>
                      )}
                      {p.imageUrl && (
                        <a href={p.imageUrl} target="_blank" rel="noopener noreferrer"
                          style={{ padding: "7px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.textSecondary, cursor: "pointer", fontSize: 12, fontFamily: F, fontWeight: 500, textDecoration: "none", flexShrink: 0 }}>
                          Ouvrir ↗
                        </a>
                      )}
                    </div>

                    {(p.mediaItems || []).filter(m => m.url || (m.fileData && (m.fileData.startsWith("data:image") || m.fileData.startsWith("data:video")))).length > 1 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        {(p.mediaItems || []).filter(m => m.url || (m.fileData && (m.fileData.startsWith("data:image") || m.fileData.startsWith("data:video")))).map((m, mi) => {
                          const src = m.fileData || m.url || "";
                          const isVid = m.fileType?.startsWith("video/") || src.match(/\.(mp4|mov|webm)/i) || src.startsWith("data:video");
                          return (
                            <div key={mi} style={{ position: "relative" }}>
                              {isVid ? (
                                <div onClick={() => setLightbox({ ...p, thumbSrc: null, imageUrl: src, _videoSrc: src })}
                                  style={{ width: 48, height: 48, borderRadius: 8, background: "#1a1a1a", border: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 18 }}>▶</span>
                                </div>
                              ) : (
                                <img src={src} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: `1px solid ${C.border}`, cursor: "pointer" }}
                                  onClick={() => setLightbox({ ...p, thumbSrc: src, imageUrl: m.url })} />
                              )}
                              {m.url && (
                                <button onClick={() => downloadImage(m.url, `${p.dateKey}_${p.account}_${mi + 1}${isVid ? ".mp4" : ".jpg"}`)}
                                  style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", border: "none", background: C.blue, color: "#fff", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>⬇</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })}
      </div>

      {lightbox && (() => {
        const videoSrc = lightbox._videoSrc || (lightbox.thumbSrc?.match(/\.(mp4|mov|webm)/i) ? lightbox.thumbSrc : null);
        const isVideo = !!videoSrc;
        const dlUrl = lightbox.imageUrl || lightbox._videoSrc;
        const ext = isVideo ? ".mp4" : ".jpg";
        return (
          <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              {isVideo
                ? <video src={videoSrc} controls autoPlay muted loop playsInline style={{ maxWidth: "85vw", maxHeight: "78vh", borderRadius: 10, display: "block", background: "#000" }} />
                : <img src={lightbox.thumbSrc} style={{ maxWidth: "85vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 10, display: "block" }} />
              }
              <div style={{ display: "flex", gap: 10 }}>
                {dlUrl && (
                  <button onClick={() => downloadImage(dlUrl, `${lightbox.dateKey}_${lightbox.account}${ext}`)}
                    style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: C.text, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F, fontWeight: 600 }}>⬇ Télécharger</button>
                )}
                {dlUrl && (
                  <a href={dlUrl} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid rgba(255,255,255,0.25)`, background: "transparent", color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F, textDecoration: "none" }}>Ouvrir ↗</a>
                )}
              </div>
              <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: -14, right: -14, width: 30, height: 30, borderRadius: "50%", border: "none", background: "#fff", color: C.text, cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
