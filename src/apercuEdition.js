// Aperçu modifiable (Maintenance → Rapports) : génère le rapport HTML en mode édition avec la configuration en cours (brouillon).
// Les photos sont réduites une seule fois puis gardées en mémoire : seule la première génération est longue, les suivantes (après chaque modification) sont rapides.
import {construireRapportCheminee, urlsRapportCheminee, adresseImage, ANCRES_CHEMINEE} from "./rapportCheminee";
import {genRapportLivretHtml} from "./rapportLivretHtml";
import {construireRapport, ANCRES_MOTEUR, ANCRES_GENERIQUE} from "./rapportModele";
import {genRapportHtml, reduireImage} from "./pdfUtils";
import {typeGenerique} from "./rapportPerso";
import {TYPE_CHEMINEE} from "./railClients";

const cache=new Map(); // adresse -> {src, w, h} ou null (image illisible)
function mesurer(src){return new Promise(res=>{const im=new Image();im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight});im.onerror=()=>res(null);im.src=src;});}
async function preparerImages(urls){
  const a=urls.filter((u,i)=>urls.indexOf(u)===i&&!cache.has(u));
  await Promise.all(a.map(async u=>{
    const d=await reduireImage(adresseImage(u),1000,0.7);
    if(d){const m=await mesurer(d);cache.set(u,{src:d,w:m&&m.w,h:m&&m.h});}else cache.set(u,null);
  }));
  const images={},dims={};
  urls.forEach(u=>{const c=cache.get(u);if(c){images[u]=c.src;if(c.w)dims[u]={w:c.w,h:c.h};}});
  return {images,dims};
}

// prep : {v, data, photos} (voir preparerRapport dans App.js) ; config : brouillon complet de la Maintenance
export async function genererHtmlEdition(type,prep,config){
  const photos={...prep.photos,_meta:{...prep.photos._meta,config}};
  if(type===TYPE_CHEMINEE){
    const M=construireRapportCheminee(prep.v,prep.data,photos);
    const {images,dims}=await preparerImages(urlsRapportCheminee(M));
    return {html:genRapportLivretHtml(M,images,dims,{edition:true,ancres:ANCRES_CHEMINEE}),textes:M.textes||[]};
  }
  const M=construireRapport(prep.v,prep.data,photos);
  const urls=[];
  M.chapitres.forEach(ch=>ch.blocs.forEach(b=>{if(b.url)urls.push(b.url);(b.items||[]).forEach(it=>{if(it.url)urls.push(it.url);});}));
  const {images}=await preparerImages(urls);
  return {html:genRapportHtml(prep.v,prep.data,photos,images,{modele:M,edition:true,ancres:typeGenerique(type)?ANCRES_GENERIQUE:ANCRES_MOTEUR}),textes:M.textes||[]};
}
