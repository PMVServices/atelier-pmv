import {db} from "./supabase";

// Alertes par mail (EmailJS), réglées depuis l'appli (Matériel > Alerte mail, table parametres_app).
// Deux interrupteurs indépendants : nouvelle demande de matériel, stock passé sous son minimum.
export async function chargerParamsApp(){
  try{
    const rows=await db.get("parametres_app","?select=cle,valeur");
    const p={};if(Array.isArray(rows))rows.forEach(r=>{p[r.cle]=r.valeur;});
    return p;
  }catch(e){return {};}
}
export function configMailDepuisParams(p){
  return {actif:p.alerte_mail_actif==="1",stockActif:p.alerte_stock_actif==="1",adresse:p.alerte_mail_adresse||"",service:p.emailjs_service_id||"",template:p.emailjs_template_id||"",cle:p.emailjs_public_key||""};
}
export async function envoyerViaEmailJS(cfg,params){
  const r=await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:cfg.service,template_id:cfg.template,user_id:cfg.cle,template_params:params})});
  const txt=await r.text();
  return {ok:r.ok,detail:txt};
}
// type : "demande" (nouvelle demande de matériel) ou "stock" (stock bas). Renvoie {etat:"envoye"|"desactive"|"non_configure"|"echec"}.
export async function envoyerAlerteMail({type,sujet,message,demandeur,chantier}){
  const cfg=configMailDepuisParams(await chargerParamsApp());
  if(!(type==="stock"?cfg.stockActif:cfg.actif))return {etat:"desactive"};
  if(!cfg.adresse||!cfg.service||!cfg.template||!cfg.cle)return {etat:"non_configure"};
  try{
    const r=await envoyerViaEmailJS(cfg,{to_email:cfg.adresse,sujet,message,demandeur:demandeur||"",chantier:chantier||""});
    return r.ok?{etat:"envoye",adresse:cfg.adresse}:{etat:"echec",detail:r.detail};
  }catch(e){return {etat:"echec",detail:String((e&&e.message)||e)};}
}
// Texte du mail "stock bas" : items = [{article, apres}] (quantité restante après le mouvement).
export function messageStockBas(items,qui){
  const lignes=items.map(({article:a,apres})=>{
    const seuils=[a.stock_mini!=null?"minimum "+a.stock_mini:null,a.stock_maxi!=null?"maximum "+a.stock_maxi:null].filter(Boolean).join(", ");
    const aCommander=Math.max(0,(a.stock_maxi!=null?a.stock_maxi:(a.stock_mini||0))-apres);
    return "• "+a.reference+(a.dimensions?" ("+a.dimensions+")":"")+" : reste "+apres+(seuils?" ("+seuils+")":"")+(aCommander>0?" — à commander : "+aCommander:"")+(apres<=0?"  ⚠ RUPTURE":"");
  });
  return "Stock bas après une sortie"+(qui?" faite par "+qui:"")+" :\n\n"+lignes.join("\n")+"\n\nÀ traiter dans l'appli : "+window.location.origin+" (onglet Stock, À renouveler)";
}
