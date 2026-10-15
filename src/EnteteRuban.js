// Nouveau bandeau (design « bureau d'études », essai) : barre du haut + les onglets de l'application, tous visibles, avec icône,
// repères de groupe et pastilles de comptage. Utilisé seulement quand le design est activé (themeBureau.js) ; sinon l'en-tête habituel s'affiche.
import React,{useEffect,useRef,useState} from "react";

const ICONES={
  dashboard:'<path d="M3 3h8v8H3zM13 3h8v5h-8zM13 11h8v10h-8zM3 13h8v8H3z"/>',
  accueil:'<circle cx="12" cy="12" r="3.3"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.3 2.3M16.4 16.4l2.3 2.3M18.7 5.3l-2.3 2.3M7.6 16.4l-2.3 2.3"/>',
  chantier:'<path d="M4 21V3h10v18M14 8h6v13M2 21h20M8 7h2M8 11h2M8 15h2"/>',
  planning:'<path d="M4 3v18M4 7h9M8 12h11M12 17h8"/>',
  rapport:'<path d="M3 5h18v14H3zM3 6.5l9 7 9-7"/>',
  suivi:'<path d="M3 4h3l2.4 11h10.2L21 7.5H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17.5" cy="19.5" r="1.3"/>',
  commandes:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9"/>',
  stock:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9"/>',
  calendrier:'<path d="M4 6h16v14H4zM4 10.5h16M8.5 3v5M15.5 3v5"/>',
  devis:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  clients:'<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0M16 4.8a3.4 3.4 0 0 1 0 6.4M18.5 14.6a6.5 6.5 0 0 1 3 5.9"/>',
  stats:'<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>'
};
const LIBELLES={dashboard:"Tableau de bord",accueil:"Fiche Atelier",chantier:"Fiche Chantier",planning:"Planning",rapport:"Rapport",suivi:"Matériel",commandes:"Commandes",stock:"Stock",calendrier:"Calendrier",devis:"Suivi clients",clients:"Clients",stats:"Stats"};
const GROUPES={dashboard:"Accueil",accueil:"Fiches et planning",chantier:"Fiches et planning",planning:"Fiches et planning",rapport:"Fiches et planning",suivi:"Matériel",commandes:"Matériel",stock:"Matériel",calendrier:"Suivi",devis:"Suivi",clients:"Suivi",stats:"Suivi"};
// pages qui ne sont pas des onglets : le nom s'affiche tout de même dans la barre du haut
const AUTRES={fiche:"Fiche",choix:"Nouvelle fiche",stockage:"Stockage",acces:"Accès",demande:"Demande de matériel"};

function Icone({id}){
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" dangerouslySetInnerHTML={{__html:ICONES[id]||ICONES.dashboard}}/>;
}

export default function EnteteRuban({navItems,page,onPage,badges,logo,largeur,onLogo,chip,stockage}){
  const refRuban=useRef(null);
  const refHaut=useRef(null);
  const [visible,setVisible]=useState(true);
  // le bandeau défile avec la page : quand il n'est plus à l'écran, la barre du haut propose « ▲ Menu » pour y remonter
  useEffect(()=>{
    const el=refRuban.current;
    if(!el||typeof IntersectionObserver==="undefined")return undefined;
    const haut=refHaut.current?refHaut.current.offsetHeight:52;
    const io=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{rootMargin:"-"+haut+"px 0px 0px 0px"});
    io.observe(el);
    return()=>io.disconnect();
  },[largeur]);
  const groupes=[];
  navItems.forEach(n=>{
    const g=GROUPES[n.id]||"Suivi";const dernier=groupes[groupes.length-1];
    if(dernier&&dernier.nom===g)dernier.items.push(n);else groupes.push({nom:g,items:[n]});
  });
  const etroit=largeur<600,moyen=!etroit&&largeur<1000,grand=largeur>=1400;
  const colonnes=Math.ceil(navItems.length/2);
  const titre=LIBELLES[page]||AUTRES[page]||"";
  return(<>
    <div className="pmvb-top" ref={refHaut}>
      <img className="pmvb-logo" src={logo} alt="PMV" onClick={onLogo}/>
      {largeur>=480&&<span className="pmvb-mot">ATELIER</span>}
      {titre&&(!etroit||!visible)&&<span className="pmvb-page">{titre}</span>}
      <span className="pmvb-droite">
        {!visible&&<button type="button" className="pmvb-menu" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>▲ Menu</button>}
        {chip}{stockage}
      </span>
    </div>
    <nav ref={refRuban} className={"pmvb-rub"+(etroit?" etroit":moyen?" moyen":grand?" large":"")} aria-label="Menu principal" style={etroit?{gridTemplateColumns:"repeat("+colonnes+",minmax(0,1fr))"}:undefined}>
      {groupes.map(g=>(
        <div className="pmvb-gr" key={g.nom} style={etroit?undefined:{flex:g.items.length+" 1 0"}}>
          <span className="pmvb-cap">{g.nom}</span>
          <div className="pmvb-ts">
            {g.items.map(n=>{
              const b=badges&&badges[n.id];
              return(<button type="button" key={n.id} className={"pmvb-t"+(page===n.id?" on":"")} onClick={()=>onPage(n.id)} aria-current={page===n.id?"page":undefined}>
                <Icone id={n.id}/>
                <span>{LIBELLES[n.id]||n.label}</span>
                {b&&b.n>0&&<b className={"pmvb-nb"+(b.c==="bad"?" bad":"")}>{b.n}</b>}
              </button>);
            })}
          </div>
        </div>
      ))}
    </nav>
  </>);
}
