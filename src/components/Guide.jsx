import { useState } from "react";
import { C, F, FH, cardStyle } from "../lib/tokens.jsx";

export default function Guide() {
  const [open, setOpen] = useState(null);
  const sections = [
    { id:"start",emoji:"🚀",title:"Par où commencer ?",color:C.blue,steps:[
      {label:"1. Configure les établissements",desc:"Clique sur l'icône ⚙️ en haut à gauche pour accéder aux Paramètres. Définis pour chaque compte le statut ouvert/fermé, le nombre de posts par semaine, et les dates indicatives."},
      {label:"2. Upload tes images dans la Librairie",desc:"Va dans l'onglet Librairie et uploade tes photos par établissement et sous-dossier. Glisse-dépose plusieurs images à la fois."},
      {label:"3. Génère le planning",desc:"Dans le Calendrier, clique sur \"Générer le planning\". Le système répartit automatiquement les posts selon le rythme défini, en tenant compte des semaines coupées."},
      {label:"4. Complète les fiches",desc:"Clique sur un jour pour ouvrir le panneau. Édite chaque fiche : choisis l'image, génère la caption avec l'IA, modifie le sujet."},
      {label:"5. Publie depuis l'onglet Publication",desc:"L'onglet Publication affiche tous tes posts avec image + caption côte à côte. Change les statuts, copie les captions, télécharge les images."},
    ]},
    { id:"calendar",emoji:"📅",title:"Calendrier",color:"#5856D6",steps:[
      {label:"Naviguer entre les mois",desc:"Utilise les flèches ‹ › de part et d'autre du nom du mois."},
      {label:"Cliquer sur un jour",desc:"Un clic ouvre le panneau de la journée. Recliquer ferme le panneau."},
      {label:"Déplacer un post (drag & drop)",desc:"Attrape une fiche et glisse-la vers une autre case. La case cible se surligne en bleu."},
      {label:"Miniature dans le calendrier",desc:"Si un post a une image, une miniature apparaît dans la case pour une vision rapide du contenu."},
      {label:"Générer le planning",desc:"Répartit automatiquement les posts en respectant le rythme posts/semaine et la proratisation des semaines coupées."},
      {label:"Effacer le planning",desc:"Supprime tous les posts du mois en cours. Les autres mois ne sont pas affectés."},
    ]},
    { id:"posts",emoji:"✏️",title:"Fiches post",color:"#FF9500",steps:[
      {label:"Créer un post",desc:"Dans le panneau d'un jour, clique sur \"+ Ajouter\". Choisis le compte, le type et le statut."},
      {label:"Analyser l'image avec l'IA ✨",desc:"Dès qu'une image et un compte sont sélectionnés, le bouton \"✨ Analyser l'image\" apparaît. L'IA analyse la photo et génère sujet + caption adaptés à l'établissement."},
      {label:"Générer / Regénérer la caption",desc:"Si tu remplis le sujet manuellement, la caption se génère automatiquement. Tu peux la regénérer à tout moment."},
      {label:"Copier la caption",desc:"Le bouton \"Copier\" copie tout le texte dans le presse-papier."},
      {label:"Dupliquer un post",desc:"Copie un post vers une autre date avec possibilité de changer le compte."},
      {label:"Statuts",desc:"6 statuts : 🟠 Brouillon → 🔵 En cours → 🟢 Prêt → 🟩 Programmé → ⚫ Publié. Les posts d'une date passée non publiés deviennent automatiquement 🔴 Manqué pour alerter l'équipe."},
    ]},
    { id:"publication",emoji:"📤",title:"Publication",color:C.green,steps:[
      {label:"Vue principale",desc:"Affiche uniquement les posts 🔴 Manqué (en priorité, triés du plus récent) et 🟩 Programmé (à venir, du plus proche). Les autres statuts n'y apparaissent pas."},
      {label:"Filtres",desc:"Filtre par compte (APG, CSM...) pour n'afficher que les posts d'un établissement."},
      {label:"Copier une caption",desc:"Le bouton \"📋 Copier la caption\" copie le texte en un clic, prêt à coller dans Meta Business Suite ou Later."},
      {label:"Télécharger une image",desc:"Le bouton \"⬇ Télécharger l'image\" télécharge directement le fichier depuis Cloudinary."},
      {label:"Télécharger toutes les images",desc:"Le bouton en haut télécharge toutes les images de la sélection en cours, une par une avec des noms explicites (date_compte_type.jpg)."},
      {label:"Copier toutes les captions",desc:"Copie toutes les captions de la sélection dans le presse-papier, séparées par post."},
      {label:"Lightbox",desc:"Clique sur une image pour l'agrandir. Tu peux la télécharger ou l'ouvrir dans un nouvel onglet depuis la lightbox."},
      {label:"Carrousels",desc:"Les posts avec plusieurs images affichent toutes les miniatures en bas avec un bouton de téléchargement individuel pour chacune."},
    ]},
    { id:"library",emoji:"📁",title:"Librairie",color:C.green,steps:[
      {label:"Upload avec sous-dossiers",desc:"Sélectionne le compte et le sous-dossier avant d'uploader. Les images sont organisées dans Cloudinary : oh_library/APG/Chambres/photo.jpg"},
      {label:"Créer un sous-dossier",desc:"Clique sur \"+ Créer un nouveau sous-dossier\" dans la zone d'upload. Il est sauvegardé pour tous les utilisateurs."},
      {label:"Filtrer par compte et sous-dossier",desc:"Les onglets en haut filtrent par compte. Une seconde rangée apparaît pour filtrer par sous-dossier — cliquer sur un sous-dossier n'affiche que ses fichiers."},
      {label:"Sélection multiple depuis la librairie",desc:"Quand tu choisis des médias depuis la librairie dans une fiche post, tu peux en sélectionner plusieurs à la fois. Valide avec le bouton 'Valider (N)' pour les ajouter tous d'un coup."},
      {label:"Filtre sous-dossier en batch",desc:"En mode Batch, après avoir sélectionné le compte, une rangée de sous-dossiers apparaît pour filtrer les images. Clique sur un sous-dossier pour n'afficher que ses fichiers."},
      {label:"Génération batch ✨",desc:"Sélectionne des images, groupe-les, et génère des posts complets avec l'IA en une fois. Les posts sont placés automatiquement dans le calendrier."},
    ]},
    { id:"hashtags",emoji:"#️⃣",title:"Hashtags",color:"#FF9500",steps:[
      {label:"Banque par compte",desc:"Chaque établissement a sa propre banque de hashtags. Sélectionne le compte avec les boutons en haut."},
      {label:"Exactement 5 hashtags par caption",desc:"Les hashtags obligatoires sont inclus en premier, complétés par des hashtags aléatoires de la banque jusqu'à 5 au total."},
      {label:"Modifier les hashtags",desc:"En mode édition (bouton ✏️), tu peux ajouter ou supprimer des hashtags de la banque et des hashtags obligatoires."},
    ]},
  ];

  return (
    <div style={{ marginTop:16 }}>
      <div style={{ ...cardStyle,padding:28,marginBottom:14,background:`linear-gradient(135deg, ${C.blue}06, ${C.indigo}06)` }}>
        <div style={{ fontSize:24,fontWeight:700,color:C.text,fontFamily:FH,marginBottom:6,letterSpacing:0 }}>📖 Guide d'utilisation</div>
        <div style={{ fontSize:13,color:C.textSecondary,fontFamily:F,lineHeight:1.6,maxWidth:580 }}>
          Tout ce qu'il faut savoir pour utiliser le Calendrier Éditorial efficacement.
        </div>
        <div style={{ display:"flex",gap:6,marginTop:14,flexWrap:"wrap" }}>
          {sections.map(s=>(
            <button key={s.id} onClick={()=>setOpen(open===s.id?null:s.id)}
              style={{ padding:"5px 14px",borderRadius:20,border:`1.5px solid ${s.color}`,background:open===s.id?s.color:"transparent",color:open===s.id?"#fff":s.color,cursor:"pointer",fontSize:11,fontFamily:F,fontWeight:600,transition:"all .15s" }}>
              {s.emoji} {s.title}
            </button>
          ))}
        </div>
      </div>
      {sections.map(s=>(
        <div key={s.id} style={{ ...cardStyle,marginBottom:8 }}>
          <button onClick={()=>setOpen(open===s.id?null:s.id)}
            style={{ width:"100%",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,background:"none",border:"none",cursor:"pointer",textAlign:"left" }}>
            <div style={{ width:38,height:38,borderRadius:10,background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{s.emoji}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14,fontWeight:700,color:C.text,fontFamily:F }}>{s.title}</div>
              <div style={{ fontSize:11,color:C.textSecondary,fontFamily:F,marginTop:1 }}>{s.steps.length} point{s.steps.length>1?"s":""}</div>
            </div>
            <div style={{ fontSize:16,color:C.textTertiary,transform:open===s.id?"rotate(90deg)":"rotate(0)",transition:"transform .2s" }}>›</div>
          </button>
          {open===s.id&&(
            <div style={{ padding:"0 20px 18px",borderTop:`1px solid ${C.border}` }}>
              {s.steps.map((step,i)=>(
                <div key={i} style={{ display:"flex",gap:14,padding:"11px 0",borderBottom:i<s.steps.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ width:26,height:26,borderRadius:"50%",background:`${s.color}18`,border:`1.5px solid ${s.color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                    <span style={{ fontSize:10,fontWeight:700,color:s.color,fontFamily:F }}>{i+1}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:C.text,fontFamily:F,marginBottom:3 }}>{step.label}</div>
                    <div style={{ fontSize:12,color:C.textSecondary,fontFamily:F,lineHeight:1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
