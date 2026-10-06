import React, {useState, useEffect, useCallback, useRef} from "react";
import {SUPA_URL, H, db} from "./supabase";
import {NoticeActivation} from "./Activation";
import {lancerImpression, telechargerHtml} from "./pdfUtils";

// ─── GESTION DE STOCK (démarrage : roulements 6XXX) ──────────────────────────────────────────────
// Principe : Excel garde le catalogue (références, dimensions, emplacements, mini/maxi, prix…), l'appli
// garde les quantités (entrées, sorties, inventaires, historique). L'import Excel met le catalogue à jour
// sans jamais écraser les quantités ; chaque mouvement est une ligne de stock_mouvements et un déclencheur
// de la base tient la quantité de stock_articles à jour (pas de calcul côté tablette, donc pas d'écart).

export const SQL_STOCK=`create table if not exists stock_articles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  reference text not null unique,
  dimensions text,
  emplacement text,
  stock_mini integer,
  stock_maxi integer,
  prix_unitaire numeric,
  fournisseur1 text,
  fournisseur2 text,
  fournisseur3 text,
  quantite integer not null default 0
);

create table if not exists stock_mouvements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  article_id uuid not null references stock_articles(id) on delete cascade,
  type text not null,
  delta integer not null,
  chantier text,
  utilisateur text,
  commentaire text
);
create index if not exists stock_mouvements_article_idx on stock_mouvements (article_id, created_at desc);

create table if not exists stock_codes (
  code text primary key,
  article_id uuid not null references stock_articles(id) on delete cascade,
  created_at timestamptz default now()
);

create or replace function stock_appliquer_mouvement()
returns trigger
language plpgsql
as $$
begin
  update stock_articles set quantite = quantite + new.delta where id = new.article_id;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'stock_mouvement_applique') then
    create trigger stock_mouvement_applique
    after insert on stock_mouvements
    for each row execute function stock_appliquer_mouvement();
  end if;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['stock_articles','stock_mouvements','stock_codes'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'allow anon all') then
      execute format('create policy "allow anon all" on %I for all using (true) with check (true)', t);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';`;

const MONO="ui-monospace,'SF Mono','Cascadia Mono',Menlo,Consolas,monospace";

// ─── Petits outils ───────────────────────────────────────────────────────────────────────────────
const cle=s=>String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/×/g,"X").replace(/\s+/g," ").trim().toUpperCase();
const serieDe=ref=>{const m=/^(\d{2})/.exec(String(ref||"").trim());return m?m[1]+"XX":"Autre";};
function triRef(a,b){
  const na=parseInt(a.reference,10),nb=parseInt(b.reference,10);
  const va=isNaN(na)?Infinity:na,vb=isNaN(nb)?Infinity:nb;
  if(va!==vb)return va<vb?-1:1;
  return String(a.reference).localeCompare(String(b.reference),"fr",{numeric:true});
}
// Règle reprise de la colonne "A recommander ?" du fichier Excel : stock <= mini et stock < maxi.
const aRecommander=a=>{
  const q=a.quantite||0,mi=a.stock_mini,ma=a.stock_maxi;
  if(mi==null)return false;
  return q<=mi&&(ma==null||q<ma);
};
const qteARecommander=a=>Math.max(0,(a.stock_maxi!=null?a.stock_maxi:(a.stock_mini||0))-(a.quantite||0));
const fmtEuro=n=>(n==null||isNaN(n))?"":Number(n).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const fmtDate=iso=>{
  const d=new Date(iso);if(isNaN(d.getTime()))return "";
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
};
const normChantier=v=>{const m=String(v||"").trim().match(/^(?:de)?(\d+)$/i);return m?"DE"+m[1]:String(v||"").trim();};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const TYPES_MVT={initial:"Stock initial",entree:"Entrée",sortie:"Sortie",inventaire:"Inventaire"};

async function appel(methode,chemin,corps,prefer){
  try{
    const r=await fetch(SUPA_URL+"/rest/v1/"+chemin,{method:methode,headers:prefer?{...H,"Prefer":prefer}:H,body:corps!==undefined?JSON.stringify(corps):undefined});
    const data=await r.json().catch(()=>null);
    return {ok:r.ok,data,status:r.status};
  }catch(e){return {ok:false,data:null,status:0};}
}
async function enregistrerMouvement(m){
  const r=await appel("POST","stock_mouvements",m,"return=representation");
  return r.ok&&Array.isArray(r.data)&&r.data.length===1;
}
function telechargerFichier(blob,nom){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=nom;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),10000);
}

// Articles du stock (partagés par la page et ses fenêtres). disponible=false tant que les tables n'existent pas.
function useStock(){
  const [etat,setEtat]=useState({articles:[],disponible:null});
  const recharger=useCallback(async()=>{
    try{
      // fetch direct (et non db.get) : db.get renvoie [] en cas de coupure réseau, ce qui viderait la liste à tort.
      const r=await fetch(SUPA_URL+"/rest/v1/stock_articles?select=*&order=reference&limit=5000",{headers:H});
      const rows=await r.json();
      if(Array.isArray(rows)){setEtat({articles:rows.slice().sort(triRef),disponible:true});return true;}
      if(rows&&rows.code==="PGRST205"){setEtat({articles:[],disponible:false});return false;}
    }catch(e){/* hors ligne : on garde l'état précédent */}
    return null;
  },[]);
  useEffect(()=>{
    recharger();
    const t=setInterval(recharger,60000);
    const auRetour=()=>{if(!document.hidden)recharger();};
    window.addEventListener("focus",recharger);
    document.addEventListener("visibilitychange",auRetour);
    return()=>{clearInterval(t);window.removeEventListener("focus",recharger);document.removeEventListener("visibilitychange",auRetour);};
  },[recharger]);
  return {articles:etat.articles,disponible:etat.disponible,recharger};
}

