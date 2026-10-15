// Design « bureau d'études » (essai) : s'active appareil par appareil, désactivé par défaut.
// C'est une couche posée PAR-DESSUS l'affichage existant (couleurs du logo, police, angles droits) plus un nouveau bandeau (EnteteRuban.js).
// Aucune logique de l'application n'est touchée : désactivé, rien ne change.
//   - interrupteur : menu de la personne connectée (administrateur) ;
//   - ou adresse : ?design=bureau pour l'activer, ?design=ancien pour revenir à l'affichage habituel (mémorisé sur l'appareil).
import {CSS_EMOJI} from "./emojiMono";
const CLE_DESIGN="pmv_design";

const pageComplete=()=>typeof window!=="undefined"
  &&!/^\/(poste|stock)(\/|$)/.test(window.location.pathname)
  &&!/[?&]app=stock(&|$)/.test(window.location.search);
const choixAdresse=()=>{const m=/[?&]design=(bureau|ancien)(&|$)/.exec(window.location.search);return m?m[1]:null;};

// évalué une fois au chargement : changer de design recharge la page, tout reste donc cohérent pendant la session
export const DESIGN_BUREAU=(()=>{
  if(!pageComplete())return false;
  try{
    const a=choixAdresse();
    if(a)localStorage.setItem(CLE_DESIGN,a==="bureau"?"bureau":"");
    return localStorage.getItem(CLE_DESIGN)==="bureau";
  }catch(e){return choixAdresse()==="bureau";}
})();

export function basculerDesign(actif){
  try{localStorage.setItem(CLE_DESIGN,actif?"bureau":"");}catch(e){/* mémorisation impossible : l'adresse ?design= reste utilisable */}
  window.location.reload();
}

// ── Couleurs de l'application actuelle → teintes du logo PMV (violet #8E3584, vert #41A72A, gris métal #8F9497) ──
// Les styles de l'appli sont écrits en ligne (style="background: rgb(27, 79, 138)") : on les repère par leur valeur.
const TABLE_RGB=[
  ["27, 79, 138","var(--pmv-a)"],        // bleu principal (boutons, titres, bordures actives)
  ["238, 244, 255","var(--pmv-soft)"],   // fonds bleutés
  ["234, 241, 251","var(--pmv-soft)"],
  ["243, 246, 250","var(--pmv-bg2)"],
  ["214, 228, 247","var(--pmv-soft2)"],
  ["175, 198, 230","var(--pmv-soft2)"],
  ["245, 246, 248","var(--pmv-bg)"],    // fond de page
  ["248, 249, 250","var(--pmv-bg2)"],
  ["226, 230, 234","var(--pmv-bord)"],   // filets
  ["209, 213, 219","var(--pmv-bord2)"],
  ["107, 114, 128","var(--pmv-gris)"],   // texte secondaire
  ["26, 26, 46","var(--pmv-ink)"]        // texte
];
// mêmes correspondances pour les feuilles de style écrites en hexadécimal (pages Matériel et Stock)
const TABLE_HEX=[
  ["#1B4F8A","var(--pmv-a)"],["#EAF1FB","var(--pmv-soft)"],["#EEF4FF","var(--pmv-soft)"],["#AFC6E6","var(--pmv-soft2)"],["#D6E4F7","var(--pmv-soft2)"],
  ["#F3F6FA","var(--pmv-bg2)"],["#F5F6F8","var(--pmv-bg)"],["#E2E6EA","var(--pmv-bord)"],["#D1D5DB","var(--pmv-bord2)"],["#6B7280","var(--pmv-gris)"],["#1A1A2E","var(--pmv-ink)"]
];

function reglesCouleurs(){
  const B="body.design-bureau ";
  return TABLE_RGB.map(([rgb,v])=>{
    const c="rgb("+rgb+")";
    return B+'[style*="background: '+c+'"],'+B+'[style*="background-color: '+c+'"]{background-color:'+v+' !important}\n'
      +B+'[style*="; color: '+c+'"],'+B+'[style^="color: '+c+'"]{color:'+v+' !important}\n'
      +B+'[style*="solid '+c+'"]{border-color:'+v+' !important}';
  }).join("\n");
}

