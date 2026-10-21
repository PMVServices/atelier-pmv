// Lecture des feuilles du classeur de stock Excel (STOCK_PMV_2026.xlsm) pour l'import du catalogue.
// Module sans React ni accès à la base : il se teste seul (Node). Stock.js s'en sert pour l'aperçu et l'import.

export const normEnt=s=>String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/\s+/g," ").replace(/\s*\?$/,"").trim();
export const txt=v=>v==null?"":String(v).replace(/\s+/g," ").trim();
export const nombre=v=>{
  if(v==null||v==="")return null;
  const n=typeof v==="number"?v:parseFloat(String(v).replace(/\s/g,"").replace(",",".").replace(/[^\d.\-]/g,""));
  return isNaN(n)?null:n;
};
export const entier=v=>{const n=nombre(v);return n==null?null:Math.round(n);};
export const dimNorm=s=>txt(s).replace(/\s*[xX×]\s*/g,"×");

// Feuilles « une ligne = un article » rangées en familles (demande du 21/10/2026). feuille : nom de la feuille sans accents ni majuscules ;
// ref : intitulés possibles de la colonne qui sert de référence ; dim : colonne de description (sinon la colonne « Dimensions ») ;
// sections : les lignes de titre (« Extérieur », « Presse étoupe »…) deviennent la description des lignes qui suivent.
// Pour ces feuilles, une ligne dont le stock, le stock mini ou le stock maxi est vide n'est PAS importée.
export const FAMILLES_FEUILLES=[
  {famille:"GV2",feuille:"gv2",ref:["reference"],dim:["ampere"]},
  {famille:"Circlips",feuille:"circlips",ref:["diametre"],sections:true},
  {famille:"BAB",feuille:"boite a bornes",ref:["nom produit"]},
  {famille:"PAB",feuille:"pab",ref:["reference fournisseurs"],dim:["type"]},
  {famille:"PE",feuille:"pe",ref:["reference"],sections:true},
  {famille:"Condos",feuille:"condos",ref:["reference"]},
  {famille:"Divers",feuille:"divers",ref:["designation"],sections:true},
];
export const profilFamille=nom=>FAMILLES_FEUILLES.find(p=>p.feuille===normEnt(nom))||null;

// Lit une feuille "catalogue" : la ligne d'en-tête est celle qui contient "Référence" (ou l'intitulé propre à la famille) ; les lignes de titre
// (ex. "62XX", sans autre valeur) et les lignes de total sont ignorées.
export function analyserFeuille(XLSX,wb,nom){
  const ws=wb.Sheets[nom];
  if(!ws)return {erreur:"Feuille introuvable."};
  const prof=profilFamille(nom);
  const entetesRef=prof?prof.ref:["reference"];
  const r0=ws["!ref"]?XLSX.utils.decode_range(ws["!ref"]).s.r:0; // pour retrouver le vrai numéro de ligne Excel
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:true});
  let hi=-1;
  for(let i=0;i<Math.min(rows.length,15);i++){
    if((rows[i]||[]).some(c=>entetesRef.includes(normEnt(c)))){hi=i;break;}
  }
  if(hi<0)return {erreur:"Colonne « "+(prof?prof.ref[0]:"Référence")+" » introuvable dans les 15 premières lignes de cette feuille."};
  const ent=rows[hi].map(normEnt);
  const col=p=>ent.findIndex(p);
  const C={ref:col(h=>entetesRef.includes(h)),mini:col(h=>h.startsWith("stock min")||h.startsWith("stock voulu boite")),maxi:col(h=>h.startsWith("stock max")),voulE:col(h=>h.startsWith("stock voulu etag")),reelB:col(h=>h.startsWith("stock boite")),reelE:col(h=>h.startsWith("stock reel")),empl:col(h=>h.startsWith("emplacement")),dim:col(prof&&prof.dim?(h=>prof.dim.includes(h)):(h=>h.startsWith("dimension")||h.startsWith("diametre"))),stock:col(h=>h==="stock"),prix:col(h=>h==="prix unitaire"),f1:col(h=>h==="fournisseur 1"),f2:col(h=>h==="fournisseur 2"),f3:col(h=>h==="fournisseur 3")};
  if(C.dim===C.ref)C.dim=-1; // la colonne « Diamètre » des circlips sert déjà de référence
  const cell=(r,i)=>i>=0?r[i]:null;
  // Feuille à deux stocks (garniture mécanique) : stock = boîte + étagère ; pas de mini : le "stock voulu" (boîte + étagère) est
  // le stock à avoir, donc mini = maxi = voulu (la référence est "à renouveler" dès qu'elle passe en dessous).
  const deuxStocks=C.voulE>=0||C.reelB>=0||C.reelE>=0;
  const lignes=[];const vides=[];let ignorees=0,arretLigne=null,section=null;
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i]||[];
    const reference=txt(cell(r,C.ref));
    if(!reference)continue;
    const numLigne=r0+i+1;
    if(arretLigne==null&&cle0(reference)==="SPECIALE")arretLigne=numLigne;
    let mini=entier(cell(r,C.mini)),maxi=entier(cell(r,C.maxi)),stock=entier(cell(r,C.stock));
    if(deuxStocks){
      const rb=entier(cell(r,C.reelB)),re=entier(cell(r,C.reelE)),ve=entier(cell(r,C.voulE));
      stock=(rb==null&&re==null)?null:(rb||0)+(re||0);
      const voulu=(mini==null&&ve==null)?null:(mini||0)+(ve||0);
      mini=voulu;maxi=voulu;
    }
    const l={ligne:numLigne,reference,dimensions:dimNorm(cell(r,C.dim))||null,emplacement:txt(cell(r,C.empl))||null,stock_mini:mini,stock_maxi:maxi,prix_unitaire:nombre(cell(r,C.prix)),fournisseur1:txt(cell(r,C.f1))||null,fournisseur2:txt(cell(r,C.f2))||null,fournisseur3:txt(cell(r,C.f3))||null,stock};
    const autres=[l.dimensions,l.emplacement,l.stock_mini,l.stock_maxi,l.prix_unitaire,l.stock].some(v=>v!=null&&v!=="");
    if(!autres){if(prof&&prof.sections)section=reference;ignorees++;continue;}
    if(prof){
      // famille : une ligne sans stock, sans mini ou sans maxi n'est pas importée
      const manque=[];if(stock==null)manque.push("stock");if(mini==null)manque.push("mini");if(maxi==null)manque.push("maxi");
      if(manque.length){vides.push({ligne:numLigne,reference,manque});continue;}
      l.famille=prof.famille;
      if(prof.sections&&!l.dimensions&&section)l.dimensions=section;
    }
    lignes.push(l);
  }
  return {lignes,ignorees,vides,colonnes:C,arretLigne,deuxStocks,famille:prof?prof.famille:null};
}
// même normalisation que « cle » de Stock.js (sans accents, majuscules, espaces simples) pour repérer la ligne « SPÉCIALE »
function cle0(s){return String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/×/g,"X").replace(/\s+/g," ").trim().toUpperCase();}