const CSS_STOCK=`
.stk{max-width:900px;margin:0 auto;padding:18px 16px 70px;color:#1A1A2E;font-size:15px;line-height:1.4}
.stk *{box-sizing:border-box}
.stk-tete h2{font-size:20px;margin:0}
.stk-sous{font-size:12.5px;color:#9CA3AF;margin:3px 0 0}
.stk-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0 12px}
.stk-big{min-height:60px;border-radius:14px;border:2px solid #BFC8D4;background:#fff;font-weight:700;font-size:16px;cursor:pointer;padding:8px 14px !important;display:flex;align-items:center;justify-content:center;gap:8px;color:#1A1A2E;text-align:center;font-family:inherit}
.stk-big--p{background:#1B4F8A;border-color:#1B4F8A;color:#fff}
.stk-big[disabled]{opacity:.5;cursor:not-allowed}
.stk-resume{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13.5px;color:#4B5563;margin:0 0 12px}
.stk-resume b{color:#1A1A2E}
.stk-champ{width:100%;min-height:52px;border:1.5px solid #BFC8D4;border-radius:12px;padding:10px 14px !important;font-size:16px;background:#fff;font-family:inherit;color:#1A1A2E}
.stk-chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.stk-chip{min-height:44px;border-radius:999px;border:1.5px solid #D1D5DB;background:#fff;font-weight:600;font-size:14px;cursor:pointer;padding:0 16px !important;color:#4B5563;font-family:inherit}
.stk-chip.on{border-color:#1B4F8A;background:#EEF4FF;color:#1B4F8A}
.stk-liste{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.stk-carte{display:grid;grid-template-columns:1fr auto;align-items:center;gap:4px 14px;background:#fff;border:1px solid #E2E6EA;border-radius:12px;padding:12px 14px !important;min-height:72px;cursor:pointer;text-align:left;width:100%;color:#1A1A2E;font-family:inherit}
.stk-carte.bas{border-color:#F3D9A8;background:#FFFCF5}
.stk-carte.vide{border-color:#F4B4BC;background:#FFF7F8}
.stk-ref{font-family:${MONO};font-weight:700;font-size:17px;overflow-wrap:anywhere}
.stk-sub{font-size:12.5px;color:#6B7280;margin-top:2px}
.stk-qte{font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;text-align:right;line-height:1}
.stk-qte small{display:block;font-size:11px;font-weight:600;color:#6B7280;margin-top:3px}
.stk-qte.bas{color:#B45309}
.stk-qte.vide{color:#D73A49}
.stk-badge{display:inline-flex;align-items:center;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;background:#FFF3DC;color:#8A4B00;border:1px solid #F3D19A;margin-left:8px;vertical-align:middle}
.stk-badge--r{background:#FFF1F2;color:#B42318;border-color:#F4B4BC}
.stk-vide{text-align:center;padding:36px 16px;color:#6B7280;background:#fff;border:1px dashed #D1D5DB;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:14px}
.stk-voile{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:12px}
.stk-feuille{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3);color:#1A1A2E}
.stk-large{max-width:800px}
.stk-feuille-tete{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid #EEF1F5}
.stk-feuille-tete h2{font-size:18px;margin:0;overflow-wrap:anywhere}
.stk-x{flex:none;width:44px;height:44px;border-radius:10px;border:0;background:#F3F4F6;font-size:18px;cursor:pointer;padding:0 !important;display:flex;align-items:center;justify-content:center;color:#4B5563}
.stk-corps{padding:14px 16px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
.stk-stock{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.stk-stock-n{font-size:46px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.stk-stock-n.bas{color:#B45309}
.stk-stock-n.vide{color:#D73A49}
.stk-infos{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 14px;font-size:13.5px;color:#4B5563}
.stk-infos b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B7280;font-weight:700}
.stk-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.stk-seg button{min-height:52px;border-radius:12px;border:1.5px solid #BFC8D4;background:#fff;font-weight:700;font-size:16px;cursor:pointer;padding:0 8px !important;color:#1A1A2E;font-family:inherit}
.stk-seg button.on{border-color:#1B4F8A;background:#EEF4FF;color:#1B4F8A;box-shadow:inset 0 0 0 1px #1B4F8A}
.stk-seg button.on.sortie{border-color:#D73A49;background:#FFF1F2;color:#B42318;box-shadow:inset 0 0 0 1px #D73A49}
.stk-seg button.on.entree{border-color:#22863A;background:#E9F6EC;color:#1B6B2E;box-shadow:inset 0 0 0 1px #22863A}
.stk-lib{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#667085;display:block;margin-bottom:6px}
.stk-qs{display:inline-flex;align-items:center;border:1.5px solid #BFC8D4;border-radius:12px;overflow:hidden;background:#fff}
.stk-qs button{width:60px;height:56px;border:0;background:#F5F6F8;font-size:26px;font-weight:700;cursor:pointer;padding:0 !important;display:flex;align-items:center;justify-content:center;color:#1A1A2E}
.stk-qs input{width:84px;height:56px;border:0;text-align:center;font-size:22px !important;font-weight:700;padding:0 !important;background:#fff;font-variant-numeric:tabular-nums;font-family:inherit}
.stk-rang{display:flex;flex-wrap:wrap;gap:8px}
.stk-tech{min-height:46px;border-radius:12px;border:1.5px solid #BFC8D4;background:#fff;font-weight:700;font-size:15px;cursor:pointer;padding:0 14px !important;color:#1A1A2E;font-family:inherit}
.stk-tech.on{border-color:#1B4F8A;background:#EEF4FF;color:#1B4F8A;box-shadow:inset 0 0 0 1px #1B4F8A}
.stk-btn{min-height:54px;border-radius:12px;border:1.5px solid #BFC8D4;background:#fff;font-weight:700;font-size:16px;cursor:pointer;padding:0 18px !important;color:#1A1A2E;font-family:inherit}
.stk-btn--p{background:#1B4F8A;border-color:#1B4F8A;color:#fff}
.stk-btn--r{background:#D73A49;border-color:#D73A49;color:#fff}
.stk-btn--v{background:#22863A;border-color:#22863A;color:#fff}
.stk-btn--s{min-height:46px;font-size:14px;padding:0 14px !important}
.stk-btn[disabled]{opacity:.45;cursor:not-allowed}
.stk-aide{font-size:13px;color:#667085;margin:0}
.stk-alerte{background:#FFF1F2;border:1px solid #D73A49;color:#8A1F2B;border-radius:10px;padding:9px 12px;font-size:13.5px}
.stk-ok{background:#E9F6EC;border:1px solid #22863A;color:#1B6B2E;border-radius:10px;padding:9px 12px;font-size:13.5px}
.stk-info{background:#EEF4FF;border:1px solid #AFC6E6;color:#1B4F8A;border-radius:10px;padding:9px 12px;font-size:13.5px}
.stk-histo{display:flex;flex-direction:column;font-size:13.5px}
.stk-histo>div{display:flex;gap:4px 12px;align-items:baseline;padding:7px 0;border-bottom:1px solid #EEF1F5;flex-wrap:wrap}
.stk-histo .d{color:#6B7280;min-width:92px}
.stk-histo .q{font-weight:700;font-variant-numeric:tabular-nums;min-width:44px}
.stk-histo .q.neg{color:#B42318}
.stk-histo .q.pos{color:#1B6B2E}
.stk-code{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.stk-code .qr{width:78px;height:78px;flex:none;background:#fff;border:1px solid #E2E6EA;border-radius:8px;padding:6px}
.stk-code .qr svg{width:100%;height:100%;display:block}
.stk-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1A1A2E;color:#fff;border-radius:12px;padding:12px 18px;font-weight:600;z-index:500;max-width:90vw;box-shadow:0 6px 24px rgba(0,0,0,.35);text-align:center}
.stk-scan{position:fixed;inset:0;background:#000;z-index:400;display:flex;flex-direction:column;color:#fff}
.stk-scan video{flex:1;min-height:0;width:100%;object-fit:cover;background:#000}
.stk-viseur{position:absolute;left:50%;top:42%;width:min(62vw,320px);aspect-ratio:1;transform:translate(-50%,-50%);border:3px solid rgba(255,255,255,.92);border-radius:18px;box-shadow:0 0 0 9999px rgba(0,0,0,.42);pointer-events:none}
.stk-scan-haut{position:absolute;top:0;left:0;right:0;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;background:linear-gradient(#000b,#0000);z-index:2}
.stk-scan-bas{padding:14px 16px calc(14px + env(safe-area-inset-bottom,0px));background:#0B1220;display:flex;flex-direction:column;gap:10px}
.stk-scan-bas .stk-champ{background:#fff}
.stk-liste-sel{border:1px solid #E2E6EA;border-radius:12px;max-height:260px;overflow-y:auto;padding:6px 10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:2px 12px}
.stk-liste-sel label{display:flex;align-items:center;gap:8px;min-height:40px;font-size:14px;font-family:${MONO}}
.stk-liste-sel input{width:22px;height:22px;min-height:0 !important;padding:0 !important}
.stk-champs{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.stk-champs label span{display:block;font-size:11.5px;font-weight:700;color:#667085;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
.stk-champs input,.stk-champs select{width:100%;min-height:46px;border:1.5px solid #BFC8D4;border-radius:10px;padding:8px 10px !important;font-size:15px !important;background:#fff;font-family:inherit}
.stk-table{width:100%;border-collapse:collapse;font-size:13px}
.stk-table th{text-align:left;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#6B7280;padding:6px 8px;border-bottom:1px solid #E2E6EA}
.stk-table td{padding:6px 8px;border-bottom:1px solid #F1F3F5;font-variant-numeric:tabular-nums}
.stk-table td:first-child{font-family:${MONO};font-weight:600}
.stk-apercu{border:1px solid #E2E6EA;border-radius:10px;background:#E5E7EB;overflow:hidden;position:relative}
.stk-apercu iframe{border:0;background:#fff;position:absolute;left:0;top:0;transform-origin:0 0}
`;

// ─── Fenêtre (feuille) ───────────────────────────────────────────────────────────────────────────
function Feuille({titre,onFermer,large,children}){
  useEffect(()=>{
    const prec=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=prec;};
  },[]);
  return(<div className="stk-voile" onClick={e=>{if(e.target===e.currentTarget)onFermer();}}>
    <div className={"stk-feuille"+(large?" stk-large":"")} role="dialog" aria-label={titre}>
      <div className="stk-feuille-tete"><h2>{titre}</h2><button type="button" className="stk-x" onClick={onFermer} aria-label="Fermer">✕</button></div>
      <div className="stk-corps">{children}</div>
    </div>
  </div>);
}

