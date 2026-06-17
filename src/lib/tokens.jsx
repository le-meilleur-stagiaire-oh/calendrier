export const F  = "'Inter','Helvetica Neue',Helvetica,-apple-system,sans-serif";
export const FH = "'Playfair Display',Georgia,'Times New Roman',serif";

export const C = {
  bg:              "#F8F6F1",
  surface:         "#FFFFFF",
  surfaceSecondary:"#F2F0EB",
  surfaceHover:    "#E9E5DC",
  elevated:        "rgba(255,255,255,0.96)",
  border:          "rgba(26,35,50,0.08)",
  borderStrong:    "rgba(26,35,50,0.15)",
  text:            "#1A2332",
  textSecondary:   "#4B5568",
  textTertiary:    "#9CA3AF",
  gold:    "#B8975A",
  blue:    "#2B6CB0",
  green:   "#276749",
  red:     "#C53030",
  orange:  "#C05621",
  indigo:  "#553C9A",
  teal:    "#285E61",
};

export const selectStyle = {
  padding:"7px 11px", borderRadius:8, border:`1px solid ${C.border}`,
  fontSize:13, fontFamily:F, color:C.text, background:C.surface,
  cursor:"pointer", outline:"none", appearance:"none", WebkitAppearance:"none",
  boxShadow:"0 1px 2px rgba(0,0,0,0.04)",
};

export const inputStyle = {
  width:"100%", padding:"9px 12px", borderRadius:8, border:`1px solid ${C.border}`,
  fontSize:14, fontFamily:F, color:C.text, background:C.surface, outline:"none",
  boxSizing:"border-box", transition:"border-color .15s, box-shadow .15s",
  boxShadow:"0 1px 2px rgba(0,0,0,0.04)",
};

export const labelStyle = {
  fontSize:10, fontWeight:600, color:C.textTertiary, letterSpacing:0.9,
  textTransform:"uppercase", fontFamily:F, display:"block", marginBottom:5,
};

export const navBtn = {
  width:34, height:34, borderRadius:"50%", border:`1px solid ${C.border}`,
  background:C.surface, cursor:"pointer", fontSize:17, color:C.text,
  display:"flex", alignItems:"center", justifyContent:"center",
  boxShadow:"0 1px 3px rgba(0,0,0,0.07)", transition:"all .15s",
};

export const cardStyle = {
  background:C.surface, borderRadius:20, border:`1px solid ${C.border}`,
  overflow:"hidden",
  boxShadow:"0 1px 2px rgba(26,35,50,0.04), 0 4px 20px rgba(26,35,50,0.06)",
};

export const pillBtn = (active, color) => ({
  padding:"5px 14px", borderRadius:20,
  border:`1.5px solid ${color||C.gold}`,
  background: active ? (color||C.gold) : "transparent",
  color: active ? "#fff" : (color||C.gold),
  cursor:"pointer", fontSize:11, fontFamily:F, fontWeight:600,
  transition:"all .18s", letterSpacing:0.3,
});

export const btnPrimary = (color) => ({
  padding:"9px 20px", borderRadius:10, border:"none",
  background: color || C.text, color:"#fff",
  cursor:"pointer", fontSize:13, fontFamily:F, fontWeight:600,
  letterSpacing:0.2, transition:"opacity .15s",
  boxShadow:`0 1px 4px rgba(26,35,50,0.18)`,
});

export const btnSecondary = {
  padding:"9px 16px", borderRadius:10,
  border:`1px solid ${C.border}`, background:C.surface,
  color:C.textSecondary, cursor:"pointer", fontSize:13, fontFamily:F,
  fontWeight:500, transition:"all .15s",
};

export function Badge({ text, bg, fg, border: bd }) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 8px", borderRadius:6,
      background:bg||"transparent", color:fg||C.textSecondary,
      fontSize:10, fontWeight:600, fontFamily:F,
      border:bd?`1px solid ${bd}`:"none", letterSpacing:0.4,
    }}>
      {text}
    </span>
  );
}
