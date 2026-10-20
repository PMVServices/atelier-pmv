// Aperçu modifiable des rapports (Maintenance → Rapports → « Aperçu modifiable ») : style et script ajoutés au rapport HTML en mode édition.
// Chaque bloc du rapport est enveloppé dans <div class="ed" data-ancre="rubrique" data-kind="h1|h2|texte|bloc" [data-bloc="réglage"]> ; au survol (ou au toucher)
// la rubrique est repérée et une petite barre d'outils propose de la modifier, la masquer, ou d'ajouter un bloc avant / après. Les clics partent vers
// la page Maintenance (postMessage {pmv:"ed", act, id | bloc}). Jamais utilisé hors de la Maintenance : ni dans l'aperçu normal, ni dans le PDF, ni dans le Word.
// pages fluides (le cadre est étroit) et couverture masquée : seul le contenu se modifie
export const EDITION_CSS=
  ".cover{display:none;}"+
  ".page{width:auto!important;max-width:210mm;min-height:0!important;margin:8px auto!important;padding:8mm!important;box-sizing:border-box;}"+
  ".ed{position:relative;}"+
  ".ed-sel{box-shadow:-6px 0 0 #1B4F8A;background:rgba(27,79,138,.07);}"+
  ".ed-sel.ed-perso{box-shadow:-6px 0 0 #22863A;background:rgba(34,134,58,.08);}";

// Le script est écrit comme une fonction (donc vérifié à la compilation) puis envoyé tel quel dans la page du rapport.
function installerEdition(){
  var barre=document.createElement("div");
  barre.style.cssText="position:absolute;z-index:99999;display:none;background:#1B4F8A;color:#fff;border-radius:6px;padding:2px;font:12px Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap;";
  document.body.appendChild(barre);
  var courant=[];
  function envoyer(o){o.pmv="ed";parent.postMessage(o,"*");}
  function bouton(txt,act,extra,rouge){
    var b=document.createElement("button");
    b.type="button";b.textContent=txt;
    b.style.cssText="background:"+(rouge?"#D73A49":"transparent")+";color:#fff;border:0;padding:5px 8px;cursor:pointer;font:inherit;border-radius:4px;";
    b.onclick=function(ev){ev.stopPropagation();var m={act:act};for(var k in extra)m[k]=extra[k];envoyer(m);};
    return b;
  }
  function groupe(el){
    var bloc=el.getAttribute("data-bloc"),anc=el.getAttribute("data-ancre"),tous=document.querySelectorAll(".ed"),g=[];
    for(var i=0;i<tous.length;i++){
      var a=tous[i];
      if(bloc){if(a.getAttribute("data-bloc")===bloc)g.push(a);}
      else if(!a.getAttribute("data-bloc")&&a.getAttribute("data-ancre")===anc)g.push(a);
    }
    return g;
  }
  function selectionner(el){
    var g=groupe(el);
    if(courant.length&&courant[0]===g[0]&&courant.length===g.length)return;
    courant.forEach(function(x){x.classList.remove("ed-sel");x.classList.remove("ed-perso");});
    courant=g;
    var bloc=el.getAttribute("data-bloc"),anc=el.getAttribute("data-ancre"),kind=el.getAttribute("data-kind");
    barre.innerHTML="";
    if(bloc){
      barre.appendChild(bouton("✏ Modifier bloc","bloc-modifier",{bloc:bloc}));
      barre.appendChild(bouton("▲","bloc-haut",{bloc:bloc}));
      barre.appendChild(bouton("▼","bloc-bas",{bloc:bloc}));
      barre.appendChild(bouton("🗑","bloc-retirer",{bloc:bloc},true));
    }else if(anc&&kind){
      if(kind==="h1"||kind==="h2")barre.appendChild(bouton("✏ Renommer","modifier-texte",{id:anc}));
      if(kind==="texte")barre.appendChild(bouton("✏ Texte","modifier-texte",{id:anc}));
      barre.appendChild(bouton("🚫 Masquer","masquer",{id:anc}));
      barre.appendChild(bouton("＋ Avant","avant",{id:anc}));
      barre.appendChild(bouton("＋ Après","apres",{id:anc}));
    }else{barre.style.display="none";return;}
    g.forEach(function(x){x.classList.add("ed-sel");if(bloc)x.classList.add("ed-perso");});
    var r=g[0].getBoundingClientRect();
    barre.style.display="block";
    barre.style.top=Math.max(window.scrollY+2,window.scrollY+r.top-32)+"px";
    barre.style.left=Math.max(4,window.scrollX+r.left)+"px";
  }
  document.addEventListener("mouseover",function(e){var el=e.target.closest&&e.target.closest(".ed");if(el)selectionner(el);});
  document.addEventListener("click",function(e){var el=e.target.closest&&e.target.closest(".ed");if(el)selectionner(el);});
}
export const EDITION_SCRIPT="<script>("+installerEdition.toString()+")();</scr"+"ipt>";