// ─── Scanner caméra ──────────────────────────────────────────────────────────────────────────────
// Détecteur natif du navigateur (BarcodeDetector : tous formats, Chrome Android) ; à défaut jsQR (QR codes seulement).
// Une douchette Bluetooth/USB "clavier" passe par le champ de saisie : elle tape le code puis Entrée.
function ScanneurCode({titre,aide,onCode,onFermer}){
  const videoRef=useRef(null);
  const codeRef=useRef(onCode);codeRef.current=onCode;
  const [etat,setEtat]=useState("demarrage"); // demarrage | actif | erreur
  const [erreur,setErreur]=useState("");
  const [saisie,setSaisie]=useState(false);
  const [texte,setTexte]=useState("");
  const [moteur,setMoteur]=useState("");
  useEffect(()=>{
    let arrete=false,flux=null,minuterie=null,trouve=false;
    async function demarrer(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
        setErreur("La caméra n'est pas disponible ici (navigateur ou connexion non sécurisée).");setEtat("erreur");return;
      }
      try{
        flux=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false});
      }catch(e){
        setErreur(e&&e.name==="NotAllowedError"?"Autorisez l'accès à la caméra dans le navigateur, puis rouvrez le scanner.":"Impossible d'ouvrir la caméra ("+((e&&e.name)||"erreur")+").");
        setEtat("erreur");return;
      }
      if(arrete){flux.getTracks().forEach(t=>t.stop());return;}
      const v=videoRef.current;
      v.srcObject=flux;v.setAttribute("playsinline","true");v.muted=true;
      try{await v.play();}catch(e){}
      setEtat("actif");
      let detecter=null;
      if(typeof window.BarcodeDetector==="function"){
        try{
          const formats=await window.BarcodeDetector.getSupportedFormats();
          const det=new window.BarcodeDetector({formats});
          detecter=async()=>{const r=await det.detect(v);return r&&r[0]?r[0].rawValue:null;};
          setMoteur("natif");
        }catch(e){detecter=null;}
      }
      if(!detecter){
        const jsQR=(await import("jsqr")).default;
        const c=document.createElement("canvas");
        const ctx=c.getContext("2d",{willReadFrequently:true});
        detecter=async()=>{
          const w=v.videoWidth,h=v.videoHeight;
          if(!w||!h)return null;
          const k=Math.min(1,1024/w);
          c.width=Math.round(w*k);c.height=Math.round(h*k);
          ctx.drawImage(v,0,0,c.width,c.height);
          const img=ctx.getImageData(0,0,c.width,c.height);
          const r=jsQR(img.data,img.width,img.height,{inversionAttempts:"dontInvert"});
          return r?r.data:null;
        };
        setMoteur("qr");
      }
      const boucle=async()=>{
        if(arrete)return;
        try{
          const code=await detecter();
          if(code&&!trouve){
            trouve=true;
            if(navigator.vibrate)navigator.vibrate(60);
            codeRef.current(code);
            return;
          }
        }catch(e){}
        minuterie=setTimeout(boucle,140);
      };
      boucle();
    }
    demarrer();
    return()=>{arrete=true;clearTimeout(minuterie);if(flux)flux.getTracks().forEach(t=>t.stop());};
  },[]);
  function validerSaisie(){const t=texte.trim();if(t)codeRef.current(t);}
  return(<div className="stk-scan">
    <div className="stk-scan-haut">
      <strong style={{fontSize:16}}>{titre}</strong>
      <button type="button" className="stk-x" onClick={onFermer} aria-label="Fermer le scanner" style={{background:"rgba(255,255,255,.18)",color:"#fff"}}>✕</button>
    </div>
    <video ref={videoRef} autoPlay playsInline muted/>
    {etat==="actif"&&<div className="stk-viseur" aria-hidden="true"/>}
    <div className="stk-scan-bas">
      {etat==="demarrage"&&<div style={{textAlign:"center"}}>Ouverture de la caméra…</div>}
      {etat==="erreur"&&<div className="stk-alerte">{erreur}</div>}
      {etat==="actif"&&<div style={{textAlign:"center",fontSize:14}}>{aide||"Cadrez l'étiquette dans le carré."}{moteur==="qr"&&<span style={{display:"block",fontSize:12,opacity:.75}}>Ce navigateur ne lit que les QR codes.</span>}</div>}
      {saisie
        ?<div style={{display:"flex",gap:8}}>
          <input className="stk-champ" value={texte} onChange={e=>setTexte(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")validerSaisie();}} placeholder="Code ou référence" autoComplete="off" autoFocus/>
          <button type="button" className="stk-btn stk-btn--p" onClick={validerSaisie}>OK</button>
        </div>
        :<button type="button" className="stk-btn" onClick={()=>setSaisie(true)} style={{background:"transparent",color:"#fff",borderColor:"rgba(255,255,255,.5)"}}>⌨ Saisir ou scanner avec une douchette</button>}
    </div>
  </div>);
}

// ─── Code-barres / QR : génération ───────────────────────────────────────────────────────────────
async function codeSvg(type,texte){
  if(type==="qr"){
    const mod=await import("qrcode");const QR=mod.default||mod;
    return await QR.toString(texte,{type:"svg",margin:2,errorCorrectionLevel:"M"});
  }
  const mod=await import("jsbarcode");const JsBarcode=mod.default||mod;
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  JsBarcode(svg,texte,{format:"CODE128",displayValue:false,margin:0,width:2,height:60});
  const w=parseFloat(svg.getAttribute("width")),h=parseFloat(svg.getAttribute("height"));
  svg.setAttribute("viewBox","0 0 "+w+" "+h);
  svg.removeAttribute("width");svg.removeAttribute("height");
  svg.setAttribute("preserveAspectRatio","none");
  return svg.outerHTML;
}

const PRESETS=[
  {id:"papier",nom:"Papier simple, à découper (50 × 25 mm, 4 × 10)",w:50,h:25,cols:4,rows:10,mTop:15,mLeft:5,gapX:0,gapY:0,bordure:true},
  {id:"l7160",nom:"Planche adhésive 63,5 × 38,1 mm (21 par page, type Avery L7160)",w:63.5,h:38.1,cols:3,rows:7,mTop:15.1,mLeft:7.2,gapX:2.5,gapY:0,bordure:false},
  {id:"perso",nom:"Autre taille (réglages ci-dessous)",w:50,h:25,cols:4,rows:10,mTop:15,mLeft:5,gapX:0,gapY:0,bordure:true},
];

// lenMax : longueur de la plus longue référence de la planche, pour une taille de police identique partout.
function etiquetteInterieur(a,svg,w,h,type,lenMax){
  const ref=esc(a.reference),dim=esc(a.dimensions||""),emp=a.emplacement?esc("Empl. "+a.emplacement):"";
  const len=Math.max(8,lenMax||String(a.reference).length);
  if(type==="qr"){
    const q=Math.min(h-3,w*0.46);
    const tw=Math.max(8,w-q-5);
    const fs=Math.max(6,Math.min(15,(tw/(len*0.6))/0.3528));
    return '<div class="code" style="width:'+q.toFixed(1)+'mm;height:'+q.toFixed(1)+'mm">'+svg+'</div>'
      +'<div class="txt" style="width:'+tw.toFixed(1)+'mm"><b style="font-size:'+fs.toFixed(1)+'pt">'+ref+'</b><span>'+dim+'</span><span>'+emp+'</span></div>';
  }
  const fs=Math.max(7,Math.min(14,((w-6)/(len*0.62))/0.3528));
  return '<div class="l1"><b style="font-size:'+fs.toFixed(1)+'pt">'+ref+'</b></div>'
    +'<div class="barres">'+svg+'</div>'
    +'<div class="l3">'+dim+(dim&&emp?" · ":"")+emp+'</div>';
}

// Planche d'étiquettes (A4) : chaque étiquette est placée au millimètre (position absolue), donc réglable
// pour une planche adhésive du commerce ou pour du papier simple à découper. "depart" saute les cases déjà utilisées.
async function genererPlanche({articles,type,P,exemplaires,depart,bordure}){
  const liste=[];
  articles.forEach(a=>{for(let k=0;k<exemplaires;k++)liste.push(a);});
  const svgs={};
  for(const a of articles){if(!svgs[a.id])svgs[a.id]=await codeSvg(type,a.reference);}
  const lenMax=Math.max(8,...articles.map(a=>String(a.reference).length));
  const cases=Array(Math.max(0,depart-1)).fill(null).concat(liste);
  const parPage=P.cols*P.rows;
  const pages=[];
  for(let i=0;i<Math.max(cases.length,1);i+=parPage)pages.push(cases.slice(i,i+parPage));
  let corps="";
  pages.forEach(page=>{
    corps+='<div class="page">';
    page.forEach((a,i)=>{
      if(!a)return;
      const col=i%P.cols,lig=Math.floor(i/P.cols);
      const x=P.mLeft+col*(P.w+P.gapX),y=P.mTop+lig*(P.h+P.gapY);
      corps+='<div class="et '+(type==="qr"?"qr":"c128")+'" style="left:'+x.toFixed(2)+'mm;top:'+y.toFixed(2)+'mm;width:'+P.w+'mm;height:'+P.h+'mm">'+etiquetteInterieur(a,svgs[a.id],P.w,P.h,type,lenMax)+'</div>';
    });
    corps+='</div>';
  });
  return '<!doctype html><html><head><meta charset="utf-8"><title>Étiquettes</title><style>'
    +'@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'.page{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}.page:last-child{page-break-after:auto;break-after:auto}'
    +'.et{position:absolute;box-sizing:border-box;overflow:hidden;background:#fff;color:#000;display:flex;align-items:center;gap:1.5mm;padding:1.5mm'+(bordure?';border:.2mm dashed #888':'')+'}'
    +'.et.c128{flex-direction:column;align-items:stretch;justify-content:center;gap:.6mm;padding:1.5mm 3mm}'
    +'.code svg,.barres svg{display:block;width:100%;height:100%}'
    +'.barres{flex:1;min-height:5mm}'
    +'.txt{display:flex;flex-direction:column;justify-content:center;gap:.6mm;overflow:hidden}'
    +'.txt b,.l1 b{line-height:1.05;white-space:nowrap}'
    +'.txt span{font-size:7.5pt;color:#222;white-space:nowrap}'
    +'.l1{text-align:center;overflow:hidden}'
    +'.l3{font-size:7pt;color:#222;text-align:center;white-space:nowrap;overflow:hidden}'
    +'</style></head><body>'+corps+'</body></html>';
}

function Etiquettes({articles,idsInitiaux,onFermer}){
  const [ids,setIds]=useState(()=>new Set(idsInitiaux&&idsInitiaux.length?idsInitiaux:articles.map(a=>a.id)));
  const [type,setType]=useState("qr");
  const [presetId,setPresetId]=useState("papier");
  const [perso,setPerso]=useState({w:50,h:25,cols:4,rows:10,mTop:15,mLeft:5,gapX:0,gapY:0});
  const [exemplaires,setExemplaires]=useState(1);
  const [depart,setDepart]=useState(1);
  const [bordure,setBordure]=useState(true);
  const [html,setHtml]=useState(null);
  const [erreur,setErreur]=useState(null);
  const preset=PRESETS.find(p=>p.id===presetId);
  const P=presetId==="perso"?{...perso}:preset;
  const choisis=articles.filter(a=>ids.has(a.id));
  const series=[...new Set(articles.map(a=>serieDe(a.reference)))].sort();
  const larg=Math.min(typeof window!=="undefined"?window.innerWidth:800,720)-64;
  const k=Math.max(0.3,Math.min(1,larg/794));
  useEffect(()=>{
    let annule=false;
    setErreur(null);
    if(!choisis.length){setHtml(null);return;}
    const t=setTimeout(async()=>{
      try{
        const h=await genererPlanche({articles:choisis,type,P:{...P,w:+P.w,h:+P.h,cols:Math.max(1,+P.cols|0),rows:Math.max(1,+P.rows|0),mTop:+P.mTop,mLeft:+P.mLeft,gapX:+P.gapX,gapY:+P.gapY},exemplaires:Math.max(1,exemplaires|0),depart:Math.max(1,depart|0),bordure});
        if(!annule)setHtml(h);
      }catch(e){if(!annule)setErreur("Impossible de générer les étiquettes ("+((e&&e.message)||"erreur")+").");}
    },150);
    return()=>{annule=true;clearTimeout(t);};
  },[ids,type,presetId,perso,exemplaires,depart,bordure]);
  function choisirPreset(id){
    setPresetId(id);
    const p=PRESETS.find(x=>x.id===id);
    if(p)setBordure(!!p.bordure);
  }
  const basculer=id=>setIds(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const majPerso=(c,v)=>setPerso(p=>({...p,[c]:v}));
  const nbEt=choisis.length*Math.max(1,exemplaires|0);
  const parPage=Math.max(1,(+P.cols|0)*(+P.rows|0));
  const nbPages=Math.max(1,Math.ceil((nbEt+Math.max(0,(depart|0)-1))/parPage));
  return(<Feuille titre="🏷 Étiquettes code-barres" large onFermer={onFermer}>
    <p className="stk-aide">L'étiquette contient la référence de l'article : en la scannant, l'appli ouvre directement la fiche. À coller sur le casier ou la boîte.</p>
    <div>
      <span className="stk-lib">Articles ({choisis.length} sur {articles.length})</span>
      <div className="stk-chips" style={{marginTop:0,marginBottom:8}}>
        <button type="button" className="stk-chip" onClick={()=>setIds(new Set(articles.map(a=>a.id)))}>Tout</button>
        <button type="button" className="stk-chip" onClick={()=>setIds(new Set())}>Aucun</button>
        {series.map(s=><button type="button" key={s} className="stk-chip" onClick={()=>setIds(new Set(articles.filter(a=>serieDe(a.reference)===s).map(a=>a.id)))}>{s}</button>)}
      </div>
      <div className="stk-liste-sel">{articles.map(a=><label key={a.id}><input type="checkbox" checked={ids.has(a.id)} onChange={()=>basculer(a.id)}/>{a.reference}</label>)}</div>
    </div>
    <div className="stk-champs">
      <label><span>Type de code</span><select value={type} onChange={e=>setType(e.target.value)}><option value="qr">QR code (caméra de la tablette)</option><option value="code128">Code 128 (douchette classique)</option></select></label>
      <label><span>Exemplaires par article</span><input type="text" inputMode="numeric" value={exemplaires} onChange={e=>setExemplaires(parseInt(e.target.value.replace(/\D/g,""),10)||0)}/></label>
      <label><span>Commencer à l'étiquette n°</span><input type="text" inputMode="numeric" value={depart} onChange={e=>setDepart(parseInt(e.target.value.replace(/\D/g,""),10)||0)}/></label>
    </div>
    <div className="stk-champs" style={{gridTemplateColumns:"1fr"}}>
      <label><span>Format de la feuille</span><select value={presetId} onChange={e=>choisirPreset(e.target.value)}>{PRESETS.map(p=><option key={p.id} value={p.id}>{p.nom}</option>)}</select></label>
    </div>
    {presetId==="perso"&&<div className="stk-champs">
      {[["w","Largeur (mm)"],["h","Hauteur (mm)"],["cols","Colonnes"],["rows","Lignes"],["mTop","Marge haut (mm)"],["mLeft","Marge gauche (mm)"],["gapX","Écart horizontal (mm)"],["gapY","Écart vertical (mm)"]].map(([c,l])=><label key={c}><span>{l}</span><input type="text" inputMode="decimal" value={perso[c]} onChange={e=>majPerso(c,e.target.value.replace(",","."))}/></label>)}
    </div>}
    <label style={{display:"flex",alignItems:"center",gap:10,fontSize:14}}><input type="checkbox" checked={bordure} onChange={e=>setBordure(e.target.checked)} style={{width:22,height:22,minHeight:0,padding:0}}/>Tracer des traits de découpe (papier simple)</label>
    {erreur&&<div className="stk-alerte">{erreur}</div>}
    {html&&<div>
      <span className="stk-lib">Aperçu — {nbEt} étiquette{nbEt>1?"s":""}, {nbPages} page{nbPages>1?"s":""} A4</span>
      <div className="stk-apercu" style={{width:794*k,height:Math.min(1123*k,520)}}>
        <iframe title="Aperçu des étiquettes" srcDoc={html} style={{width:794,height:1123*nbPages,transform:"scale("+k+")"}} scrolling="no"/>
      </div>
      {nbPages>1&&<p className="stk-aide" style={{marginTop:6}}>Seule la première page est montrée ici ; toutes sont imprimées.</p>}
    </div>}
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      <button type="button" className="stk-btn stk-btn--p" disabled={!html} onClick={()=>lancerImpression(html)} style={{flex:"1 1 200px"}}>🖨 Imprimer</button>
      <button type="button" className="stk-btn" disabled={!html} onClick={()=>telechargerHtml(html,"etiquettes-stock")} style={{flex:"1 1 200px"}}>⬇ Télécharger (à imprimer depuis le PC)</button>
    </div>
    <p className="stk-aide">Faites d'abord un essai sur papier simple : si les cadres ne tombent pas exactement sur les étiquettes de la planche, ajustez les marges avec « Autre taille ».</p>
  </Feuille>);
}

// ─── Import du catalogue depuis Excel ────────────────────────────────────────────────────────────
const normEnt=s=>String(s==null?"":s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/\s+/g," ").replace(/\s*\?$/,"").trim();
const txt=v=>v==null?"":String(v).replace(/\s+/g," ").trim();
const nombre=v=>{
  if(v==null||v==="")return null;
  const n=typeof v==="number"?v:parseFloat(String(v).replace(/\s/g,"").replace(",",".").replace(/[^\d.\-]/g,""));
  return isNaN(n)?null:n;
};
const entier=v=>{const n=nombre(v);return n==null?null:Math.round(n);};
const dimNorm=s=>txt(s).replace(/\s*[xX×]\s*/g,"×");

// Lit une feuille "catalogue" : la ligne d'en-tête est celle qui contient "Référence" ; les lignes de titre
// (ex. "62XX", sans autre valeur) et les lignes de total sont ignorées.
function analyserFeuille(XLSX,wb,nom){
  const ws=wb.Sheets[nom];
  if(!ws)return {erreur:"Feuille introuvable."};
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
  let hi=-1;
  for(let i=0;i<Math.min(rows.length,15);i++){
    if((rows[i]||[]).some(c=>normEnt(c)==="reference")){hi=i;break;}
  }
  if(hi<0)return {erreur:"Colonne « Référence » introuvable dans les 15 premières lignes de cette feuille."};
  const ent=rows[hi].map(normEnt);
  const col=p=>ent.findIndex(p);
  const C={ref:col(h=>h==="reference"),mini:col(h=>h.startsWith("stock min")),maxi:col(h=>h.startsWith("stock max")),empl:col(h=>h.startsWith("emplacement")),dim:col(h=>h.startsWith("dimension")),stock:col(h=>h==="stock"),prix:col(h=>h==="prix unitaire"),f1:col(h=>h==="fournisseur 1"),f2:col(h=>h==="fournisseur 2"),f3:col(h=>h==="fournisseur 3")};
  const cell=(r,i)=>i>=0?r[i]:null;
  const lignes=[];let ignorees=0;
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i]||[];
    const reference=txt(cell(r,C.ref));
    if(!reference)continue;
    const l={reference,dimensions:dimNorm(cell(r,C.dim))||null,emplacement:txt(cell(r,C.empl))||null,stock_mini:entier(cell(r,C.mini)),stock_maxi:entier(cell(r,C.maxi)),prix_unitaire:nombre(cell(r,C.prix)),fournisseur1:txt(cell(r,C.f1))||null,fournisseur2:txt(cell(r,C.f2))||null,fournisseur3:txt(cell(r,C.f3))||null,stock:entier(cell(r,C.stock))};
    const autres=[l.dimensions,l.emplacement,l.stock_mini,l.stock_maxi,l.prix_unitaire,l.stock].some(v=>v!=null&&v!=="");
    if(!autres){ignorees++;continue;}
    lignes.push(l);
  }
  return {lignes,ignorees,colonnes:C};
}

