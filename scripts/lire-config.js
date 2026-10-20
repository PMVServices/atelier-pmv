// Lit (LECTURE SEULE) la configuration faite par la Maintenance (page « Maintenance » de l'appli) et l'affiche lisiblement.
// À lancer avant toute modification des champs des fiches, des colonnes du planning ou de leurs états : node scripts/lire-config.js
// Option : --json pour la configuration brute. N'écrit jamais rien dans la base ; la clé utilisée est la clé publique déjà dans src/supabase.js.
const fs=require("fs");
const path=require("path");

const src=fs.readFileSync(path.join(__dirname,"..","src","supabase.js"),"utf8");
const URL_=(src.match(/SUPA_URL\s*=\s*"([^"]+)"/)||[])[1];
const KEY=(src.match(/SUPA_KEY\s*=\s*"([^"]+)"/)||[])[1];
if(!URL_||!KEY){console.error("Impossible de lire SUPA_URL / SUPA_KEY dans src/supabase.js");process.exit(1);}

async function lire(cle){
  const r=await fetch(URL_+"/rest/v1/parametres_app?select=cle,valeur&cle=eq."+cle,{headers:{apikey:KEY,Authorization:"Bearer "+KEY}});
  if(!r.ok)throw new Error("Lecture impossible ("+r.status+")");
  const rows=await r.json();
  return rows[0]&&rows[0].valeur?rows[0].valeur:null;
}

(async()=>{
  const brut=await lire("config_fiches");
  if(!brut){console.log("Aucune configuration publiée : l'appli est exactement celle du code.");return;}
  const cfg=JSON.parse(brut);
  if(process.argv.includes("--json")){console.log(JSON.stringify(cfg,null,2));return;}
  const cles=Object.keys(cfg.fiches||{});
  if(!cles.length&&!cfg.statuts)console.log("Configuration vide.");
  cles.forEach(cle=>{
    const f=cfg.fiches[cle];
    console.log("\n== "+(cle.startsWith("ch:")?"Fiche chantier — "+cle.slice(3):"Fiche atelier — "+cle)+" ==");
    Object.keys(f.champs||{}).forEach(id=>{
      const o=f.champs[id];const modifs=[];
      if(o.label)modifs.push("renommé « "+o.label+" »");
      if(o.masque)modifs.push("MASQUÉ");
      if(o.required!==undefined)modifs.push(o.required?"obligatoire":"facultatif");
      if(o.options)modifs.push("choix : "+o.options.join(" / "));
      if(o.note!==undefined)modifs.push("note : "+(String(o.note).trim()||"(effacée)"));
      console.log("  champ du code "+id+" → "+modifs.join(" ; "));
    });
    Object.keys(f.deplace||{}).forEach(id=>console.log("  déplacé : "+id+" après "+f.deplace[id].apres));
    (f.ajouts||[]).forEach(a=>{
      const d=a.def||{};
      console.log("  AJOUT (id "+a.id+") dans « "+a.etape+" » après "+a.apres+" : "+(d.label||"?")+" ["+d.type+(d.unite?", "+d.unite:"")+(d.options?", choix : "+d.options.join(" / ")+(d.autre?" + Autre":""):"")+(d.required?", obligatoire":"")+"]");
    });
  });
  if(cfg.statuts){
    console.log("\n== Colonnes du planning (dans l'ordre) ==");
    cfg.statuts.forEach(s=>console.log("  "+s.id+" : "+s.label+" ("+s.color+")"));
  }
  // rapports client personnalisés (onglet « Rapports » de la Maintenance)
  const brutR=await lire("config_rapports").catch(()=>null);
  if(brutR&&!process.argv.includes("--json")){
    try{
      const r=JSON.parse(brutR).rapports||{};
      Object.keys(r).forEach(type=>{
        const c=r[type]||{};
        console.log("\n== Rapport client — "+type+" ==");
        (c.masques||[]).forEach(id=>console.log("  rubrique masquée : "+id));
        Object.keys(c.textes||{}).forEach(id=>console.log("  texte modifié ("+id+") : "+String(c.textes[id]).slice(0,100)));
        (c.ajouts||[]).forEach(b=>{
          const contenu=b.type==="photo"?"photos « "+(b.photo&&b.photo.categorie)+" »":String(b.texte||"").replace(/\n/g," / ").slice(0,120);
          const cond=b.condition&&b.condition.champ?" (si "+b.condition.champ+" "+b.condition.op+(b.condition.valeur?" "+b.condition.valeur:"")+")":"";
          console.log("  AJOUT avant « "+b.avant+" » ["+b.type+(b.style&&b.style!=="normal"?", "+b.style:"")+"] : "+contenu+cond);
        });
      });
      if(!Object.keys(r).length)console.log("\n== Rapports client : aucune personnalisation ==");
    }catch(e){console.log("\n(configuration des rapports illisible)");}
  }else if(!brutR)console.log("\n== Rapports client : aucune personnalisation ==");
  const histo=await lire("config_fiches_historique").catch(()=>null);
  if(histo){try{const h=JSON.parse(histo);console.log("\nHistorique : "+h.length+" version(s) ; dernière publication remplacée le "+(h[0]?new Date(h[0].t).toLocaleString("fr-FR")+" (par "+(h[0].qui||"?")+")":"—"));}catch(e){/* historique illisible : ignoré */}}
})().catch(e=>{console.error("Erreur : "+e.message);process.exit(1);});
