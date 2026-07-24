/* eslint-disable */
const LOGO_B64 = "data:image/jpeg;base64,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";
const SUPA_URL_PDF = "https://pupbzngvudprcweukuoi.supabase.co";
const STATUTS_PDF = [{id:"A_demonter",label:"À démonter",color:"#D73A49"},{id:"Devis",label:"Devis",color:"#E8720C"},{id:"En_commande",label:"En commande",color:"#1B4F8A"},{id:"A_remonter",label:"À remonter",color:"#22863A"},{id:"Termine",label:"Terminé",color:"#6B7280"}];
function stPdf(id){return STATUTS_PDF.find(s=>s.id===id)||STATUTS_PDF[0];}
function slugP(s){return (s||"").replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_-]/g,"").substring(0,30);}
function deslug(de){return (de||"").replace(/-/g,"");}
function chPdf(v){var c=slugP(v.client||"Client");var d=deslug(v.de||"DE");var m=slugP(v.materiel_lieu||v.type_moteur||"Materiel");return {client:c,de:d,mat:m};}

export function genHtml(v,photos,sc,comm,pieces,nrMap,champsData,etapesData){
  var isPompe=(v._type||v.type_materiel)==="Pompe";
  var champs=champsData||(isPompe?window.__CHAMPS_POMPE:window.__CHAMPS)||{};
  var etapes=etapesData||(isPompe?window.__ETAPES_POMPE:window.__ETAPES)||[];

  // Helpers
  function fmt(id,c){
    var val=v[id]||"";
    if(!val)return "—";
    if(c.type==="ohm"){var p=val.split("_");return(p[0]||"")+(p[1]?" "+p[1]:"");}
    if(c.type==="joints"){try{var j=JSON.parse(val);return j.map(function(x){if(x.type==="VA"||x.type==="VS")return x.type+(x.int||"?");return x.int+"x"+x.ext+"x"+x.ep+" "+(x.type==="Double"?"DL":"SL");}).join(", ");}catch(e){return val;}}
    if(c.type==="oui_non")return val==="Oui"?"Oui":val==="Non"?"Non":val;
    if(c.unite)return val+" "+c.unite;
    return val;
  }

  var now=new Date().toLocaleDateString("fr-FR");
  var ch={client:(v.client||"—"),de:(v.de||"—"),mat:(v.materiel_lieu||v.type_materiel||"—")};

  var css="*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:9.5pt;color:#1A1A2E;}.page{max-width:210mm;margin:0 auto;padding:12mm;}.hdr{background:#1B4F8A;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}.ht{font-size:15pt;font-weight:bold;}.hs{font-size:8pt;opacity:.75;margin-top:2px;}.hd{font-size:18pt;font-weight:bold;color:#E8720C;text-align:right;}.hdate{font-size:8pt;opacity:.75;text-align:right;}table{width:100%;border-collapse:collapse;margin-bottom:8px;}td{padding:5px 7px;border:.4px solid #DEE2E6;vertical-align:top;}tr:nth-child(even) td{background:#F8F9FA;}.lbl{font-weight:bold;font-size:9.5pt;width:22%;}.val{font-size:9.5pt;width:28%;}.sec td{background:#1B4F8A;color:#fff;font-weight:bold;padding:6px 8px;}.sn{margin-right:6px;}.st{float:right;font-size:8pt;opacity:.8;font-weight:normal;}.nr{background:#FFF8E1;color:#E8720C;font-style:italic;font-size:9pt;padding:4px 8px;}.sub td{background:#D6E4F7;color:#1B4F8A;font-weight:bold;padding:5px 8px;}.ft{border-top:.5px solid #DEE2E6;margin-top:10px;padding-top:5px;font-size:7pt;color:#6B7280;text-align:center;}.pg{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;}.pi img{width:80px;height:80px;object-fit:cover;border-radius:4px;}.pi p{font-size:7pt;color:#6B7280;margin-top:2px;text-align:center;}.comment{background:#F8F9FA;border:.5px solid #DEE2E6;border-radius:4px;padding:8px;margin-top:6px;font-size:9pt;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}";

  var html="<!DOCTYPE html><html><head><meta charset='UTF-8'><style>"+css+"</style></head><body><div class='page'>";

  // Header
  var statLabel=sc||"";
  html+="<div class='hdr'><div><div class='ht'>FICHE D'ENTRETIEN / EXPERTISE</div><div class='hs'>"+ch.client+" / "+ch.de+" / "+ch.mat+"</div></div><div><div class='hd'>"+ch.de+"</div><div class='hdate'>"+now+(statLabel?" · "+statLabel:"")+"</div></div></div>";

  // Sections par étape
  etapes.forEach(function(nomEtape,etapeIdx){
    var csEtape=champs[nomEtape]||[];
    var isNR=nrMap&&nrMap[etapeIdx];
    var techField=csEtape.find(function(c){return c.type==="technicien";});
    var tech=techField&&v[techField.id]?v[techField.id].replace("Autre:",""):"";

    // Trouver les champs avec valeur (hors technicien, hors info, hors photo_skf)
    var champsAvecVal=csEtape.filter(function(c){
      return c.type!=="technicien"&&c.type!=="info"&&c.type!=="photo_skf"&&v[c.id]&&v[c.id]!=="";
    });

    if(champsAvecVal.length===0&&!isNR)return; // Étape vide → ne pas afficher

    html+="<table>";
    html+="<tr class='sec'><td colspan='4'><span class='sn'>"+(etapeIdx+1)+".</span> "+nomEtape.toUpperCase()+(tech?"<span class='st'>Technicien : "+tech+"</span>":"")+"</td></tr>";

    if(isNR){
      html+="<tr class='nr'><td colspan='4'>⚠ Étape non réalisable</td></tr>";
    }

    // Afficher les champs 2 par 2
    var champs2=champsAvecVal.filter(function(c){return c.type!=="textarea";});
    var champsTA=champsAvecVal.filter(function(c){return c.type==="textarea";});

    for(var i=0;i<champs2.length;i+=2){
      var c1=champs2[i];
      var c2=champs2[i+1];
      html+="<tr><td class='lbl'>"+c1.label+"</td><td class='val'>"+fmt(c1.id,c1)+"</td><td class='lbl'>"+(c2?c2.label:"")+"</td><td class='val'>"+(c2?fmt(c2.id,c2):"")+"</td></tr>";
    }
    // Textareas pleine largeur
    champsTA.forEach(function(c){
      html+="<tr><td class='lbl'>"+c.label+"</td><td colspan='3' class='val'>"+fmt(c.id,c)+"</td></tr>";
    });
    html+="</table>";
  });

  // Photos
  var ph=photos.filter(function(p){return p.url;});
  if(ph.length>0){
    html+="<p style='font-weight:bold;margin:8px 0 4px;'>Photos ("+ph.length+")</p><div class='pg'>";
    ph.forEach(function(p){html+="<div class='pi'><img src='"+p.url+"' crossorigin='anonymous'/><p>"+(p.categorie_nom||p.nom_fichier||"")+"</p></div>";});
    html+="</div>";
  }

  // Commentaires
  if(comm){html+="<p style='font-weight:bold;margin:8px 0 4px;'>Commentaires</p><div class='comment'>"+comm+"</div>";}

  // Matériel à commander
  var piecesOk=(pieces||[]).filter(function(p){return p.checked!==false;});
  if(piecesOk.length>0){
    html+="<p style='font-weight:bold;margin:8px 0 4px;'>Matériel à commander</p><ul style='padding-left:18px;font-size:9pt;'>";
    piecesOk.forEach(function(p){html+="<li>"+p.designation+(p.reference?" — "+p.reference:"")+"</li>";});
    html+="</ul>";
  }

  html+="<div class='ft'>Fiche "+ch.de+" · "+ch.client+"/"+ch.de+"/"+ch.mat+" · "+now+" · Atelier PMV</div></div></body></html>";
  return html;
}