async function executerImport({lignes,existants,majQte,onEtat}){
  const parRef={};lignes.forEach(l=>{parRef[cle(l.reference)]=l;});
  const catalogue=lignes.map(l=>({reference:l.reference,dimensions:l.dimensions,emplacement:l.emplacement,stock_mini:l.stock_mini,stock_maxi:l.stock_maxi,prix_unitaire:l.prix_unitaire,fournisseur1:l.fournisseur1,fournisseur2:l.fournisseur2,fournisseur3:l.fournisseur3}));
  let rows=[];
  for(let i=0;i<catalogue.length;i+=200){
    onEtat("Catalogue : "+Math.min(i+200,catalogue.length)+" / "+catalogue.length);
    const r=await appel("POST","stock_articles?on_conflict=reference",catalogue.slice(i,i+200),"resolution=merge-duplicates,return=representation");
    if(!r.ok||!Array.isArray(r.data))throw new Error((r.data&&r.data.message)||"Le catalogue n'a pas pu être enregistré.");
    rows=rows.concat(r.data);
  }
  // Les articles sans aucun mouvement reçoivent leur stock initial (celui d'Excel) ; les autres gardent leur quantité.
  onEtat("Quantités…");
  const avec=new Set();
  for(let i=0;i<rows.length;i+=80){
    const ids=rows.slice(i,i+80).map(a=>a.id).join(",");
    const r=await appel("GET","stock_mouvements?select=article_id&article_id=in.("+ids+")");
    if(!r.ok||!Array.isArray(r.data))throw new Error("Lecture des mouvements impossible.");
    r.data.forEach(d=>avec.add(d.article_id));
  }
  const mouvements=[];let initiaux=0,corriges=0;
  rows.forEach(a=>{
    const l=parRef[cle(a.reference)];
    const cible=l&&l.stock!=null?l.stock:0;
    const courant=a.quantite||0;
    if(!avec.has(a.id)){
      if(cible!==courant){mouvements.push({article_id:a.id,type:"initial",delta:cible-courant,commentaire:"Import Excel"});initiaux++;}
    }else if(majQte&&cible!==courant){
      mouvements.push({article_id:a.id,type:"inventaire",delta:cible-courant,commentaire:"Mise à jour depuis Excel"});corriges++;
    }
  });
  for(let i=0;i<mouvements.length;i+=200){
    const r=await appel("POST","stock_mouvements",mouvements.slice(i,i+200),"return=minimal");
    if(!r.ok)throw new Error("Les quantités n'ont pas pu être enregistrées.");
  }
  const nouveaux=rows.filter(a=>!existants.has(cle(a.reference))).length;
  return {total:rows.length,nouveaux,misAJour:rows.length-nouveaux,initiaux,corriges};
}