const CSS_THEME=CSS_EMOJI+`
body.design-bureau{--pmv-p:#5C2257;--pmv-a:#8E3584;--pmv-soft:#F4ECF3;--pmv-soft2:#E3D2E1;--pmv-vive:#52B83A;--pmv-bg:#EEEDF0;--pmv-bg2:#F6F5F8;--pmv-bord:#D6D3DB;--pmv-bord2:#C2BEC8;--pmv-gris:#625D69;--pmv-ink:#231F26;--pmv-acier:#A29FAA;--pmv-haut:52px;--pmv-cadre:1160px;background:var(--pmv-bg)}
@media (min-width:600px){body.design-bureau{--pmv-haut:60px}}
@media (min-width:1400px){body.design-bureau{--pmv-haut:64px}}
body.design-bureau,body.design-bureau *:not([style*="monospace"]){font-family:"PMV Emoji","IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif !important}
body.design-bureau select option{color:#231F26;background:#fff}
/* pages plus larges sur grand écran : listes et tableau de bord alignés sur le cadre du bandeau, fiches un peu plus larges */
body.design-bureau [style*="max-width: 900px"],body.design-bureau [style*="max-width: 1000px"]{max-width:1160px !important}
body.design-bureau [style*="max-width: 820px"],body.design-bureau [style*="max-width: 800px"]{max-width:980px !important}
body.design-bureau [style*="border-radius"],body.design-bureau .mat *,body.design-bureau .stk *{border-radius:2px !important}
body.design-bureau button,body.design-bureau input,body.design-bureau select,body.design-bureau textarea{border-radius:2px}
${reglesCouleurs()}
body.design-bureau [style*="position: sticky"][style*="background: rgb(27, 79, 138)"]{background-color:var(--pmv-p) !important}
/* bandeau : barre du haut + 10 onglets */
.pmvb-top{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:14px;box-sizing:border-box;height:var(--pmv-haut);padding:0 max(16px,calc((100% - var(--pmv-cadre)) / 2 + 16px));background:var(--pmv-p);color:#fff;border-bottom:3px solid var(--pmv-acier)}
.pmvb-logo{height:34px;width:auto;flex:none;cursor:pointer;display:block}
.pmvb-mot{font-weight:600;letter-spacing:.16em;font-size:12px;white-space:nowrap}
.pmvb-page{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;padding-left:14px;border-left:1px solid rgba(255,255,255,.35);opacity:.92}
@media (min-width:600px){.pmvb-logo{height:44px}.pmvb-mot{font-size:14px}.pmvb-page{font-size:15px}}
.pmvb-droite{margin-left:auto;display:flex;align-items:center;gap:8px;flex:none}
.pmvb-menu{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.4);color:#fff;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
.pmvb-rub{display:flex;align-items:stretch;background:#fff;border-bottom:1px solid var(--pmv-acier);padding:0 max(16px,calc((100% - var(--pmv-cadre)) / 2 + 16px))}
.pmvb-gr{min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--pmv-bord)}
.pmvb-gr:last-child{border-right:0}
.pmvb-cap{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--pmv-gris);padding:6px 10px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pmvb-ts{display:flex;flex:1}
.pmvb-t{position:relative;flex:1 1 0;min-width:0;min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px 6px 10px;background:none;border:0;cursor:pointer;font-size:12.5px;line-height:1.2;color:var(--pmv-gris);text-align:center}
.pmvb-t svg{width:22px;height:22px;color:var(--pmv-p);flex:none}
.pmvb-t.on{color:var(--pmv-p);font-weight:600;background:var(--pmv-soft);box-shadow:inset 0 -3px 0 var(--pmv-vive)}
.pmvb-t.on svg{color:var(--pmv-a)}
.pmvb-nb{position:absolute;top:5px;left:calc(50% + 9px);min-width:16px;height:16px;padding:0 4px;color:#fff;font-size:10px;font-weight:700;line-height:16px;text-align:center;background:#E8720C}
.pmvb-nb.bad{background:#D73A49}
.pmvb-rub.large .pmvb-t{min-height:68px;font-size:14px;gap:6px;padding:5px 6px 11px}
.pmvb-rub.large .pmvb-t svg{width:26px;height:26px}
.pmvb-rub.large .pmvb-cap{font-size:10px;padding:6px 12px 0}
.pmvb-rub.large .pmvb-nb{left:calc(50% + 10px);top:5px}
.pmvb-rub.moyen{padding:0}
.pmvb-rub.moyen .pmvb-cap{display:none}
.pmvb-rub.moyen .pmvb-t{font-size:11.5px;padding-top:8px}
.pmvb-rub.etroit{display:grid;padding:0}
.pmvb-rub.etroit .pmvb-gr,.pmvb-rub.etroit .pmvb-ts{display:contents}
.pmvb-rub.etroit .pmvb-cap{display:none}
.pmvb-rub.etroit .pmvb-t{min-height:58px;font-size:10.5px;padding:7px 2px;border-right:1px solid var(--pmv-bord);border-bottom:1px solid var(--pmv-bord)}
.pmvb-rub.etroit .pmvb-nb{left:calc(50% + 6px)}
@media (pointer:coarse){.pmvb-t{min-height:60px}.pmvb-menu{min-height:36px}}
`;

export function appliquerDesign(){
  if(!DESIGN_BUREAU||typeof document==="undefined")return;
  document.body.classList.add("design-bureau");
  if(!document.getElementById("pmv-theme-bureau")){
    const st=document.createElement("style");st.id="pmv-theme-bureau";st.textContent=CSS_THEME;document.head.appendChild(st);
    const lk=document.createElement("link");lk.rel="stylesheet";lk.href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";document.head.appendChild(lk);
  }
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content","#5C2257");
}

// Feuilles de style « à classes » (pages Matériel et Stock) : mêmes règles, mais chaque couleur de la table devient var(--pmv-…, ancienne couleur).
// L'ordre et la précision des règles ne changent pas ; si le design n'est pas actif, le texte est rendu tel quel.
export function habiller(css){
  if(!DESIGN_BUREAU)return css;
  let r=css;
  TABLE_HEX.forEach(([hex,v])=>{r=r.split(hex).join("var("+v.slice(4,-1)+","+hex+")").split(hex.toLowerCase()).join("var("+v.slice(4,-1)+","+hex+")");});
  return r;
}
