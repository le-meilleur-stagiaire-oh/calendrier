import { useState, useContext } from "react";
import { LibraryContext, AccountsContext } from "../lib/defaults.js";
import { C, F, inputStyle, pillBtn } from "../lib/tokens.jsx";

export default function LibraryPicker({ onSelect, onClose, accountHint, multiSelect = false }) {
  const { library } = useContext(LibraryContext);
  const { accounts } = useContext(AccountsContext);
  const [search, setSearch] = useState("");
  const [filterAcc, setFilterAcc] = useState(accountHint || "all");
  const [filterSub, setFilterSub] = useState("all");
  const [selected, setSelected] = useState([]);

  const curSubs = filterAcc !== "all"
    ? [...new Set(library.filter(x => x.account === filterAcc && x.subfolder).map(x => x.subfolder))]
    : [];

  const filtered = library
    .filter(x => filterAcc === "all" ? true : (x.account === filterAcc || !x.account))
    .filter(x => filterSub === "all" ? true : x.subfolder === filterSub)
    .filter(x => (x.name || "").toLowerCase().includes(search.toLowerCase()));

  const toggleItem = (item) => {
    setSelected(p => p.find(x => x.id === item.id) ? p.filter(x => x.id !== item.id) : [...p, item]);
  };

  const handleSingleClick = (item) => {
    if (multiSelect) { toggleItem(item); return; }
    onSelect(item);
    onClose();
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    onSelect(selected);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 16, padding: 20, width: "min(680px,95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: F }}>Choisir depuis la librairie</span>
            {multiSelect && <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F, marginLeft: 8 }}>Sélection multiple activée</span>}
          </div>
          <button onClick={onClose} style={{ background: C.surfaceSecondary, border: "none", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", color: C.textSecondary, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={() => { setFilterAcc("all"); setFilterSub("all"); }} style={{ ...pillBtn(filterAcc === "all"), fontSize: 11, padding: "4px 12px" }}>Tous</button>
          {accounts.map(a => (
            <button key={a.id} onClick={() => { setFilterAcc(a.id); setFilterSub("all"); }} style={{ ...pillBtn(filterAcc === a.id, a.color), fontSize: 11, padding: "4px 12px" }}>{a.id}</button>
          ))}
        </div>

        {curSubs.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap", paddingLeft: 8, borderLeft: `3px solid ${accounts.find(a => a.id === filterAcc)?.color || C.border}` }}>
            <button onClick={() => setFilterSub("all")} style={{ padding: "2px 10px", borderRadius: 20, border: `1px solid ${C.border}`, background: filterSub === "all" ? C.text : "transparent", color: filterSub === "all" ? "#fff" : C.textSecondary, cursor: "pointer", fontSize: 10, fontFamily: F, fontWeight: 500 }}>Tous</button>
            {curSubs.map(sf => (
              <button key={sf} onClick={() => setFilterSub(sf)} style={{ padding: "2px 10px", borderRadius: 20, border: `1px solid ${C.border}`, background: filterSub === sf ? C.text : "transparent", color: filterSub === sf ? "#fff" : C.textSecondary, cursor: "pointer", fontSize: 10, fontFamily: F, fontWeight: 500 }}>{sf}</button>
            ))}
          </div>
        )}

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ ...inputStyle, marginBottom: 12 }} />

        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && <div style={{ textAlign: "center", color: C.textTertiary, padding: 30, fontSize: 13, fontFamily: F }}>Aucun fichier trouvé</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 8 }}>
            {filtered.map(item => {
              const acc = accounts.find(a => a.id === item.account);
              const isSel = multiSelect && selected.find(x => x.id === item.id);
              return (
                <div key={item.id} onClick={() => handleSingleClick(item)}
                  style={{ borderRadius: 10, overflow: "hidden", border: `2px solid ${isSel ? C.blue : C.border}`, cursor: "pointer", background: isSel ? `${C.blue}08` : C.surfaceSecondary, transition: "border-color .15s,transform .12s", position: "relative" }}
                  onMouseEnter={e => { if (!isSel) { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.transform = "scale(1.02)"; } }}
                  onMouseLeave={e => { if (!isSel) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "scale(1)"; } }}>
                  {item.fileType?.startsWith("image/")
                    ? <img src={item.url} alt={item.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                    : <div style={{ width: "100%", aspectRatio: "1", background: `${C.blue}10`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 24 }}>🎬</span></div>
                  }
                  {isSel && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
                      <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                  <div style={{ padding: "4px 6px", background: C.surface }}>
                    <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {acc && <div style={{ fontSize: 9, fontWeight: 700, color: acc.color, fontFamily: F }}>{acc.id}</div>}
                      {item.subfolder && <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F }}>/ {item.subfolder}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {multiSelect && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F, flex: 1 }}>
              {selected.length === 0 ? "Aucune image sélectionnée" : `${selected.length} image${selected.length > 1 ? "s" : ""} sélectionnée${selected.length > 1 ? "s" : ""}`}
            </span>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.textSecondary, cursor: "pointer", fontSize: 12, fontFamily: F }}>
                Tout désélectionner
              </button>
            )}
            <button onClick={handleConfirm} disabled={selected.length === 0}
              style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: selected.length > 0 ? C.blue : C.border, color: "#fff", cursor: selected.length > 0 ? "pointer" : "default", fontSize: 13, fontFamily: F, fontWeight: 600 }}>
              Valider ({selected.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