function ImportExcel({articles,onFermer,onTermine}){
  const [etape,setEtape]=useState("fichier"); // fichier | apercu | import | fini
  const [erreur,setErreur]=useState(null);
  const [occupe,setOccupe]=useState(false);
  const [fichier,setFichier]=useState(null); // {nom,buf,feuilles}
  const [feuille,setFeuille]=useState(null);
  const [prefixe,setPrefixe]=useState("6");
  const [majQte,setMajQte]=useState(false);
  const [lecture,setLecture]=useState(null);
  const [etat,setEtat]=useState("");
  const [bilan,setBilan]=useState(null);
  const inputRef=useRef(null);
  const existants=new Set(articles.map(a=>cle(a.reference)));
  async function lireFeuille(buf,nom){
    const XLSX=await import("xlsx");
    const wb=XLSX.read(buf,{type:"array",sheets:nom});
    return analyserFeuille(XLSX,wb,nom);
  }
  async function choisirFichier(e){
    const f=e.target.files&&e.target.files[0];
    if(!f)return;
    setErreur(null);setOccupe(true);
    try{
      const XLSX=await import("xlsx");
      const buf=await f.arrayBuffer();
      const meta=XLSX.read(buf,{type:"array",bookSheets:true});
      const noms=meta.SheetNames||[];
      if(!noms.length)throw new Error("Aucune feuille dans ce fichier.");
      const defaut=noms.find(n=>normEnt(n)==="rlmt")||noms.find(n=>normEnt(n).includes("roulement"))||noms[0];
      const lect=await lireFeuille(buf,defaut);
      setFichier({nom:f.name,buf,feuilles:noms});setFeuille(defaut);setLecture(lect);setEtape("apercu");
    }catch(err){setErreur("Ce fichier n'a pas pu être lu ("+((err&&err.message)||"erreur")+"). Utilisez un fichier Excel .xlsx ou .xlsm.");}
    setOccupe(false);
    if(inputRef.current)inputRef.current.value="";
  }
  async function changerFeuille(nom){
    setFeuille(nom);setOccupe(true);setErreur(null);
    try{setLecture(await lireFeuille(fichier.buf,nom));}catch(err){setErreur("Feuille illisible ("+((err&&err.message)||"erreur")+").");}
    setOccupe(false);
  }
  const pre=cle(prefixe);
  const vues=new Map();
  ((lecture&&lecture.lignes)||[]).forEach(l=>{if(!pre||cle(l.reference).startsWith(pre))vues.set(cle(l.reference),l);});
  const lignes=[...vues.values()];
  const nbDoublons=((lecture&&lecture.lignes)||[]).filter(l=>!pre||cle(l.reference).startsWith(pre)).length-lignes.length;
  const nbNouveaux=lignes.filter(l=>!existants.has(cle(l.reference))).length;
  async function importer(){
    setEtape("import");setErreur(null);
    try{
      const b=await executerImport({lignes,existants,majQte,onEtat:setEtat});
      setBilan(b);setEtape("fini");
      onTermine();
    }catch(err){setErreur((err&&err.message)||"Import interrompu.");setEtape("apercu");}
  }
  return(<Feuille titre="⬆ Importer le catalogue depuis Excel" large onFermer={onFermer}>
    {etape==="fichier"&&<>
      <p className="stk-aide">Choisissez votre fichier de stock (.xlsx ou .xlsm). L'appli lit la feuille des roulements, ajoute les nouvelles références et met à jour dimensions, emplacements, mini/maxi, prix et fournisseurs. <strong>Elle ne modifie jamais les quantités déjà suivies dans l'appli.</strong></p>
      <input ref={inputRef} type="file" accept=".xlsx,.xlsm,.xls" onChange={choisirFichier} style={{display:"none"}}/>
      <button type="button" className="stk-btn stk-btn--p" disabled={occupe} onClick={()=>inputRef.current&&inputRef.current.click()}>{occupe?"Lecture du fichier…":"📂 Choisir le fichier Excel"}</button>
    </>}
    {etape==="apercu"&&fichier&&<>
      <div className="stk-info">Fichier : <strong>{fichier.nom}</strong></div>
      <div className="stk-champs">
        <label><span>Feuille à importer</span><select value={feuille} onChange={e=>changerFeuille(e.target.value)} disabled={occupe}>{fichier.feuilles.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
        <label><span>Références commençant par</span><input type="text" value={prefixe} onChange={e=>setPrefixe(e.target.value)} placeholder="6 = roulements 6XXX"/></label>
      </div>
      {lecture&&lecture.erreur&&<div className="stk-alerte">{lecture.erreur}</div>}
      {lecture&&!lecture.erreur&&<>
        <div className="stk-info"><strong>{lignes.length}</strong> référence{lignes.length>1?"s":""} à importer : <strong>{nbNouveaux}</strong> nouvelle{nbNouveaux>1?"s":""}, <strong>{lignes.length-nbNouveaux}</strong> déjà dans l'appli (catalogue mis à jour, quantités conservées).{lecture.ignorees>0&&<> {lecture.ignorees} ligne{lecture.ignorees>1?"s":""} de titre ignorée{lecture.ignorees>1?"s":""}.</>}{nbDoublons>0&&<> {nbDoublons} doublon{nbDoublons>1?"s":""} ignoré{nbDoublons>1?"s":""}.</>}</div>
        {lignes.length>0&&<div style={{overflowX:"auto"}}><table className="stk-table"><thead><tr><th>Référence</th><th>Dimensions</th><th>Empl.</th><th>Mini</th><th>Maxi</th><th>Stock Excel</th><th>Prix</th></tr></thead><tbody>
          {lignes.slice(0,6).map(l=><tr key={l.reference}><td>{l.reference}</td><td>{l.dimensions||""}</td><td>{l.emplacement||""}</td><td>{l.stock_mini==null?"":l.stock_mini}</td><td>{l.stock_maxi==null?"":l.stock_maxi}</td><td>{l.stock==null?"":l.stock}</td><td>{fmtEuro(l.prix_unitaire)}</td></tr>)}
        </tbody></table>{lignes.length>6&&<p className="stk-aide" style={{marginTop:6}}>… et {lignes.length-6} autre{lignes.length-6>1?"s":""}.</p>}</div>}
        <p className="stk-aide">Au premier import, le « Stock » d'Excel devient le stock de départ de chaque nouvelle référence.</p>
        <label style={{display:"flex",alignItems:"flex-start",gap:10,fontSize:14}}><input type="checkbox" checked={majQte} onChange={e=>setMajQte(e.target.checked)} style={{width:22,height:22,minHeight:0,padding:0,flex:"none",marginTop:2}}/><span>Remettre aussi les quantités des références déjà suivies au « Stock » d'Excel (enregistré comme un inventaire dans l'historique). À éviter une fois l'appli utilisée.</span></label>
      </>}
      {erreur&&<div className="stk-alerte">{erreur}</div>}
      <button type="button" className="stk-btn stk-btn--p" disabled={occupe||!lignes.length||(lecture&&!!lecture.erreur)} onClick={importer}>Importer {lignes.length} référence{lignes.length>1?"s":""}</button>
    </>}
    {etape==="import"&&<div className="stk-info">Import en cours… {etat}</div>}
    {etape==="fini"&&bilan&&<>
      <div className="stk-ok"><strong>Import terminé.</strong> {bilan.total} référence{bilan.total>1?"s":""} : {bilan.nouveaux} ajoutée{bilan.nouveaux>1?"s":""}, {bilan.misAJour} mise{bilan.misAJour>1?"s":""} à jour. {bilan.initiaux>0&&<>Stock de départ enregistré pour {bilan.initiaux} référence{bilan.initiaux>1?"s":""}. </>}{bilan.corriges>0&&<>{bilan.corriges} quantité{bilan.corriges>1?"s":""} remise{bilan.corriges>1?"s":""} à jour.</>}</div>
      <button type="button" className="stk-btn stk-btn--p" onClick={onFermer}>Terminer</button>
    </>}
    {erreur&&etape==="fichier"&&<div className="stk-alerte">{erreur}</div>}
  </Feuille>);
}