export function imprimerFiche(v,photos,sc,comm,pieces,nrMap){
  var w=window.open("","_blank","width=900,height=700");
  w.document.write(genHtml(v,photos,sc,comm,pieces,nrMap));
  w.document.close();
  setTimeout(function(){w.print();},800);
}

export async function telechargerZip(photos,valeurs,nomDossier){
  if(!photos)photos=[];
  try{
    if(!window.JSZip){await new Promise(function(res,rej){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
    var zip=new window.JSZip();
    // Photos
    await Promise.all(photos.map(async function(p){try{var r=await fetch(p.url);var blob=await r.blob();zip.file(p.nom_fichier||p.storage_path.split("/").pop(),blob);}catch(e){}}));
    // PDF via fenêtre d'impression
    if(valeurs&&Object.keys(valeurs).length>0){
      var html=genHtml(valeurs,photos,"A_demonter","",[]); 
      var pdfBlob=await new Promise(function(resolve){
        var w=window.open("","_blank","width=900,height=700");
        if(!w){resolve(null);return;}
        w.document.write(html);
        w.document.close();
        // Donner le temps aux images de charger
        setTimeout(function(){
          w.focus();
          w.print();
          // Créer un blob HTML à mettre dans le ZIP
          var b=new Blob([html],{type:"text/html"});
          resolve(b);
          setTimeout(function(){w.close();},2000);
        },1000);
      });
      if(pdfBlob)zip.file(nomDossier+"_fiche.html",pdfBlob);
    }
    var content=await zip.generateAsync({type:"blob"});
    var a=document.createElement("a");a.href=URL.createObjectURL(content);a.download=nomDossier+".zip";a.click();
  }catch(e){
    console.error("ZIP error:",e);
    if(photos.length>0)photos.forEach(function(p){var a=document.createElement("a");a.href=p.url;a.download=p.nom_fichier||"photo.jpg";a.target="_blank";a.click();});
  }
}
