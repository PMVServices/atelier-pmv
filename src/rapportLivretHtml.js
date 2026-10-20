/* eslint-disable */
// Rapport client « cheminée de freinage » : aperçu et PDF (impression). Le contenu vient de rapportCheminee.js ; ce fichier ne fait que la mise en page.
import {LOGO_B64, afficherApercu, lancerImpression, reduireImage} from "./pdfUtils";
import {BANDE} from "./rapportModele";
import {construireRapportCheminee, urlsRapportCheminee, adresseImage, dimensionsRang} from "./rapportCheminee";

function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function parts(list){
  return list.map(function(p){
    if(typeof p==="string")return esc(p);
    if(p.b!==undefined)return "<b>"+esc(p.b)+"</b>";
    if(p.bu!==undefined)return "<b><u>"+esc(p.bu)+"</u></b>";
    if(p.rouge!==undefined)return "<span class='rouge'>"+esc(p.rouge)+"</span>";
    if(p.v)return "<span class='"+p.v+"'>"+esc(p.txt)+"</span>";
    return esc(p.txt);
  }).join("");
}

export function genRapportLivretHtml(M,images,dims){
  images=images||{};dims=dims||{};
  var src=function(u){return esc(images[u]||adresseImage(u));};
  var fig=function(u,style,leg){return u?"<figure><img src='"+src(u)+"' style='"+style+"' crossorigin='anonymous'/>"+(leg?"<figcaption>"+esc(leg)+"</figcaption>":"")+"</figure>":"";};
  var accroche="PMV Services, "+M.societe.accroche.replace(/"/g,"'");

  var css=""+
  "*{box-sizing:border-box;margin:0;padding:0;}"+
  "@page{size:A4;margin:22mm 20mm 20mm 20mm;"+
    "@bottom-left{content:\""+accroche+"\";font:8pt Calibri,Carlito,Arial,sans-serif;color:#404040;}"+
    "@bottom-right{content:\"Page \" counter(page) \" sur \" counter(pages);font:9pt Calibri,Carlito,Arial,sans-serif;color:#404040;}}"+
  "@page:first{margin:0;@bottom-left{content:none;}@bottom-right{content:none;}}"+
  "body{font-family:Calibri,Carlito,Arial,Helvetica,sans-serif;font-size:11pt;color:#000;line-height:1.35;background:#E5E7EB;}"+
  ".page{width:210mm;min-height:297mm;margin:10px auto;padding:20mm;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.18);page-break-after:always;}"+
  ".page.flux{page-break-after:auto;min-height:0;}"+
  ".cover{position:relative;width:210mm;height:297mm;margin:10px auto;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.18);overflow:hidden;page-break-after:always;}"+
  ".cover .logo{position:absolute;left:12mm;top:18mm;height:27mm;}"+
  ".cover svg{position:absolute;left:0;bottom:0;width:210mm;height:"+Math.round(210*BANDE.h/BANDE.w)+"mm;}"+
  ".cover .titre{position:absolute;left:0;right:0;top:50mm;text-align:center;font-size:22pt;font-weight:700;}"+
  ".cover .dessin{position:absolute;left:0;right:0;top:72mm;text-align:center;}.cover .dessin img{height:84mm;}"+
  ".cover .client{position:absolute;left:0;right:0;top:158mm;text-align:center;font-size:26pt;font-weight:700;}.cover .client img{height:30mm;}"+
  ".cover .travaux{position:absolute;left:39mm;top:192mm;font-size:12pt;}"+
  ".cover .date{position:absolute;left:144mm;width:52mm;top:247mm;height:13mm;border:2px solid #F79646;background:#fff;text-align:center;font-size:13pt;line-height:11mm;}"+
  ".societe .logo{height:21mm;display:block;margin-bottom:2mm;}.societe div{font-size:12pt;line-height:1.5;}"+
  ".idl{font-size:14pt;margin-top:8.5mm;}"+
  ".descr{margin-top:17mm;}.descr .t{font-size:13pt;font-weight:700;text-decoration:underline;}.descr .c{font-size:11.5pt;margin:4mm 0 0 12mm;}"+
  ".sommaire{font-family:Cambria,Georgia,serif;font-size:14pt;font-weight:700;color:#365F91;background:#D9D9D9;display:inline-block;padding:0 2px;margin-top:22mm;margin-bottom:2mm;}"+
  "ol.som{list-style:none;}ol.som li{font-size:11.5pt;margin-bottom:1.2mm;}ol.som li.n2{padding-left:4.5mm;}"+
  ".legende{margin-top:14mm;}.legende .t{font-size:11.5pt;margin-bottom:4mm;}"+
  "table.leg{width:100%;border-collapse:collapse;}table.leg td{border:1px solid #000;text-align:center;font-size:14pt;padding:2mm 1mm;width:33.3%;height:15mm;vertical-align:top;}"+
  "h1{font-size:16pt;text-decoration:underline;margin:20px 0 10px;page-break-after:avoid;break-after:avoid;}"+
  "h1.prem{margin-top:0;}"+
  "h2{font-size:12pt;text-decoration:underline;margin:14px 0 6px;page-break-after:avoid;break-after:avoid;}"+
  "h2.leger{font-weight:400;text-decoration:none;font-size:11pt;}"+
  "p{margin-bottom:6px;}p.grand{font-size:13pt;}.l{margin-bottom:2px;}.lignes{margin-bottom:8px;page-break-inside:avoid;break-inside:avoid;}.lignes.apres{margin-bottom:12px;}.espace{margin-top:16px;}"+
  "figure{margin:6px 0 10px;text-align:left;page-break-inside:avoid;break-inside:avoid;}figure.centre{text-align:center;}"+
  "figure img{max-width:100%;display:inline-block;}figcaption{font-size:11pt;margin-top:3px;text-align:center;}"+
  ".rang{display:flex;gap:3mm;margin:6px 0 10px;page-break-inside:avoid;break-inside:avoid;}.rang figure{flex:1 1 0;min-width:0;margin:0;}.rang figure img{width:100%;object-fit:contain;object-position:left top;}.rang.fixe{gap:0.3cm;}.rang.fixe figure{flex:none;}.rang.fixe figure img{height:auto;}"+
  "table.t{border-collapse:collapse;width:100%;margin:6px 0 12px;page-break-inside:avoid;break-inside:avoid;}"+
  "table.t td{border:1px solid #000;padding:2px 4px;vertical-align:top;}"+
  ".kn{break-after:avoid;page-break-after:avoid;}"+
  ".ok{background:#00FF00;}.res{background:#FFFF00;}.ko{background:#FF0000;}.rouge{color:#FF0000;}"+
  "@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}"+
    ".page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none;}.cover{margin:0;box-shadow:none;}}";

  var html="<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>Rapport "+esc(M.de)+"</title><style>"+css+"</style></head><body>";

  // couverture
  var svg="<svg viewBox='0 0 "+BANDE.w+" "+BANDE.h+"' preserveAspectRatio='none'>"+BANDE.formes.map(function(f){return "<polygon points='"+f.pts.map(function(p){return p[0]+","+p[1];}).join(" ")+"' fill='"+f.fill+"'/>";}).join("")+"</svg>";
  var C=M.couverture;
  html+="<section class='cover'><img class='logo' src='"+LOGO_B64+"'/>"+svg+
    "<div class='titre'>"+esc(C.titre)+"</div>"+
    "<div class='dessin'><img src='"+src(M.imagesCouverture.cheminee)+"'/></div>"+
    "<div class='client'>"+(C.logoClient?"<img src='"+src(M.imagesCouverture.imateq)+"'/>":esc(C.client))+"</div>"+
    "<div class='travaux'>"+esc(C.travaux)+"</div>"+
    (C.date?"<div class='date'>"+esc(C.date)+"</div>":"")+"</section>";

  // identification
  html+="<section class='page'><div class='societe'><img class='logo' src='"+LOGO_B64+"'/>"+M.societe.lignes.map(function(l){return "<div>"+esc(l)+"</div>";}).join("")+"</div>";
  M.identite.forEach(function(l){html+="<p class='idl'><b><u>"+esc(l.k.replace(/\s*:$/,""))+(l.k.slice(-1)===":"?" :":"")+"</u></b> "+esc(l.v)+"</p>";});
  if(M.descriptif)html+="<div class='descr'><div class='t'>Descriptif des travaux réalisés par PMV Services :</div><div class='c'>"+esc(M.descriptif)+"</div></div>";
  html+="</section>";

  // sommaire + légende
  html+="<section class='page'><div class='sommaire'>Sommaire :</div><ol class='som'>"+M.sommaire.map(function(s){return "<li class='n"+s.niveau+"'>"+esc(s.txt)+"</li>";}).join("")+"</ol>"+
    "<div class='legende'><div class='t'>Légende des couleurs :</div><table class='leg'><tr>"+M.legende.map(function(l){return "<td><span class='"+l.v+"'>"+esc(l.txt)+"</span></td>";}).join("")+"</tr></table></div></section>";

  // corps : un seul flux continu
  var page="<section class='page flux'>";
  var premier=true;
  var visuel=function(i){var n=M.blocs[i+1];return !!n&&["img","rang","capture","table"].indexOf(n.t)>=0;};
  M.blocs.forEach(function(b,bi){
    var kn=visuel(bi)?" kn":"";
    if(b.t==="h1"){page+="<h1"+(premier?" class='prem'":"")+">"+esc(b.txt)+"</h1>";premier=false;}
    else if(b.t==="h2")page+="<h2"+(b.leger?" class='leger'":"")+">"+esc(b.txt)+"</h2>";
    else if(b.t==="para")page+="<p class='"+(b.grand?"grand":"")+kn+"'"+(b.espace?" style='margin-top:16px'":"")+">"+parts(b.parts)+"</p>";
    else if(b.t==="lignes")page+="<div class='lignes"+(b.apres?" apres":"")+(b.espace?" espace":"")+kn+"'>"+b.lignes.map(function(l){return "<div class='l'>"+parts(l)+"</div>";}).join("")+"</div>";
    else if(b.t==="img")page+=fig(b.url,"max-width:"+b.w+"cm;max-height:"+b.h+"cm;");
    else if(b.t==="capture")page+="<figure><img src='"+src(b.url)+"' style='max-height:"+b.h+"cm;' crossorigin='anonymous'/></figure>";
    else if(b.t==="rang"){
      // même hauteur pour toutes les photos de la ligne, largeurs proportionnelles, sur une seule ligne (dimensionsRang) ; sans les dimensions des images : répartition souple
      var connues=b.items.every(function(it){return dims[it.url]&&dims[it.url].w&&dims[it.url].h;});
      var calc=connues?dimensionsRang(b.items.map(function(it){return dims[it.url].w/dims[it.url].h;}),b.h,16.6,0.3):null;
      page+="<div class='rang"+(calc?" fixe":"")+"'>"+b.items.map(function(it,i){return "<figure"+(calc?" style='width:"+calc.largeurs[i].toFixed(3)+"cm'":"")+"><img src='"+src(it.url)+"'"+(calc?"":" style='max-height:"+b.h+"cm'")+" crossorigin='anonymous'/>"+(b.legendes&&it.legende?"<figcaption>"+esc(it.legende)+"</figcaption>":"")+"</figure>";}).join("")+"</div>";
    }
    else if(b.t==="table"){
      var tot=b.cols.reduce(function(a,c){return a+c;},0);
      page+="<table class='t'"+(b.largeur?" style='width:"+Math.round(b.largeur*100)+"%'":"")+"><colgroup>"+b.cols.map(function(c){return "<col style='width:"+(c/tot*100).toFixed(2)+"%'/>";}).join("")+"</colgroup>"+
        b.rows.map(function(r){return "<tr>"+r.map(function(c){
          if(typeof c==="string")c={txt:c};
          var st="text-align:"+(c.align||"left")+";"+(c.taille?"font-size:"+c.taille+"pt;":"")+(c.b?"font-weight:700;":"");
          var inner=esc(c.txt).replace(/\n/g,"<br/>");
          return "<td style='"+st+"'>"+(c.v?"<span class='"+c.v+"'>"+inner+"</span>":inner)+"</td>";
        }).join("")+"</tr>";}).join("")+"</table>";
    }
  });
  html+=page+"</section></body></html>";
  return html;
}

export async function genRapportLivretHtmlLeger(v,data,photos){
  var M=construireRapportCheminee(v,data,photos);
  var map={};
  await Promise.all(urlsRapportCheminee(M).map(function(u){return reduireImage(adresseImage(u),1600,0.8).then(function(d){if(d)map[u]=d;});}));
  // dimensions réelles des images (pour mettre les photos côte à côte à la même hauteur)
  var dims={};
  await Promise.all(Object.keys(map).map(function(u){return new Promise(function(res){var im=new Image();im.onload=function(){dims[u]={w:im.naturalWidth,h:im.naturalHeight};res();};im.onerror=function(){res();};im.src=map[u];});}));
  return genRapportLivretHtml(M,map,dims);
}
export async function apercuRapportCheminee(v,data,photos){
  afficherApercu(await genRapportLivretHtmlLeger(v,data,photos),"rapport-"+(v&&v.de||"cheminee"));
}
export async function imprimerRapportCheminee(v,data,photos){
  lancerImpression(await genRapportLivretHtmlLeger(v,data,photos));
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") window.__rapportLivretHtml = { genRapportLivretHtmlLeger };