// ─── Fiche d'un article : mouvements, historique, codes ──────────────────────────────────────────
function FicheArticle({article,techs,sessionTech,depuisScan,onFermer,onChange,onEtiquette,onAssocier,onTermineScan}){
  const liste=(techs||[]).filter(t=>t!=="Autre");
  const stock=article.quantite||0;
  const [mode,setMode]=useState("sortie"); // sortie | entree | inventaire
  const [qte,setQte]=useState("1");
  const [chantier,setChantier]=useState("");
  const [qui,setQui]=useState(liste.includes(sessionTech)?sessionTech:null);
  const [commentaire,setCommentaire]=useState("");
  const [envoi,setEnvoi]=useState({enCours:false,erreur:null});
  const [fait,setFait]=useState(null);
  const [histo,setHisto]=useState(null);
  const [codes,setCodes]=useState(null);
  const [qr,setQr]=useState("");
  const n=parseInt(qte,10);
  const valide=!isNaN(n)&&(mode==="inventaire"?n>=0:n>=1);
  const delta=!valide?0:mode==="sortie"?-n:mode==="entree"?n:n-stock;
  const apres=stock+delta;
  const chargerHisto=useCallback(async()=>{
    const r=await appel("GET","stock_mouvements?article_id=eq."+article.id+"&order=created_at.desc&limit=12");
    setHisto(r.ok&&Array.isArray(r.data)?r.data:[]);
  },[article.id]);
  const chargerCodes=useCallback(async()=>{
    const r=await appel("GET","stock_codes?article_id=eq."+article.id+"&select=code,created_at&order=created_at");
    setCodes(r.ok&&Array.isArray(r.data)?r.data:[]);
  },[article.id]);
  useEffect(()=>{chargerHisto();chargerCodes();},[chargerHisto,chargerCodes]);
  useEffect(()=>{let a=false;codeSvg("qr",article.reference).then(s=>{if(!a)setQr(s);}).catch(()=>{});return()=>{a=true;};},[article.reference]);
  function changerMode(m){setMode(m);setFait(null);setEnvoi({enCours:false,erreur:null});setQte(m==="inventaire"?String(stock):"1");}
  const ajuster=d=>{setFait(null);setQte(String(Math.max(mode==="inventaire"?0:1,(isNaN(n)?0:n)+d)));};
  async function valider(){
    if(!valide||!qui||delta===0||envoi.enCours)return;
    setEnvoi({enCours:true,erreur:null});
    const ok=await enregistrerMouvement({article_id:article.id,type:mode,delta,chantier:mode==="sortie"?(normChantier(chantier)||null):null,utilisateur:qui,commentaire:commentaire.trim()||null});
    if(!ok){setEnvoi({enCours:false,erreur:"L'enregistrement n'a pas abouti (connexion ?). Rien n'a été modifié : réessayez."});return;}
    setEnvoi({enCours:false,erreur:null});
    const resume=mode==="sortie"?"Sortie de "+n+" × "+article.reference+" enregistrée":mode==="entree"?"Entrée de "+n+" × "+article.reference+" enregistrée":"Inventaire de "+article.reference+" : "+n+" enregistré";
    await onChange();
    if(depuisScan){onTermineScan("✓ "+resume+" — stock : "+apres);return;}
    setFait("✓ "+resume+" — stock : "+apres);
    setQte(mode==="inventaire"?String(apres):"1");setChantier("");setCommentaire("");
    chargerHisto();
  }
  const reco=aRecommander(article);
  const etatStock=stock<=0?"vide":reco?"bas":"";
  return(<Feuille titre={article.reference} onFermer={onFermer}>
    <div className="stk-stock">
      <div><span className="stk-lib" style={{marginBottom:2}}>En stock</span><span className={"stk-stock-n "+etatStock}>{stock}</span>{reco&&<span className="stk-badge">À recommander : {qteARecommander(article)}</span>}{stock<=0&&<span className="stk-badge stk-badge--r">Rupture</span>}</div>
      <div style={{fontSize:13,color:"#6B7280",textAlign:"right"}}>{article.stock_mini!=null&&<div>mini {article.stock_mini}{article.stock_maxi!=null?" · maxi "+article.stock_maxi:""}</div>}{article.prix_unitaire!=null&&<div>{fmtEuro(article.prix_unitaire)} / pièce · valeur {fmtEuro(stock*article.prix_unitaire)}</div>}</div>
    </div>
    <div className="stk-infos">
      {article.dimensions&&<div><b>Dimensions</b>{article.dimensions}</div>}
      {article.emplacement&&<div><b>Emplacement</b>{article.emplacement}</div>}
      {(article.fournisseur1||article.fournisseur2||article.fournisseur3)&&<div><b>Fournisseurs</b>{[article.fournisseur1,article.fournisseur2,article.fournisseur3].filter(Boolean).join(" · ")}</div>}
    </div>
    <div className="stk-seg" role="group" aria-label="Type de mouvement">
      {[["sortie","Sortie"],["entree","Entrée"],["inventaire","Inventaire"]].map(([m,l])=><button type="button" key={m} className={mode===m?"on "+m:""} aria-pressed={mode===m} onClick={()=>changerMode(m)}>{l}</button>)}
    </div>
    <div>
      <span className="stk-lib">{mode==="inventaire"?"Quantité comptée en rayon":"Quantité"}</span>
      <div className="stk-qs"><button type="button" onClick={()=>ajuster(-1)} aria-label="Diminuer">−</button><input type="text" inputMode="numeric" value={qte} onChange={e=>{setFait(null);setQte(e.target.value.replace(/\D/g,""));}} aria-label="Quantité"/><button type="button" onClick={()=>ajuster(1)} aria-label="Augmenter">+</button></div>
      {valide&&<span style={{marginLeft:14,fontSize:14,color:apres<0?"#B42318":"#4B5563"}}>Stock après : <strong>{apres}</strong>{mode==="inventaire"&&delta!==0&&<> (écart {delta>0?"+":""}{delta})</>}</span>}
    </div>
    {mode==="sortie"&&valide&&n>stock&&<div className="stk-alerte">Attention : il n'y a que {stock} en stock. La sortie sera enregistrée quand même (stock négatif : à vérifier lors d'un inventaire).</div>}
    {mode==="sortie"&&<label><span className="stk-lib">N° de chantier — facultatif</span><input className="stk-champ" value={chantier} onChange={e=>setChantier(e.target.value)} onBlur={()=>setChantier(c=>normChantier(c))} placeholder="7945 devient DE7945" autoComplete="off"/></label>}
    <div>
      <span className="stk-lib">Qui ?</span>
      <div className="stk-rang">{liste.map(t=><button type="button" key={t} className={"stk-tech"+(qui===t?" on":"")} aria-pressed={qui===t} onClick={()=>setQui(qui===t?null:t)}>{t}</button>)}</div>
    </div>
    <label><span className="stk-lib">Commentaire — facultatif</span><input className="stk-champ" value={commentaire} onChange={e=>setCommentaire(e.target.value)} autoComplete="off"/></label>
    {envoi.erreur&&<div className="stk-alerte">{envoi.erreur}</div>}
    {fait&&<div className="stk-ok">{fait}</div>}
    <button type="button" className={"stk-btn "+(mode==="sortie"?"stk-btn--r":mode==="entree"?"stk-btn--v":"stk-btn--p")} disabled={!valide||!qui||delta===0||envoi.enCours} onClick={valider}>
      {envoi.enCours?"Enregistrement…":mode==="sortie"?"Enregistrer la sortie de "+(valide?n:"…"):mode==="entree"?"Enregistrer l'entrée de "+(valide?n:"…"):"Enregistrer l'inventaire"}
    </button>
    {!qui&&<p className="stk-aide">Choisissez qui fait le mouvement pour pouvoir l'enregistrer.</p>}
    {mode==="inventaire"&&valide&&delta===0&&<p className="stk-aide">Le comptage est identique au stock : rien à enregistrer.</p>}
    <div>
      <span className="stk-lib">Historique</span>
      {histo===null?<p className="stk-aide">Chargement…</p>:histo.length===0?<p className="stk-aide">Aucun mouvement pour le moment.</p>
        :<div className="stk-histo">{histo.map(m=><div key={m.id}><span className="d">{fmtDate(m.created_at)}</span><span className={"q "+(m.delta<0?"neg":"pos")}>{m.delta>0?"+":""}{m.delta}</span><span>{TYPES_MVT[m.type]||m.type}{m.chantier?" · "+m.chantier:""}{m.utilisateur?" · "+m.utilisateur:""}{m.commentaire?" — "+m.commentaire:""}</span></div>)}</div>}
    </div>
    <div>
      <span className="stk-lib">Étiquette et codes</span>
      <div className="stk-code">
        {qr&&<div className="qr" dangerouslySetInnerHTML={{__html:qr}}/>}
        <div style={{flex:"1 1 200px",fontSize:13.5,color:"#4B5563"}}>
          Code de l'étiquette : <strong style={{fontFamily:MONO}}>{article.reference}</strong>
          {codes&&codes.length>0&&<div style={{marginTop:4}}>Codes associés : {codes.map(c=>c.code).join(", ")}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
        <button type="button" className="stk-btn stk-btn--s" onClick={()=>onEtiquette(article)}>🏷 Imprimer l'étiquette</button>
        <button type="button" className="stk-btn stk-btn--s" onClick={()=>onAssocier(article)}>📷 Associer un code fabricant</button>
      </div>
    </div>
  </Feuille>);
}

function CodeInconnu({code,articles,onFermer,onAssocie}){
  const [q,setQ]=useState("");
  const [erreur,setErreur]=useState(null);
  const [occupe,setOccupe]=useState(false);
  const qc=cle(q);
  const res=qc?articles.filter(a=>cle(a.reference).includes(qc)||cle(a.dimensions).includes(qc)).slice(0,8):[];
  async function lier(a){
    setOccupe(true);setErreur(null);
    const r=await appel("POST","stock_codes?on_conflict=code",{code,article_id:a.id},"resolution=merge-duplicates,return=representation");
    setOccupe(false);
    if(!r.ok){setErreur("L'association n'a pas abouti. Réessayez.");return;}
    onAssocie(a);
  }
  return(<Feuille titre="Code inconnu" onFermer={onFermer}>
    <div className="stk-info">Le code <strong style={{fontFamily:MONO}}>{code}</strong> n'est associé à aucun article.</div>
    <p className="stk-aide">Si c'est le code imprimé par le fabricant sur la boîte, associez-le à un article : la prochaine fois, il sera reconnu tout seul.</p>
    <input className="stk-champ" value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher l'article (ex. 6205)" autoComplete="off"/>
    {res.length>0&&<div className="stk-liste" style={{marginTop:0}}>{res.map(a=><button type="button" key={a.id} className="stk-carte" disabled={occupe} onClick={()=>lier(a)}><div><div className="stk-ref">{a.reference}</div><div className="stk-sub">{a.dimensions||""}</div></div><div className="stk-sub">Associer</div></button>)}</div>}
    {erreur&&<div className="stk-alerte">{erreur}</div>}
  </Feuille>);
}

// ─── Page Stock ──────────────────────────────────────────────────────────────────────────────────
export default function PageStock({techs,sessionTech}){
  const {articles,disponible,recharger}=useStock();
  const [recherche,setRecherche]=useState("");
  const [serie,setSerie]=useState("toutes");
  const [filtre,setFiltre]=useState("tous");
  const [ficheId,setFicheId]=useState(null);
  const [depuisScan,setDepuisScan]=useState(false);
  const [scan,setScan]=useState(null); // null | {mode:"mouvement"} | {mode:"associer",article}
  const [inconnu,setInconnu]=useState(null);
  const [importOuvert,setImportOuvert]=useState(false);
  const [etiquettes,setEtiquettes]=useState(null); // null | {ids:[...]}
  const [toast,setToast]=useState(null);
  const toastRef=useRef(null);
  const afficherToast=useCallback(t=>{setToast(t);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),4200);},[]);
  useEffect(()=>()=>clearTimeout(toastRef.current),[]);

  const article=ficheId?articles.find(a=>a.id===ficheId):null;
  const series=[...new Set(articles.map(a=>serieDe(a.reference)))].sort();
  const q=cle(recherche);
  const visibles=articles.filter(a=>
    (serie==="toutes"||serieDe(a.reference)===serie)
    &&(filtre==="tous"||(filtre==="reco"&&aRecommander(a))||(filtre==="rupture"&&(a.quantite||0)<=0))
    &&(!q||cle(a.reference).includes(q)||cle(a.dimensions).includes(q)||cle(a.emplacement).includes(q)));
  const nbReco=articles.filter(aRecommander).length;
  const nbRupture=articles.filter(a=>(a.quantite||0)<=0).length;
  const valeur=articles.reduce((s,a)=>s+Math.max(0,a.quantite||0)*(a.prix_unitaire||0),0);

  async function traiterCode(brut){
    const code=String(brut||"").trim();
    if(!code)return;
    const mode=scan&&scan.mode;
    const cible=scan&&scan.article;
    // 1. référence exacte (étiquettes de l'appli)  2. code fabricant déjà associé
    let a=articles.find(x=>cle(x.reference)===cle(code));
    if(!a){
      const r=await appel("GET","stock_codes?code=eq."+encodeURIComponent(code)+"&select=article_id");
      if(r.ok&&Array.isArray(r.data)&&r.data[0])a=articles.find(x=>x.id===r.data[0].article_id);
    }
    if(mode==="associer"&&cible){
      setScan(null);
      const r=await appel("POST","stock_codes?on_conflict=code",{code,article_id:cible.id},"resolution=merge-duplicates,return=representation");
      afficherToast(r.ok?"✓ Code "+code+" associé à "+cible.reference:"L'association n'a pas abouti");
      setFicheId(cible.id);setDepuisScan(false);
      return;
    }
    setScan(null);
    if(a){setDepuisScan(true);setFicheId(a.id);}
    else setInconnu(code);
  }
  function terminerScan(message){
    setFicheId(null);setDepuisScan(false);
    afficherToast(message);
    setScan({mode:"mouvement"}); // enchaîne : on peut scanner l'article suivant
  }
  function ouvrirFiche(a){setDepuisScan(false);setFicheId(a.id);}
  async function exporter(){
    try{
      const XLSX=await import("xlsx");
      const lignes=articles.map(a=>({"Référence":a.reference,"Dimensions":a.dimensions||"","Emplacement":a.emplacement||"","Stock minimum":a.stock_mini,"Stock maximum":a.stock_maxi,"Stock":a.quantite||0,"Prix unitaire":a.prix_unitaire,"Valeur du stock":(a.quantite||0)*(a.prix_unitaire||0),"À recommander":aRecommander(a)?"Oui":"Non","Quantité à recommander":aRecommander(a)?qteARecommander(a):0,"Fournisseur 1":a.fournisseur1||"","Fournisseur 2":a.fournisseur2||"","Fournisseur 3":a.fournisseur3||""}));
      const ws=XLSX.utils.json_to_sheet(lignes);
      ws["!cols"]=[{wch:16},{wch:14},{wch:12},{wch:8},{wch:8},{wch:8},{wch:10},{wch:12},{wch:12},{wch:10},{wch:14},{wch:14},{wch:14}];
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Stock");
      const buf=XLSX.write(wb,{type:"array",bookType:"xlsx"});
      const d=new Date();const p=n=>String(n).padStart(2,"0");
      telechargerFichier(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"stock_"+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+".xlsx");
    }catch(e){afficherToast("Export impossible");}
  }

  if(disponible===false){
    return(<div className="stk"><style>{CSS_STOCK}</style>
      <div className="stk-tete"><h2>🗃 Stock</h2></div>
      <div style={{marginTop:14}}><NoticeActivation titre="Une étape reste à faire pour activer le stock" intro="La base de données doit recevoir trois petites tables (articles, mouvements, codes). C'est à faire une seule fois, par le responsable (compte Supabase)." sql={SQL_STOCK} onVerifier={recharger}/></div>
    </div>);
  }
  return(<div className="stk"><style>{CSS_STOCK}</style>
    <div className="stk-tete"><h2>🗃 Stock — roulements</h2><p className="stk-sous">Le catalogue vient d'Excel ; les quantités se suivent ici.</p></div>
    <div className="stk-actions">
      <button type="button" className="stk-big stk-big--p" onClick={()=>setScan({mode:"mouvement"})} disabled={!articles.length}>📷 Scanner</button>
      <button type="button" className="stk-big" onClick={()=>setEtiquettes({ids:[]})} disabled={!articles.length}>🏷 Étiquettes</button>
      <button type="button" className="stk-big" onClick={()=>setImportOuvert(true)}>⬆ Importer Excel</button>
      <button type="button" className="stk-big" onClick={exporter} disabled={!articles.length}>⬇ Exporter</button>
    </div>
    {disponible===null&&<p className="stk-aide">Chargement…</p>}
    {disponible===true&&articles.length===0&&<div className="stk-vide">
      <div><strong>Aucun article pour le moment.</strong><br/>Importez la feuille des roulements de votre fichier Excel pour démarrer.</div>
      <button type="button" className="stk-btn stk-btn--p" onClick={()=>setImportOuvert(true)}>⬆ Importer depuis Excel</button>
    </div>}
    {articles.length>0&&<>
      <p className="stk-resume"><span><b>{articles.length}</b> références</span><span><b>{nbReco}</b> à recommander</span><span><b>{nbRupture}</b> en rupture</span><span>Valeur du stock <b>{fmtEuro(valeur)}</b></span></p>
      <input className="stk-champ" value={recherche} onChange={e=>setRecherche(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){const a=articles.find(x=>cle(x.reference)===cle(recherche));if(a){setRecherche("");ouvrirFiche(a);}}}} placeholder="🔍 Référence, dimensions, emplacement (ou scanner avec une douchette)" autoComplete="off"/>
      <div className="stk-chips">
        <button type="button" className={"stk-chip"+(serie==="toutes"?" on":"")} onClick={()=>setSerie("toutes")}>Toutes</button>
        {series.map(s=><button type="button" key={s} className={"stk-chip"+(serie===s?" on":"")} onClick={()=>setSerie(s)}>{s}</button>)}
        <span style={{width:8}}/>
        {[["tous","Tous"],["reco","À recommander ("+nbReco+")"],["rupture","Rupture ("+nbRupture+")"]].map(([id,l])=><button type="button" key={id} className={"stk-chip"+(filtre===id?" on":"")} onClick={()=>setFiltre(id)}>{l}</button>)}
      </div>
      <div className="stk-liste">
        {visibles.length===0&&<div className="stk-vide">Aucune référence ne correspond.</div>}
        {visibles.map(a=>{
          const st=a.quantite||0,reco=aRecommander(a),etat=st<=0?"vide":reco?"bas":"";
          return(<button type="button" key={a.id} className={"stk-carte "+etat} onClick={()=>ouvrirFiche(a)}>
            <div style={{minWidth:0}}>
              <div><span className="stk-ref">{a.reference}</span>{reco&&st>0&&<span className="stk-badge">À recommander</span>}{st<=0&&<span className="stk-badge stk-badge--r">Rupture</span>}</div>
              <div className="stk-sub">{[a.dimensions,a.emplacement&&"Empl. "+a.emplacement].filter(Boolean).join(" · ")}</div>
            </div>
            <div className={"stk-qte "+etat}>{st}<small>{a.stock_mini!=null?"mini "+a.stock_mini+(a.stock_maxi!=null?" · maxi "+a.stock_maxi:""):"en stock"}</small></div>
          </button>);
        })}
      </div>
    </>}

    {article&&<FicheArticle key={article.id} article={article} techs={techs} sessionTech={sessionTech} depuisScan={depuisScan} onFermer={()=>{setFicheId(null);setDepuisScan(false);}} onChange={recharger} onEtiquette={a=>setEtiquettes({ids:[a.id]})} onAssocier={a=>{setFicheId(null);setScan({mode:"associer",article:a});}} onTermineScan={terminerScan}/>}
    {scan&&<ScanneurCode titre={scan.mode==="associer"?"Associer un code à "+scan.article.reference:"Scanner une étiquette"} aide={scan.mode==="associer"?"Scannez le code imprimé sur la boîte du fabricant.":undefined} onCode={traiterCode} onFermer={()=>setScan(null)}/>}
    {inconnu&&<CodeInconnu code={inconnu} articles={articles} onFermer={()=>setInconnu(null)} onAssocie={a=>{setInconnu(null);afficherToast("✓ Code associé à "+a.reference);ouvrirFiche(a);}}/>}
    {importOuvert&&<ImportExcel articles={articles} onFermer={()=>setImportOuvert(false)} onTermine={recharger}/>}
    {etiquettes&&<Etiquettes articles={articles} idsInitiaux={etiquettes.ids} onFermer={()=>setEtiquettes(null)}/>}
    {toast&&<div className="stk-toast" role="status">{toast}</div>}
  </div>);
}
