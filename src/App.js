import React, { useState, useCallback, useEffect, useRef } from "react";
import {genHtml, imprimerFiche, telechargerZip} from "./pdfUtils";

const LOGO_B64 = "data:image/jpeg;base64,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";
const SUPA_URL = "https://pupbzngvudprcweukuoi.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
const H = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY};
// LOGO_B64 moved to pdfUtils.js
// LOGO_B64 is in pdfUtils.js;
const db = {
  async get(t,p=""){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{headers:{...H,"Prefer":"return=representation"}});return r.json();}catch(e){return[];}},
  async post(t,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t,{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async patch(t,p,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async del(t,p){try{await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"DELETE",headers:H});}catch(e){}},
  async uploadPhoto(path,file){const r=await fetch(SUPA_URL+"/storage/v1/object/photos/"+path,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":file.type,"x-upsert":"true"},body:file});if(!r.ok){const e=await r.text();throw new Error(e);}return true;},
  photoUrl(path){return SUPA_URL+"/storage/v1/object/public/photos/"+path;}
};

const PIN_CODE="3739",PIN_KEY="pmv_pin_ok";
const TECHNICIENS_FB=["AD","CB","JM","KD","CD","RC","MC","DN","EL","Autre"];
const CATS_FB=["Vue d'ensemble","Plaque moteur","Plaque pompe","Plaque ventilation","Plaque réducteur","Autre plaque","Stator avant","Stator arrière","Rotor","Flasque avant","Flasque arrière","Arbre avant","Arbre arrière","Divers"];
const ROULEMENTS=["608 ZZ C3","608 RSH","6000 ZZ C3","6001 ZZ C3","6002 ZZ C3","6003 ZZ C3","6004 ZZ C3","6005 ZZ C3","6006 ZZ C3","6007 ZZ C3","6008 ZZ C3","6009 ZZ C3","6010 ZZ C3","6011 ZZ C3","6200 ZZ C3","6201 ZZ C3","6202 ZZ C3","6203 ZZ C3","6204 ZZ C3","6205 ZZ C3","6206 ZZ C3","6207 ZZ C3","6208 ZZ C3","6209 ZZ C3","6210 ZZ C3","6211 ZZ C3","6212 ZZ C3","6213 ZZ C3","6214 ZZ C3","6215 ZZ C3","6216 ZZ C3","6217 ZZ C3","6217 C3","6218 ZZ C3","6218 C3","6219 ZZ C3","6219 C3","6300 ZZ C3","6301 ZZ C3","6302 ZZ C3","6303 ZZ C3","6304 ZZ C3","6305 ZZ C3","6306 ZZ C3","6307 ZZ C3","6308 ZZ C3","6309 ZZ C3","6310 ZZ C3","6311 ZZ C3","6312 ZZ C3","6313 ZZ C3","6314 ZZ C3","6315 ZZ C3","6316 ZZ C3","6317 ZZ C3","6317 C3","6318 ZZ C3","6318 C3","6319 ZZ C3","6319 C3","NU 206 C3","NU 208 C3","NU 209 C3","NU 210 C3","NU 212 C3","NU 213 C3","NU 214 C3","NU 215 C3","NU 308 C3","NU 309 C3","NU 310 C3","NU 311 C3","NU 312 C3","NU 313 C3","NU 314 C3","NU 315 C3","NU 316 C3","NU 319 C3","NU 322 C3","Autre"];
const SEUIL_OMEGA=300;
const ETAPES=["Entrée","Infos électriques","Information rotation avant démontage","Information matériel au démontage","Information des essais après remontage"];
const STATUTS_CHANTIER=[
  {id:"A_demonter",label:"À démonter",color:"#D73A49",bg:"#FFF5F5"},
  {id:"Devis",label:"Devis",color:"#E8720C",bg:"#FFF8E1"},
  {id:"En_commande",label:"En commande",color:"#1B4F8A",bg:"#EEF4FF"},
  {id:"A_remonter",label:"À remonter",color:"#22863A",bg:"#F0FFF4"},
  {id:"Termine",label:"Terminé",color:"#6B7280",bg:"#F5F6F8"},
  {id:"Abandonne",label:"Abandonné",color:"#9B59B6",bg:"#F5EEF8"},
];
const SUPA_URL_STORAGE="https://pupbzngvudprcweukuoi.supabase.co";
const SUPA_KEY_STORAGE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
const STORAGE_LIMIT_GO=1;
const STORAGE_ALERT_PCT=70;

const CHAMPS={
  "Entrée":[
    {id:"date_entree",label:"Date d'entrée",type:"date",required:true},
    {id:"client",label:"Client",type:"client",required:true},
    {id:"de",label:"N° DE",type:"text",required:true,note:"Généré automatiquement"},
    {id:"mail",label:"Mail du client",type:"text",required:true},
    {id:"telephone",label:"Téléphone",type:"text",required:true},
    {id:"materiel_lieu",label:"Matériel / Identification lieux",type:"text",required:true},
    {id:"marque_moteur",label:"Marque moteur",type:"text",required:false},
    {id:"puissance",label:"Puissance",type:"text",required:false,unite:"kW"},
    {id:"vitesse",label:"Vitesse",type:"select",options:["1000","1500","3000","Autre"],required:false,unite:"tr/mn",autreTexte:true},
    {id:"type_moteur",label:"Type",type:"text",required:false},
    {id:"numero_serie",label:"Numéro de série",type:"text",required:false},
    {id:"fixation",label:"Fixation",type:"select",options:["B3 (pattes)","B5 (bride)","B14","Spécial"],required:false,autreTexte:true},
    {id:"tension",label:"Tension",type:"select",options:["230/400","400/690","Autre"],required:true,unite:"V",autreTexte:true},
    {id:"depose_nos_soins",label:"Déposé par nos soins",type:"oui_non",required:true},
    {id:"enleve_nos_soins",label:"Enlevé par nos soins",type:"oui_non",required:true},
    {id:"tech_entree",label:"Technicien",type:"technicien",required:true},
  ],
  "Infos électriques":[
    {id:"couplage",label:"Couplage",type:"select",options:["Étoile","Triangle","Absent"],required:true},
    {id:"isol_masse",label:"Isolement enroulement/masse",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"isol_uv",label:"Isolement U-V",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"isol_vw",label:"Isolement V-W",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"isol_wu",label:"Isolement W-U",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"adx_resultat",label:"ADX mesure isol. — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true},
    {id:"adx_valeur",label:"ADX mesure isol. — valeur",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"plaque_bornes_etat",label:"Plaque à bornes — état",type:"select",options:["OK","HS"],required:true},
    {id:"plaque_bornes_taille",label:"Plaque à bornes — taille",type:"text",required:true,condition:{champ:"plaque_bornes_etat",valeur:"HS"}},
    {id:"sonde_presence",label:"Résistance sonde — présence",type:"select",options:["Absente","Présente"],required:true},
    {id:"sonde_valeur",label:"Résistance sonde — valeur",type:"mesure",unite:"Ω",seuilMin:null,required:true,condition:{champ:"sonde_presence",valeur:"Présente"}},
    {id:"tech_elec",label:"Technicien",type:"technicien",required:true},
  ],
  "Information rotation avant démontage":[
    {id:"essai_vide_avant",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_avant",valeur:"Non"}},
    {id:"rotor_cc_realise",label:"Vérif rotor court-circuit — réalisée",type:"select",options:["Oui","Non"],required:true},
    {id:"rotor_cc_resultat",label:"Vérif rotor court-circuit — résultat",type:"select",options:["OK","HS"],required:true,condition:{champ:"rotor_cc_realise",valeur:"Oui"}},
    {id:"int_p1_avant",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant"},
    {id:"int_p2_avant",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant"},
    {id:"int_p3_avant",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant"},
    {id:"vib_av_mms_avant",label:"Vibration avant à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_avant"},
    {id:"vib_av_ge_avant",label:"Vibration avant à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_avant"},
    {id:"vib_ar_mms_avant",label:"Vibration arrière à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_arriere"},
    {id:"vib_ar_ge_avant",label:"Vibration arrière à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_arriere"},
    {id:"int_560_p1_avant",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"int_560_p2_avant",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"int_560_p3_avant",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant"},
    {id:"nettoyage_hp",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true},
    {id:"etuvage_stator",label:"Étuvage du stator",type:"select",options:["Oui","Non"],required:true},
    {id:"isol_masse_hp",label:"Mesure isolement masse (suite HP)",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true,condition:{champ:"etuvage_stator",valeur:"Oui"}},
    {id:"isol_enroul_min",label:"Isolement enroulements — plus petite valeur",type:"mesure",unite:"MΩ",seuilMin:SEUIL_OMEGA,required:true},
    {id:"tech_mesure_avant",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Information matériel au démontage":[
    {id:"ventilateur_present",label:"Présence d'un ventilateur",type:"oui_non",required:true},
    {id:"circlips_avant",label:"Circlips avant",type:"text",required:false},
    {id:"circlips_arriere",label:"Circlips arrière",type:"text",required:false},
    {id:"rondelle_presence",label:"Rondelle souplesse — présence",type:"select",options:["Oui","Non"],required:false},
    {id:"rondelle_avant",label:"Rondelle souplesse avant",type:"select",options:["Oui","Non"],required:false,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"rondelle_arriere",label:"Rondelle souplesse arrière",type:"select",options:["Oui","Non"],required:false,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"etat_ventilateur",label:"État ventilateur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"taille_ventilateur",label:"Taille ventilateur",type:"text",required:false,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"type_roulement_av",label:"Type roulement avant",type:"roulement",required:true},
    {id:"etat_roulement_av",label:"État roulement avant",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_av",label:"Mesure flasque avant",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_av",label:"Mesure arbre avant",type:"number",unite:"mm",required:true},
    {id:"joint_av_int",label:"Joint avant — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_ext",label:"Joint avant — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_ep",label:"Joint avant — ép.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_levres",label:"Joint avant — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_av"},
    {id:"type_roulement_ar",label:"Type roulement arrière",type:"roulement",required:true},
    {id:"etat_roulement_ar",label:"État roulement arrière",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_ar",label:"Mesure flasque arrière",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_ar",label:"Mesure arbre arrière",type:"number",unite:"mm",required:true},
    {id:"joint_ar_int",label:"Joint arrière — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_ext",label:"Joint arrière — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_ep",label:"Joint arrière — ép.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_levres",label:"Joint arrière — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_ar"},
    {id:"peinture",label:"Peinture à faire",type:"oui_non",required:true},
    {id:"etat_bobinage",label:"État visuel bobinage",type:"select",options:["RAS","Cuit","Sale","Vieux","HS"],required:true},
    {id:"etat_rotor",label:"État visuel rotor",type:"select",options:["RAS","Bleui","HS"],required:false},
    {id:"tech_demontage",label:"Qui a démonté",type:"technicien",required:true},
  ],
  "Information des essais après remontage":[
    {id:"tech_remontage",label:"Qui a remonté",type:"technicien",required:true},
    {id:"essai_vide_apres",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_apres_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_apres",valeur:"Non"}},
    {id:"int_p1_apres",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p2_apres",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p3_apres",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_560_p1_apres",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p2_apres",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p3_apres",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"vib_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_av_apres"},
    {id:"vib_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_av_apres"},
    {id:"vib_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_ar_apres"},
    {id:"vib_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_ar_apres"},
    {id:"resserage_plaque",label:"Resserrage plaque à bornes",type:"text",required:false},
    {id:"tech_essai",label:"Qui a essayé",type:"technicien",required:true},
  ],
}

const ETAPES_POMPE=["Entrée","Infos électriques","Rotation avant démontage moteur","Rotation avant démontage pompe","Matériel au démontage moteur","Mécanique pompe au démontage","Essais après remontage"];

const GM_MOBILE_OPTIONS=["NTK","NTKG","NTL","NTLG","NTB","NTBG","Autre"];
const GM_FIXE_OPTIONS=["CNK","Autre"];

const CHAMPS_POMPE={
  "Entrée":[
    {id:"date_entree",label:"Date d'entrée",type:"date",required:true},
    {id:"client",label:"Client",type:"client",required:true},
    {id:"de",label:"N° DE",type:"text",required:true,note:"Généré automatiquement"},
    {id:"mail",label:"Mail du client",type:"text",required:true},
    {id:"telephone",label:"Téléphone",type:"text",required:true},
    {id:"materiel_lieu",label:"Matériel / Identification lieux",type:"text",required:true},
    {id:"marque_moteur",label:"Marque moteur",type:"text",required:false},
    {id:"puissance",label:"Puissance",type:"text",required:false,unite:"kW"},
    {id:"vitesse",label:"Vitesse",type:"select",options:["1000","1500","3000","Autre"],required:false,unite:"tr/mn",autreTexte:true},
    {id:"type_moteur",label:"Type moteur",type:"text",required:false},
    {id:"numero_serie",label:"Numéro de série moteur",type:"text",required:false},
    {id:"fixation",label:"Fixation",type:"select",options:["B3 (pattes)","B5 (bride)","B14","Spécial"],required:false,autreTexte:true},
    {id:"marque_pompe",label:"Marque pompe",type:"text",required:false},
    {id:"modele_pompe",label:"Modèle / Référence pompe",type:"text",required:false},
    {id:"numero_serie_pompe",label:"Numéro de série pompe",type:"text",required:false},
    {id:"debit_nominal",label:"Débit nominal",type:"text",required:false},
    {id:"pression_nominale",label:"Pression nominale",type:"text",required:false},
    {id:"type_fluide",label:"Type de fluide pompé",type:"text",required:false},
    {id:"temperature_fluide",label:"Température fluide",type:"number",required:false,unite:"°C"},
    {id:"tension",label:"Tension",type:"select",options:["230/400","400/690","Autre"],required:true,unite:"V",autreTexte:true},
    {id:"depose_nos_soins",label:"Déposé par nos soins",type:"oui_non",required:true},
    {id:"enleve_nos_soins",label:"Enlevé par nos soins",type:"oui_non",required:true},
    {id:"tech_entree",label:"Technicien",type:"technicien",required:true},
  ],
  "Infos électriques":[
    {id:"sur_variateur",label:"Sur variateur",type:"oui_non",required:true},
    {id:"couplage",label:"Couplage",type:"select",options:["Étoile","Triangle","Absent"],required:true},
    {id:"isol_masse",label:"Isolement enroulement/masse",type:"mesure",unite:"MΩ",seuilMin:300,required:true},
    {id:"isol_uv",label:"Isolement U-V",type:"mesure",unite:"MΩ",seuilMin:300,required:true},
    {id:"isol_vw",label:"Isolement V-W",type:"mesure",unite:"MΩ",seuilMin:300,required:true},
    {id:"isol_wu",label:"Isolement W-U",type:"mesure",unite:"MΩ",seuilMin:300,required:true},
    {id:"adx_resultat_var",label:"ADX mesure isol. avec variateur 2800V — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true,condition:{champ:"sur_variateur",valeur:"Oui"}},
    {id:"adx_valeur_var",label:"ADX mesure isol. avec variateur 2800V — valeur",type:"mesure",unite:"MΩ",seuilMin:300,required:true,condition:{champ:"sur_variateur",valeur:"Oui"}},
    {id:"adx_resultat_novar",label:"ADX mesure isol. sans variateur 2000V — résultat",type:"select",options:["PASS","Douteux","Hors Tolérance"],required:true,condition:{champ:"sur_variateur",valeur:"Non"}},
    {id:"adx_valeur_novar",label:"ADX mesure isol. sans variateur 2000V — valeur",type:"mesure",unite:"MΩ",seuilMin:300,required:true,condition:{champ:"sur_variateur",valeur:"Non"}},
    {id:"plaque_bornes_etat",label:"Plaque à bornes — état",type:"select",options:["OK","HS"],required:true},
    {id:"plaque_bornes_taille",label:"Plaque à bornes — taille",type:"text",required:true,condition:{champ:"plaque_bornes_etat",valeur:"HS"}},
    {id:"sonde_presence",label:"Résistance sonde — présence",type:"select",options:["Absente","Présente"],required:true},
    {id:"sonde_valeur",label:"Résistance sonde — valeur",type:"mesure",unite:"Ω",seuilMin:null,required:true,condition:{champ:"sonde_presence",valeur:"Présente"}},
    {id:"tech_elec",label:"Technicien",type:"technicien",required:true},
  ],
  "Rotation avant démontage moteur":[
    {id:"essai_vide_avant_m",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_m_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_avant_m",valeur:"Non"}},
    {id:"rotor_cc_realise_m",label:"Vérif rotor court-circuit — réalisée",type:"select",options:["Oui","Non"],required:true},
    {id:"rotor_cc_resultat_m",label:"Vérif rotor court-circuit — résultat",type:"select",options:["OK","HS"],required:true,condition:{champ:"rotor_cc_realise_m",valeur:"Oui"}},
    {id:"int_p1_avant_m",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant_m"},
    {id:"int_p2_avant_m",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant_m"},
    {id:"int_p3_avant_m",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant_m"},
    {id:"vib_av_mms_avant_m",label:"Vibration avant à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_avant_m"},
    {id:"vib_av_ge_avant_m",label:"Vibration avant à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_avant_m"},
    {id:"vib_ar_mms_avant_m",label:"Vibration arrière à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_arriere_m"},
    {id:"vib_ar_ge_avant_m",label:"Vibration arrière à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_arriere_m"},
    {id:"int_560_p1_avant_m",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant_m"},
    {id:"int_560_p2_avant_m",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant_m"},
    {id:"int_560_p3_avant_m",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant_m"},
    {id:"nettoyage_hp_m",label:"Nettoyage HP",type:"select",options:["Oui","Non"],required:true},
    {id:"etuvage_stator_m",label:"Étuvage du stator",type:"select",options:["Oui","Non"],required:true},
    {id:"isol_masse_hp_m",label:"Mesure isolement masse (suite HP)",type:"mesure",unite:"MΩ",seuilMin:300,required:true,condition:{champ:"etuvage_stator_m",valeur:"Oui"}},
    {id:"isol_enroul_min_m",label:"Isolement enroulements — plus petite valeur",type:"mesure",unite:"MΩ",seuilMin:300,required:true},
    {id:"tech_mesure_avant_m",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Rotation avant démontage pompe":[
    {id:"essai_vide_avant_p",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_avant_p_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_avant_p",valeur:"Non"}},
    {id:"int_p1_avant_p",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_avant_p"},
    {id:"int_p2_avant_p",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int_avant_p"},
    {id:"int_p3_avant_p",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int_avant_p"},
    {id:"vib_av_mms_avant_p",label:"Vibration avant à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_avant_p"},
    {id:"vib_av_ge_avant_p",label:"Vibration avant à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_avant_p"},
    {id:"vib_ar_mms_avant_p",label:"Vibration arrière à 400V — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_arriere_p"},
    {id:"vib_ar_ge_avant_p",label:"Vibration arrière à 400V — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_arriere_p"},
    {id:"int_560_p1_avant_p",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant_p"},
    {id:"int_560_p2_avant_p",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant_p"},
    {id:"int_560_p3_avant_p",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_avant_p"},
    {id:"pression_essai_avant",label:"Essai en eau / air",type:"select",options:["Eau","Air"],required:true},
    {id:"pression_nom_max",label:"Pression nominale maximum",type:"mesure",unite:"bar",seuilMin:null,required:true},
    {id:"pression_courbe_0",label:"Pression max courbe à débit nul (0 m³/h)",type:"mesure",unite:"bar",seuilMin:null,required:true},
    {id:"pression_ville",label:"Pression de ville",type:"mesure",unite:"bar",seuilMin:null,required:true,groupe:"delta_p"},
    {id:"pression_pompe",label:"Pression de pompe",type:"mesure",unite:"bar",seuilMin:null,required:true,groupe:"delta_p"},
    {id:"delta_p_result",label:"Delta P (calculé auto)",type:"calcul",required:false,calcul:"pression_pompe-pression_ville",unite:"bar"},
    {id:"delta_p_etat",label:"Delta P — état",type:"select",options:["OK","HS"],required:true},
    {id:"diametre_nez_roue",label:"Diamètre nez de roue",type:"mesure",unite:"mm",seuilMin:null,required:true,groupe:"dim_roue"},
    {id:"diametre_volute",label:"Diamètre volute intérieur",type:"mesure",unite:"mm",seuilMin:null,required:true,groupe:"dim_roue"},
    {id:"vib_p_av_mms",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_p_avant"},
    {id:"vib_p_av_ge",label:"Vibration avant — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_p_avant"},
    {id:"vib_p_ar_mms",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_p_arriere"},
    {id:"vib_p_ar_ge",label:"Vibration arrière — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_p_arriere"},
    {id:"tech_mesure_avant_p",label:"Qui a mesuré",type:"technicien",required:true},
  ],
  "Matériel au démontage moteur":[
    {id:"ventilateur_present",label:"Présence d\'un ventilateur",type:"oui_non",required:true},
    {id:"circlips_avant",label:"Circlips avant",type:"text",required:false},
    {id:"circlips_arriere",label:"Circlips arrière",type:"text",required:false},
    {id:"rondelle_presence",label:"Rondelle souplesse — présence",type:"select",options:["Oui","Non"],required:false},
    {id:"rondelle_avant",label:"Rondelle souplesse avant",type:"select",options:["Oui","Non"],required:false,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"rondelle_arriere",label:"Rondelle souplesse arrière",type:"select",options:["Oui","Non"],required:false,condition:{champ:"rondelle_presence",valeur:"Oui"}},
    {id:"etat_ventilateur",label:"État ventilateur",type:"select",options:["RAS","Usé","HS","Cassé"],required:true,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"taille_ventilateur",label:"Taille ventilateur",type:"text",required:false,condition:{champ:"ventilateur_present",valeur:"Oui"}},
    {id:"type_roulement_av",label:"Type roulement avant",type:"roulement",required:true},
    {id:"etat_roulement_av",label:"État roulement avant",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_av",label:"État visuel flasque avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_av",label:"État visuel arbre avant",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_av",label:"Mesure flasque avant",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_av",label:"Mesure arbre avant",type:"number",unite:"mm",required:true},
    {id:"joint_av_int",label:"Joint avant — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_ext",label:"Joint avant — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_ep",label:"Joint avant — ép.",type:"number",unite:"mm",required:true,groupe:"joint_av"},
    {id:"joint_av_levres",label:"Joint avant — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_av"},
    {id:"type_roulement_ar",label:"Type roulement arrière",type:"roulement",required:true},
    {id:"etat_roulement_ar",label:"État roulement arrière",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"etat_flasque_ar",label:"État visuel flasque arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"etat_arbre_ar",label:"État visuel arbre arrière",type:"select",options:["OK","Marqué"],required:true},
    {id:"mesure_flasque_ar",label:"Mesure flasque arrière",type:"number",unite:"mm",required:true},
    {id:"mesure_arbre_ar",label:"Mesure arbre arrière",type:"number",unite:"mm",required:true},
    {id:"joint_ar_int",label:"Joint arrière — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_ext",label:"Joint arrière — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_ep",label:"Joint arrière — ép.",type:"number",unite:"mm",required:true,groupe:"joint_ar"},
    {id:"joint_ar_levres",label:"Joint arrière — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_ar"},
    {id:"peinture",label:"Peinture à faire",type:"oui_non",required:true},
    {id:"etat_bobinage",label:"État visuel bobinage",type:"select",options:["RAS","Cuit","Sale","Vieux","HS"],required:true},
    {id:"etat_rotor",label:"État visuel rotor",type:"select",options:["RAS","Bleui","HS"],required:false},
    {id:"tech_demontage_m",label:"Qui a démonté",type:"technicien",required:true},
  ],
  "Mécanique pompe au démontage":[
    {id:"etat_jc",label:"État du joint de corps",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"matiere_taille_jc",label:"Matière et taille du joint de corps",type:"text",required:true},
    {id:"remplacement_jc",label:"Remplacement du joint de corps",type:"oui_non",required:true},
    {id:"type_gm_fixe",label:"Type GM fixe",type:"garniture_fixe",required:true},
    {id:"diametre_gm_fixe",label:"Diamètre arbre GM fixe",type:"number",unite:"mm",required:true},
    {id:"etat_gm_fixe",label:"État GM fixe",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"diametre_portee_fixe",label:"Diamètre de la portée GM fixe",type:"mesure",unite:"mm",seuilMin:null,required:true},
    {id:"type_gm_mobile",label:"Type GM mobile",type:"garniture_mobile",required:true},
    {id:"diametre_gm_mobile",label:"Diamètre arbre GM mobile",type:"number",unite:"mm",required:true},
    {id:"etat_gm_mobile",label:"État GM mobile",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"diametre_portee_mobile",label:"Diamètre de la portée GM mobile",type:"mesure",unite:"mm",seuilMin:null,required:true},
    {id:"type_roulement_av_p",label:"Type roulement avant pompe",type:"roulement",required:true},
    {id:"etat_roulement_av_p",label:"État roulement avant pompe",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"joint_av_int_p",label:"Joint avant pompe — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_av_p"},
    {id:"joint_av_ext_p",label:"Joint avant pompe — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_av_p"},
    {id:"joint_av_ep_p",label:"Joint avant pompe — ép.",type:"number",unite:"mm",required:true,groupe:"joint_av_p"},
    {id:"joint_av_levres_p",label:"Joint avant pompe — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_av_p"},
    {id:"type_roulement_ar_p",label:"Type roulement arrière pompe",type:"roulement",required:true},
    {id:"etat_roulement_ar_p",label:"État roulement arrière pompe",type:"select",options:["RAS","Usé","HS","Cassé"],required:true},
    {id:"joint_ar_int_p",label:"Joint arrière pompe — Ø int.",type:"number",unite:"mm",required:true,groupe:"joint_ar_p"},
    {id:"joint_ar_ext_p",label:"Joint arrière pompe — Ø ext.",type:"number",unite:"mm",required:true,groupe:"joint_ar_p"},
    {id:"joint_ar_ep_p",label:"Joint arrière pompe — ép.",type:"number",unite:"mm",required:true,groupe:"joint_ar_p"},
    {id:"joint_ar_levres_p",label:"Joint arrière pompe — lèvres",type:"select",options:["Simple","Double"],required:true,groupe:"joint_ar_p"},
    {id:"tech_demontage_p",label:"Qui a démonté la pompe",type:"technicien",required:true},
  ],
  "Essais après remontage":[
    {id:"tech_remontage",label:"Qui a remonté",type:"technicien",required:true},
    {id:"essai_vide_apres",label:"Essai à vide possible",type:"select",options:["Oui","Non"],required:true},
    {id:"essai_vide_apres_pourquoi",label:"Pourquoi essai à vide impossible",type:"text",required:true,condition:{champ:"essai_vide_apres",valeur:"Non"}},
    {id:"int_p1_apres",label:"Intensité Phase 1",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p2_apres",label:"Intensité Phase 2",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_p3_apres",label:"Intensité Phase 3",type:"mesure",unite:"A",seuilMin:null,required:true,groupe:"int_apres"},
    {id:"int_560_p1_apres",label:"Intensité 560V — Ph.1",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p2_apres",label:"Intensité 560V — Ph.2",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"int_560_p3_apres",label:"Intensité 560V — Ph.3",type:"mesure",unite:"A",seuilMin:null,required:false,groupe:"int560_apres"},
    {id:"vib_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_av_apres"},
    {id:"vib_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_av_apres"},
    {id:"vib_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_ar_apres"},
    {id:"vib_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_ar_apres"},
    {id:"resserage_plaque",label:"Resserrage plaque à bornes",type:"text",required:false},
    {id:"tech_essai",label:"Qui a essayé",type:"technicien",required:true},
    {id:"pression_essai_apres",label:"Essai en eau / air",type:"select",options:["Eau","Air"],required:true},
    {id:"pression_nom_max_apres",label:"Pression nominale maximum",type:"mesure",unite:"bar",seuilMin:null,required:true},
    {id:"pression_courbe_0_apres",label:"Pression max courbe à débit nul (0 m³/h)",type:"mesure",unite:"bar",seuilMin:null,required:true},
    {id:"pression_ville_apres",label:"Pression de ville",type:"mesure",unite:"bar",seuilMin:null,required:true,groupe:"delta_p_apres"},
    {id:"pression_pompe_apres",label:"Pression de pompe",type:"mesure",unite:"bar",seuilMin:null,required:true,groupe:"delta_p_apres"},
    {id:"delta_p_result_apres",label:"Delta P (calculé auto)",type:"calcul",required:false,calcul:"pression_pompe_apres-pression_ville_apres",unite:"bar"},
    {id:"delta_p_etat_apres",label:"Delta P — état",type:"select",options:["OK","HS"],required:true},
    {id:"diametre_nez_roue_apres",label:"Diamètre nez de roue",type:"mesure",unite:"mm",seuilMin:null,required:true,groupe:"dim_roue_apres"},
    {id:"diametre_volute_apres",label:"Diamètre volute intérieur",type:"mesure",unite:"mm",seuilMin:null,required:true,groupe:"dim_roue_apres"},
    {id:"vib_p_av_mms_apres",label:"Vibration avant — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_p_avant_apres"},
    {id:"vib_p_av_ge_apres",label:"Vibration avant — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_p_avant_apres"},
    {id:"vib_p_ar_mms_apres",label:"Vibration arrière — mm/s",type:"mesure",unite:"mm/s",seuilMin:null,required:true,groupe:"vib_p_arriere_apres"},
    {id:"vib_p_ar_ge_apres",label:"Vibration arrière — GE",type:"mesure",unite:"GE",seuilMin:null,required:true,groupe:"vib_p_arriere_apres"},
  ],
};;

function champVisible(c,v){return !c.condition||v[c.condition.champ]===c.condition.valeur;}
function etapeOk(nom,v,nr,cs){if(nr)return true;for(const c of((cs||CHAMPS)[nom]||[])){if(!c.required||!champVisible(c,v))continue;if(!v[c.id])return false;}return true;}
function enErreur(c,val){if(c.type!=="mesure"||c.seuilMin==null)return false;const vv=parseFloat(val);return !isNaN(vv)&&vv<c.seuilMin;}
function genDE(){return "DE"+String(Math.floor(1000+Math.random()*9000));}
function today(){return new Date().toISOString().split("T")[0];}
function fmt(iso){if(!iso)return "—";return new Date(iso).toLocaleDateString("fr-FR");}
function slugCat(s){return s.toLowerCase().replace(/['\s]/g,"_").replace(/é|è|ê/g,"e").replace(/à|â/g,"a").replace(/[^a-z0-9_]/g,"");}
function slug(s){return (s||"").replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_\-]/g,"").substring(0,30);}
function deSlug(de){return (de||"").replace(/-/g,"");}
function cheminFiche(v){const client=slug(v.client||"Client");const de=deSlug(v.de||"DE");const mat=slug(v.materiel_lieu||v.type_moteur||"Materiel");return {client,de,mat,chemin:client+"/"+de+"/"+mat};}
function statutInfo(id){return STATUTS_CHANTIER.find(s=>s.id===id)||STATUTS_CHANTIER[0];}
function useWidth(){const [w,setW]=useState(window.innerWidth);useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w;}
function grilleCols(n,width){if(width<600)return 1;if(width>=900)return n;return Math.min(n,2);}

function detecterPieces(v,typeMat){
  const pieces=[];const mauvais=["Usé","HS","Cassé","Bleui","Cuit"];
  // Commun moteur
  if(v.etat_roulement_av&&mauvais.includes(v.etat_roulement_av))pieces.push({designation:"Roulement avant moteur",reference:(v.type_roulement_av||"").replace("Autre:","").trim()});
  if(v.etat_roulement_ar&&mauvais.includes(v.etat_roulement_ar))pieces.push({designation:"Roulement arrière moteur",reference:(v.type_roulement_ar||"").replace("Autre:","").trim()});
  if(v.joint_av_int)pieces.push({designation:"Joint à lèvres avant moteur",reference:(v.joint_av_int||"?")+"x"+(v.joint_av_ext||"?")+"x"+(v.joint_av_ep||"?")+" "+(v.joint_av_levres==="Double"?"DL":"SL")});
  if(v.joint_ar_int)pieces.push({designation:"Joint à lèvres arrière moteur",reference:(v.joint_ar_int||"?")+"x"+(v.joint_ar_ext||"?")+"x"+(v.joint_ar_ep||"?")+" "+(v.joint_ar_levres==="Double"?"DL":"SL")});
  if(v.etat_ventilateur&&mauvais.includes(v.etat_ventilateur))pieces.push({designation:"Ventilateur",reference:v.taille_ventilateur||""});
  if(v.etat_bobinage&&mauvais.includes(v.etat_bobinage))pieces.push({designation:"Bobinage stator",reference:""});
  if(v.etat_rotor&&mauvais.includes(v.etat_rotor))pieces.push({designation:"Rotor",reference:""});
  // Spécifique pompe
  if(typeMat==="Pompe"){
    if(v.type_gm_fixe){
      const ref=(v.type_gm_fixe||"").replace("Autre:","").trim()+" "+(v.diametre_gm_fixe||"");
      pieces.push({designation:"GM fixe",reference:ref.trim()});
    }
    if(v.type_gm_mobile){
      const ref=(v.type_gm_mobile||"").replace("Autre:","").trim()+" "+(v.diametre_gm_mobile||"");
      pieces.push({designation:"GM mobile",reference:ref.trim()});
    }
    if(v.etat_roulement_av_p&&mauvais.includes(v.etat_roulement_av_p))pieces.push({designation:"Roulement avant pompe",reference:(v.type_roulement_av_p||"").replace("Autre:","").trim()});
    if(v.etat_roulement_ar_p&&mauvais.includes(v.etat_roulement_ar_p))pieces.push({designation:"Roulement arrière pompe",reference:(v.type_roulement_ar_p||"").replace("Autre:","").trim()});
    if(v.joint_av_int_p)pieces.push({designation:"Joint à lèvres avant pompe",reference:(v.joint_av_int_p||"?")+"x"+(v.joint_av_ext_p||"?")+"x"+(v.joint_av_ep_p||"?")+" "+(v.joint_av_levres_p==="Double"?"DL":"SL")});
    if(v.joint_ar_int_p)pieces.push({designation:"Joint à lèvres arrière pompe",reference:(v.joint_ar_int_p||"?")+"x"+(v.joint_ar_ext_p||"?")+"x"+(v.joint_ar_ep_p||"?")+" "+(v.joint_ar_levres_p==="Double"?"DL":"SL")});
    if(v.remplacement_jc==="Oui")pieces.push({designation:"Joint de corps",reference:v.matiere_taille_jc||""});
  }
  return pieces;
}

const S={
  app:{fontFamily:"system-ui,-apple-system,sans-serif",background:"#F5F6F8",minHeight:"100vh",color:"#1A1A2E"},
  hdr:{background:"#1B4F8A",color:"#fff",padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"},
  p1:{background:"#1B4F8A",color:"#fff",border:"none",padding:"9px 20px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6},
  p2:{background:"#fff",color:"#1B4F8A",border:"1.5px solid #1B4F8A",padding:"8px 18px",borderRadius:6,fontWeight:600,fontSize:14,cursor:"pointer"},
  pDanger:{background:"#D73A49",color:"#fff",border:"none",padding:"7px 14px",borderRadius:6,fontWeight:600,fontSize:13,cursor:"pointer"},
  card:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"16px 20px",marginBottom:16},
  cAct:{background:"#fff",borderRadius:10,border:"2px solid #1B4F8A",padding:"16px 20px",marginBottom:16},
  cDone:{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:12,overflow:"hidden"},
  cLock:{background:"#F5F6F8",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 20px",marginBottom:12,opacity:0.5},
  lbl:{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".06em",display:"block",marginBottom:3},
  inp:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,boxSizing:"border-box",background:"#fff"},
  inpErr:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D73A49",fontSize:13,boxSizing:"border-box",background:"#FFF5F5"},
  sel:{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid #D1D5DB",fontSize:13,background:"#fff"},
  alert:{background:"#FFF5F5",border:"1.5px solid #D73A49",borderRadius:6,padding:"5px 9px",fontSize:11,color:"#D73A49",display:"flex",alignItems:"center",gap:5,marginTop:3},
  ok:{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#22863A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  info:{background:"#EEF4FF",border:"1px solid #1B4F8A",borderRadius:6,padding:"8px 14px",fontSize:13,color:"#1B4F8A",display:"flex",alignItems:"center",gap:8,marginBottom:14},
  tech:{background:"#EEF4FF",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14},
  nr:{border:"1.5px solid #E2E6EA",borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:14,cursor:"pointer"},
};

function ModalPin({onSuccess}){
  const [s,setS]=useState("");const [err,setErr]=useState(false);
  function tap(c){if(s.length>=4)return;const n=s+c;setS(n);if(n.length===4){if(n===PIN_CODE){localStorage.setItem(PIN_KEY,"1");onSuccess();}else{setErr(true);setTimeout(()=>{setS("");setErr(false);},800);}}}
  const touches=["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return(<div style={{position:"fixed",inset:0,background:"#1B4F8A",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
    <div style={{background:"#fff",borderRadius:16,padding:"32px 28px",width:300,textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,0.3)"}}>
      <img src={LOGO_B64} alt="PMV Services" style={{height:60,marginBottom:12,objectFit:"contain"}}/>
      <p style={{fontSize:13,color:"#6B7280",margin:"0 0 20px"}}>Entrez le code PIN</p>
      <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:24}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:s.length>i?(err?"#D73A49":"#1B4F8A"):"#E2E6EA",transition:"background 0.15s"}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {touches.map((t,i)=>t===""?<div key={i}/>:<button key={i} onClick={()=>t==="⌫"?setS(ss=>ss.slice(0,-1)):tap(t)} style={{padding:"14px",fontSize:18,fontWeight:600,borderRadius:10,border:"1.5px solid #E2E6EA",background:t==="⌫"?"#F5F6F8":"#fff",cursor:"pointer",color:t==="⌫"?"#6B7280":"#1A1A2E"}}>{t}</button>)}
      </div>
      {err&&<p style={{color:"#D73A49",fontSize:13,marginTop:12,fontWeight:600}}>Code incorrect</p>}
    </div>
  </div>);
}

function ChampClient({valeur,onChange,clients,onAddClient}){
  const [q,setQ]=useState(valeur||"");const [ouvert,setOuvert]=useState(false);const [modeAutre,setModeAutre]=useState(false);const ref=useRef(null);
  useEffect(()=>{function close(e){if(ref.current&&!ref.current.contains(e.target))setOuvert(false);}document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[]);
  const filtres=q.length>0?clients.filter(c=>c.toLowerCase().includes(q.toLowerCase())):clients.slice(0,8);
  function select(c){if(c==="Autre"){setModeAutre(true);setQ("");onChange("");}else{setQ(c);onChange(c);setOuvert(false);setModeAutre(false);}}
  async function enregistrer(){if(!q.trim())return;try{await db.post("clients",{nom:q.trim()});onAddClient(q.trim());}catch(e){}onChange(q.trim());setModeAutre(false);setOuvert(false);}
  if(modeAutre)return(<div><div style={{display:"flex",gap:8}}><input type="text" value={q} onChange={e=>{setQ(e.target.value);onChange(e.target.value);}} placeholder="Nom du client..." style={{...S.inp,flex:1}}/><button onClick={enregistrer} style={{...S.p1,fontSize:12,padding:"6px 12px",whiteSpace:"nowrap"}}>+ Enregistrer</button><button onClick={()=>{setModeAutre(false);setQ("");}} style={{...S.p2,fontSize:12,padding:"6px 10px"}}>✕</button></div></div>);
  return(<div ref={ref} style={{position:"relative"}}>
    <input type="text" value={q} onChange={e=>{setQ(e.target.value);setOuvert(true);onChange(e.target.value);}} onFocus={()=>setOuvert(true)} placeholder="Tapez pour rechercher..." style={S.inp}/>
    {ouvert&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1.5px solid #D1D5DB",borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:50,maxHeight:200,overflowY:"auto"}}>
      {filtres.map(c=><div key={c} onClick={()=>select(c)} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #F3F4F6"}} onMouseOver={e=>e.currentTarget.style.background="#F5F6F8"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{c}</div>)}
      <div onClick={()=>select("Autre")} style={{padding:"7px 12px",cursor:"pointer",fontSize:13,color:"#E8720C",fontWeight:600,borderTop:"1px solid #E2E6EA"}}>+ Autre (nouveau client)</div>
    </div>}
  </div>);
}

function ChampTechnicien({valeur,onChange,techs}){
  const knownTechs=techs.filter(t=>t!=="Autre");const isAutre=valeur&&!knownTechs.includes(valeur);const [autreVal,setAutreVal]=useState(isAutre?valeur:"");
  return(<div><select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("");else onChange(e.target.value);}} style={S.sel}><option value="">— Sélectionner</option>{techs.map(t=><option key={t}>{t}</option>)}</select>{isAutre&&<input type="text" value={autreVal} onChange={e=>{setAutreVal(e.target.value);onChange(e.target.value);}} placeholder="Initiales..." style={{...S.inp,width:120,marginTop:6}}/>}</div>);
}

function ChampRoulement({valeur,onChange}){
  const isAutre=valeur&&!ROULEMENTS.slice(0,-1).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}><select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}><option value="">— Sélectionner</option>{ROULEMENTS.map(r=><option key={r}>{r}</option>)}</select>{(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}</div>);
}

function ChampGarnitureMobile({valeur,onChange}){
  const isAutre=valeur&&!GM_MOBILE_OPTIONS.slice(0,-1).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
      <option value="">— Sélectionner</option>
      {GM_MOBILE_OPTIONS.map(r=><option key={r}>{r}</option>)}
    </select>
    {(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}
  </div>);
}

function ChampGarnitureFixe({valeur,onChange}){
  const isAutre=valeur&&!GM_FIXE_OPTIONS.slice(0,-1).includes(valeur);
  return(<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <select value={isAutre?"Autre":(valeur||"")} onChange={e=>{if(e.target.value==="Autre")onChange("Autre:");else onChange(e.target.value);}} style={S.sel}>
      <option value="">— Sélectionner</option>
      {GM_FIXE_OPTIONS.map(r=><option key={r}>{r}</option>)}
    </select>
    {(isAutre||valeur?.startsWith("Autre:"))&&<input type="text" placeholder="Référence précise..." value={valeur?.replace("Autre:","")||""} onChange={e=>onChange("Autre:"+e.target.value)} style={S.inp}/>}
  </div>);
}

function SectionPhotos({etape,ficheId,cheminBase,categories,photos,onPhotoAdded}){
  const [uploading,setUploading]=useState(false);const [cat,setCat]=useState("");const [apercu,setApercu]=useState(null);const [errMsg,setErrMsg]=useState("");const inputRef=useRef(null);
  const photosEtape=photos.filter(p=>p.etape===etape);
  async function handleFile(e){
    const file=e.target.files[0];if(!file||!cat)return;setUploading(true);setErrMsg("");
    try{const catObj=categories.find(c=>c.nom===cat)||{slug:slugCat(cat),nom:cat};const count=photos.filter(p=>p.categorie_slug===catObj.slug).length+1;const ext=file.name.match(/\.[^.]+$/)?.[0]||".jpg";const nomFichier=`${catObj.slug}_${count}${ext}`;const path=cheminBase+"/"+nomFichier;await db.uploadPhoto(path,file);const photoData={fiche_id:ficheId||null,etape,categorie_slug:catObj.slug,categorie_nom:catObj.nom,nom_fichier:nomFichier,storage_path:path};if(ficheId)await db.post("fiche_photos",photoData);onPhotoAdded({...photoData,url:db.photoUrl(path)});setCat("");}catch(err){setErrMsg("Erreur upload : "+err.message);}
    setUploading(false);if(inputRef.current)inputRef.current.value="";
  }
  return(<div style={{background:"#F8F9FA",borderRadius:8,padding:"10px 12px",marginTop:6,marginBottom:14}}>
    <p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 8px"}}>📷 Photos — {etape}</p>
    {photosEtape.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>{photosEtape.map((p,i)=><div key={i} onClick={()=>setApercu(p)} style={{cursor:"pointer",position:"relative"}}><img src={p.url} alt={p.categorie_nom} style={{width:60,height:60,objectFit:"cover",borderRadius:5,border:"1.5px solid #E2E6EA",display:"block"}} onError={e=>e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23eee'/%3E%3C/svg%3E"}/><div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",borderRadius:"0 0 4px 4px",padding:"2px 3px",fontSize:8,color:"#fff",textAlign:"center"}}>{p.categorie_nom}</div></div>)}</div>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><select value={cat} onChange={e=>setCat(e.target.value)} style={{...S.sel,flex:1,minWidth:130,fontSize:12}}><option value="">— Catégorie</option>{categories.map(c=><option key={c.nom}>{c.nom}</option>)}</select><button onClick={()=>{if(!cat){setErrMsg("Choisissez une catégorie");return;}inputRef.current?.click();}} style={{...S.p2,fontSize:12,padding:"6px 12px",opacity:cat?1:0.5,whiteSpace:"nowrap"}}>{uploading?"⏳…":"📷 Photo"}</button><input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}}/></div>
    {errMsg&&<p style={{fontSize:11,color:"#D73A49",marginTop:4}}>{errMsg}</p>}
    {apercu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} onClick={()=>setApercu(null)}><img src={apercu.url} alt={apercu.categorie_nom} style={{maxWidth:"92vw",maxHeight:"82vh",objectFit:"contain",borderRadius:8}}/><p style={{color:"#fff",marginTop:10,fontSize:13}}>{apercu.categorie_nom} — {apercu.nom_fichier}</p><p style={{color:"rgba(255,255,255,0.5)",fontSize:11,marginTop:4}}>Appuyez pour fermer</p></div>}
  </div>);
}

function UnChamp({c,v,onChange,techs,clients,onAddClient}){
  if(!champVisible(c,v))return null;
  const val=v[c.id]||"";const manque=c.required&&!val;const err=enErreur(c,val);
  const lbl=<label style={{...S.lbl,color:manque?"#D73A49":"#6B7280"}}>{c.label}{c.required&&<span style={{color:"#D73A49"}}> *</span>}{c.unite&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none"}}> ({c.unite})</span>}{c.note&&<span style={{color:"#9CA3AF",fontWeight:400,textTransform:"none",fontSize:10}}> — {c.note}</span>}</label>;
  let ctrl;
  if(c.type==="client")ctrl=<ChampClient valeur={val} onChange={nv=>onChange(c.id,nv)} clients={clients} onAddClient={onAddClient}/>;
  else if(c.type==="technicien")ctrl=<ChampTechnicien valeur={val} onChange={nv=>onChange(c.id,nv)} techs={techs}/>;
  else if(c.type==="roulement")ctrl=<ChampRoulement valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="garniture_mobile")ctrl=<ChampGarnitureMobile valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="garniture_fixe")ctrl=<ChampGarnitureFixe valeur={val} onChange={nv=>onChange(c.id,nv)}/>;
  else if(c.type==="calcul"){
    const [a,b]=c.calcul.split("-");
    const va=parseFloat(v[a]||0);const vb=parseFloat(v[b]||0);
    const res=isNaN(va)||isNaN(vb)?"—":(va-vb).toFixed(2)+" "+(c.unite||"");
    ctrl=<div style={{padding:"7px 9px",borderRadius:6,border:"1.5px solid #E2E6EA",background:"#F8F9FA",fontSize:13,fontWeight:600,color:"#1B4F8A"}}>{res}</div>;
  }
  else if(c.type==="select"){const isAutre=val&&!c.options.includes(val)&&c.autreTexte;ctrl=<div style={{display:"flex",flexDirection:"column",gap:5}}><select value={isAutre?"Autre":(val||"")} onChange={e=>{if(e.target.value==="Autre")onChange(c.id,"Autre:");else onChange(c.id,e.target.value);}} style={S.sel}><option value="">— Sélectionner</option>{c.options.map(o=><option key={o}>{o}</option>)}</select>{(isAutre||val?.startsWith("Autre:"))&&c.autreTexte&&<input type="text" placeholder="Préciser..." value={val?.replace("Autre:","")||""} onChange={e=>onChange(c.id,"Autre:"+e.target.value)} style={S.inp}/>}</div>;}
  else if(c.type==="mesure")ctrl=<div><div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={val||""} onChange={e=>onChange(c.id,e.target.value)} style={err?{...S.inpErr,flex:1}:{...S.inp,flex:1}} placeholder="—"/>{c.unite&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{c.unite}</span>}</div>{err&&<div style={S.alert}>⚠ Sous le seuil ({c.seuilMin} {c.unite})</div>}</div>;
  else if(c.type==="oui_non")ctrl=<div style={{display:"flex",gap:16}}>{["Oui","Non"].map(opt=><label key={opt} style={{display:"flex",alignItems:"center",gap:5,fontSize:13,cursor:"pointer"}}><input type="radio" checked={val===opt} onChange={()=>onChange(c.id,opt)}/> {opt}</label>)}</div>;
  else if(c.type==="date")ctrl=<input type="date" value={val} onChange={e=>onChange(c.id,e.target.value)} style={S.inp}/>;
  else if(c.type==="number")ctrl=<div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={val} onChange={e=>onChange(c.id,e.target.value)} style={{...S.inp,flex:1}} placeholder="—"/>{c.unite&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap"}}>{c.unite}</span>}</div>;
  else ctrl=<input type="text" value={val} onChange={e=>onChange(c.id,e.target.value)} style={manque?S.inpErr:S.inp} placeholder="—"/>;
  return <div style={{marginBottom:12}}>{lbl}{ctrl}{manque&&<div style={{fontSize:10,color:"#D73A49",marginTop:2}}>Champ obligatoire</div>}</div>;
}

function RenduChamps({nom,v,onChange,techs,clients,onAddClient,ficheId,cheminBase,categories,photos,onPhotoAdded,champsSource}){
  const width=useWidth();const champs=(champsSource||CHAMPS)[nom]||[];const rendus=[];const vus=new Set();
  for(let i=0;i<champs.length;i++){const c=champs[i];if(vus.has(c.id))continue;if(!champVisible(c,v)){vus.add(c.id);continue;}if(c.groupe){const grp=champs.filter(cc=>cc.groupe===c.groupe&&champVisible(cc,v));grp.forEach(cc=>vus.add(cc.id));const nCols=grilleCols(grp.length===3?3:2,width);rendus.push(<div key={c.groupe} style={{display:"grid",gridTemplateColumns:"repeat("+nCols+",1fr)",gap:8,marginBottom:4}}>{grp.map(cc=><UnChamp key={cc.id} c={cc} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient}/>)}</div>);}else{vus.add(c.id);rendus.push(<UnChamp key={c.id} c={c} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient}/>);}}
  rendus.push(<SectionPhotos key="photos" etape={nom} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos.filter(p=>p.etape===nom)} onPhotoAdded={p=>onPhotoAdded({...p,etape:nom})}/>);
  return <>{rendus}</>;
}

function SectionEtape({nom,idx,actif,validees,v,nr,onChange,onNR,onValider,onSauvegarder,sessionTech,techs,clients,onAddClient,saving,ficheId,cheminBase,categories,photos,onPhotoAdded,champsSource}){
  const [ouvert,setOuvert]=useState(false);const estAct=idx===actif,estVal=validees.includes(idx),estLock=idx>actif;const cs2=champsSource||CHAMPS;const ok=etapeOk(nom,v,nr,cs2);const techEtape=(cs2[nom]||[]).filter(c=>c.type==="technicien").map(c=>v[c.id]||"—")[0]||"—";const nbPhotos=photos.filter(p=>p.etape===nom).length;
  function resume(){return(cs2[nom]||[]).filter(c=>c.type!=="technicien"&&champVisible(c,v)&&v[c.id]).slice(0,3).map(c=>`${c.label}: ${v[c.id]}${c.unite?" "+c.unite:""}`).join(" · ");}
  if(estLock)return<div style={S.cLock}><div style={{display:"flex",alignItems:"center",gap:10}}><span>🔒</span><span style={{fontSize:14,color:"#9CA3AF"}}>{idx+1}. {nom}</span></div></div>;
  if(estVal&&!estAct)return(<div style={S.cDone}><div onClick={()=>setOuvert(!ouvert)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 16px",cursor:"pointer",background:ouvert?"#F0FFF4":"#fff"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span>✅</span><div><span style={{fontSize:14,fontWeight:600}}>{idx+1}. {nom}</span><span style={{fontSize:12,color:"#9CA3AF",marginLeft:8}}>— {techEtape}{nbPhotos>0?" · 📷 "+nbPhotos:""}}</span></div></div><span style={{fontSize:12,color:"#6B7280"}}>{ouvert?"▲":"▼"}</span></div>{ouvert?(<div style={{padding:"14px 16px",borderTop:"1px solid #E2E6EA"}}><div style={S.info}>✏️ Modification tracée dans l'historique.</div><RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded} champsSource={cs2}/></div>):<div style={{padding:"3px 16px 10px",fontSize:12,color:"#6B7280"}}>{resume()}</div>}</div>);
  return(<div style={S.cAct}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div><span style={{fontSize:11,fontWeight:700,color:"#1B4F8A",textTransform:"uppercase",letterSpacing:".07em"}}>En cours</span><p style={{fontSize:16,fontWeight:700,margin:"2px 0 0"}}>{idx+1}. {nom}</p></div><span style={{fontSize:12,color:"#9CA3AF"}}>{idx+1}/{ETAPES.length}</span></div><div style={S.tech}><span>👤</span><span style={{fontSize:13,color:"#1B4F8A"}}>Session : <strong>{sessionTech}</strong></span></div><div style={S.nr} onClick={onNR}><input type="checkbox" checked={nr} onChange={onNR} onClick={e=>e.stopPropagation()}/><div><span style={{fontSize:13,fontWeight:600}}>Étape non réalisable</span><p style={{fontSize:11,color:"#9CA3AF",margin:"1px 0 0"}}>Si coché, les champs ne sont plus obligatoires</p></div></div><div style={{opacity:nr?0.4:1,pointerEvents:nr?"none":"auto"}}><RenduChamps nom={nom} v={v} onChange={onChange} techs={techs} clients={clients} onAddClient={onAddClient} ficheId={ficheId} cheminBase={cheminBase} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded} champsSource={cs2}/></div>{!ok&&!nr&&<div style={{...S.alert,marginBottom:10}}>⚠ Des champs obligatoires (*) sont manquants.</div>}<button onClick={onSauvegarder} disabled={saving} style={{...S.p2,marginTop:8,width:"100%",justifyContent:"center",opacity:saving?0.5:1}}>{saving?"💾 ...":"💾 Enregistrer"}</button>{(ok||nr)&&<button style={{...S.p1,width:"100%",justifyContent:"center",opacity:saving?0.5:1,marginTop:8}} disabled={saving} onClick={onValider}>{saving?"...":"✓ Valider et continuer →"}</button>}{!ok&&!nr&&<div style={{...S.alert,marginBottom:0,marginTop:8}}>⚠ Remplissez les champs obligatoires (*) pour continuer</div>}</div>);
}

function ModalIdent({techs,onConfirm}){
  const [t,setT]=useState("");
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}><div style={{background:"#fff",borderRadius:14,padding:"32px 28px",width:340,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}><div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:36,marginBottom:8}}>🏷️</div><p style={{fontSize:17,fontWeight:700,margin:0}}>Qui ouvre cette fiche ?</p><p style={{fontSize:13,color:"#6B7280",margin:"4px 0 0"}}>Votre identité sera tracée pour cette session.</p></div><select value={t} onChange={e=>setT(e.target.value)} style={{...S.sel,marginBottom:16}}><option value="">— Sélectionner</option>{techs.map(x=><option key={x}>{x}</option>)}</select><button style={{...S.p1,width:"100%",justifyContent:"center",opacity:t?1:0.5}} disabled={!t} onClick={()=>onConfirm(t)}>Ouvrir la fiche</button></div></div>);
}

function SelecteurStatut({statutId,onChange}){
  const st=statutInfo(statutId||"A_demonter");
  return(<select value={statutId||"A_demonter"} onChange={e=>onChange(e.target.value)} style={{padding:"4px 10px",borderRadius:20,border:"1.5px solid "+st.color,fontSize:12,fontWeight:600,color:st.color,background:st.bg,cursor:"pointer"}}>{STATUTS_CHANTIER.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>);
}

// ─── SECTION MATÉRIEL À COMMANDER (fin de fiche) ────────────────────────
function SectionMaterielCommander({v,ficheId,de,client,piecesInit,onSave,typeMateriel}){
  const [pieces,setPieces]=useState([]);
  const [newDesig,setNewDesig]=useState("");const [newRef,setNewRef]=useState("");const [saving,setSaving]=useState(false);const [saved,setSaved]=useState(false);

  useEffect(()=>{
    const auto=detecterPieces(v,typeMateriel).map((p,i)=>({id:"auto_"+i,...p,checked:true,source:"auto"}));
    const manuel=piecesInit.filter(p=>p.source==="manuel").map((p,i)=>({id:"man_"+i,designation:p.designation,reference:p.reference||"",checked:true,source:"manuel"}));
    setPieces([...auto,...manuel]);
  },[v]);

  function toggle(id){setPieces(prev=>prev.map(p=>p.id===id?{...p,checked:!p.checked}:p));}
  function supprimer(id){setPieces(prev=>prev.filter(p=>p.id!==id));}
  function ajouter(){
    if(!newDesig.trim())return;
    setPieces(prev=>[...prev,{id:"man_"+Date.now(),designation:newDesig.trim(),reference:newRef.trim(),checked:true,source:"manuel"}]);
    setNewDesig("");setNewRef("");
  }

  async function sauvegarder(){
    if(!ficheId)return;setSaving(true);
    try{
      await db.del("suivi_pieces","?fiche_id=eq."+ficheId);
      const cochees=pieces.filter(p=>p.checked);
      if(cochees.length>0)await db.post("suivi_pieces",cochees.map(p=>({fiche_id:ficheId,de,client,designation:p.designation,reference:p.reference||"",statut:"A_recommander",source:p.source})));
      setSaved(true);setTimeout(()=>setSaved(false),3000);
      if(onSave)onSave(cochees);
    }catch(e){}
    setSaving(false);
  }

  const nCochees=pieces.filter(p=>p.checked).length;

  return(<div style={{...S.card,border:"1px solid #E8720C"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <p style={{fontSize:14,fontWeight:700,margin:0}}>🔧 Matériel à commander</p>
      {nCochees>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:600}}>{nCochees} pièce{nCochees>1?"s":""} sélectionnée{nCochees>1?"s":""}</span>}
    </div>

    {pieces.length===0&&<p style={{fontSize:13,color:"#9CA3AF",marginBottom:12}}>Aucune pièce détectée automatiquement. Ajoutez-en manuellement si besoin.</p>}

    {pieces.filter(p=>p.source==="auto").length>0&&<p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"0 0 6px"}}>Détecté automatiquement</p>}
    {pieces.filter(p=>p.source==="auto").map(p=>(
      <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,border:"1px solid "+(p.checked?"#22863A":"#E2E6EA"),background:p.checked?"#F0FFF4":"#F8F9FA",marginBottom:6}}>
        <input type="checkbox" checked={p.checked} onChange={()=>toggle(p.id)} style={{width:16,height:16,cursor:"pointer",accentColor:"#22863A"}}/>
        <span style={{flex:1,fontSize:13,fontWeight:500}}>{p.designation}</span>
        {p.reference&&<span style={{fontSize:11,color:"#6B7280",background:"#fff",border:"1px solid #E2E6EA",borderRadius:4,padding:"2px 7px"}}>{p.reference}</span>}
        <span style={{fontSize:10,background:"#F0FFF4",color:"#22863A",borderRadius:20,padding:"2px 7px"}}>auto</span>
      </div>
    ))}

    {pieces.filter(p=>p.source==="manuel").length>0&&<p style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:".05em",margin:"10px 0 6px"}}>Ajouté manuellement</p>}
    {pieces.filter(p=>p.source==="manuel").map(p=>(
      <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:7,border:"1px solid "+(p.checked?"#1B4F8A":"#E2E6EA"),background:p.checked?"#EEF4FF":"#F8F9FA",marginBottom:6}}>
        <input type="checkbox" checked={p.checked} onChange={()=>toggle(p.id)} style={{width:16,height:16,cursor:"pointer",accentColor:"#1B4F8A"}}/>
        <span style={{flex:1,fontSize:13,fontWeight:500}}>{p.designation}</span>
        {p.reference&&<span style={{fontSize:11,color:"#6B7280",background:"#fff",border:"1px solid #E2E6EA",borderRadius:4,padding:"2px 7px"}}>{p.reference}</span>}
        <span style={{fontSize:10,background:"#EEF4FF",color:"#1B4F8A",borderRadius:20,padding:"2px 7px"}}>manuel</span>
        <button onClick={()=>supprimer(p.id)} style={{background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:16,padding:"0 2px"}} title="Supprimer">×</button>
      </div>
    ))}

    <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
      <input type="text" value={newDesig} onChange={e=>setNewDesig(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ajouter()} placeholder="Désignation de la pièce..." style={{...S.inp,flex:1,minWidth:160}}/>
      <input type="text" value={newRef} onChange={e=>setNewRef(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ajouter()} placeholder="Référence (optionnel)" style={{...S.inp,width:160}}/>
      <button onClick={ajouter} style={{...S.p2,whiteSpace:"nowrap"}}>+ Ajouter</button>
    </div>

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:14,paddingTop:12,borderTop:"1px solid #E2E6EA",flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:12,color:"#6B7280"}}>{nCochees} pièce{nCochees>1?"s":""} seront envoyées au suivi</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {saved&&<span style={{fontSize:12,color:"#22863A"}}>✅ Enregistré</span>}
        {!ficheId&&<span style={{fontSize:11,color:"#9CA3AF"}}>Validez une étape d'abord</span>}
        <button onClick={sauvegarder} disabled={saving||!ficheId} style={{...S.p1,opacity:ficheId?1:0.5}}>{saving?"Enregistrement…":"💾 Enregistrer"}</button>
      </div>
    </div>
  </div>);
}

// ─── APERÇU FICHE ───────────────────────────────────────────────────────
function ApercuFiche({v,photos,statutChantier,commentaires,pieces,onClose}){
  const html=genHtml(v,photos||[],statutChantier,commentaires||"",pieces||[]);
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",flexDirection:"column"}}>
    <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,flexWrap:"wrap",gap:8}}>
      <span style={{fontWeight:700}}>Aperçu fiche — {v.de}</span>
      <div style={{display:"flex",gap:10}}>
        <button style={{background:"#E8720C",color:"#fff",border:"none",padding:"7px 14px",borderRadius:6,fontWeight:600,cursor:"pointer",fontSize:13}} onClick={()=>imprimerFiche(v,photos||[],statutChantier,commentaires||"",pieces||[])}>📄 Imprimer / PDF</button>
        <button style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"none",padding:"7px 14px",borderRadius:6,fontWeight:600,cursor:"pointer",fontSize:13}} onClick={onClose}>✕ Fermer</button>
      </div>
    </div>
    <iframe srcDoc={html} style={{flex:1,border:"none",background:"#fff"}} title="Aperçu fiche"/>
  </div>);
}


// ─── STOCKAGE SUPABASE ──────────────────────────────────────────────────
async function getStorageUsage(){
  try{
    const SUPA_URL="https://pupbzngvudprcweukuoi.supabase.co";
    const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
    const r=await fetch(`${SUPA_URL}/rest/v1/fiche_photos?select=storage_path`,{headers:{"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`}});
    const photos=await r.json();
    if(!Array.isArray(photos))return null;
    // Estimation: moyenne 1.5 Mo par photo
    const estMo=photos.length*1.5;
    const pct=Math.round((estMo/1024)*100);
    return {nbPhotos:photos.length,estMo:Math.round(estMo),pct:Math.min(pct,100)};
  }catch(e){return null;}
}

function BadgeStockage({onClick}){
  const [usage,setUsage]=React.useState(null);
  useEffect(()=>{
    getStorageUsage().then(u=>setUsage(u));
    const t=setInterval(()=>getStorageUsage().then(u=>setUsage(u)),60000);
    return()=>clearInterval(t);
  },[]);
  const pct=usage?.pct||0;
  const estMo=usage?.estMo||0;
  const barColor=pct>=90?"#D73A49":pct>=70?"#E8720C":"#22863A";
  return(<button onClick={onClick} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 12px",cursor:"pointer",color:"#fff",fontSize:11}}>
    <span style={{fontWeight:600,whiteSpace:"nowrap"}}>📦 {estMo} Mo</span>
    <div style={{width:60,height:6,background:"rgba(255,255,255,0.2)",borderRadius:6,overflow:"hidden"}}>
      <div style={{height:6,borderRadius:6,background:barColor,width:Math.min(pct,100)+"%",transition:"width .5s"}}/>
    </div>
    <span style={{fontSize:10,opacity:0.8,whiteSpace:"nowrap"}}>{pct}%</span>
    <span style={{fontSize:10,opacity:0.7}}>Gérer</span>
  </button>);
}

function PageStockage({fiches,onRetour}){
  const [photos,setPhotos]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const [selection,setSelection]=React.useState({});
  const [exportEnCours,setExportEnCours]=React.useState(false);
  const [confirmSuppr,setConfirmSuppr]=React.useState(false);
  const [suppEnCours,setSuppEnCours]=React.useState(false);
  const [msg,setMsg]=React.useState(null);

  const CINQ_MOIS=5*30*24*60*60*1000;

  useEffect(()=>{
    db.get("fiche_photos","?select=*&order=created_at").then(p=>{
      if(Array.isArray(p))setPhotos(p.map(pp=>({...pp,url:db.photoUrl(pp.storage_path)})));
      setLoading(false);
    });
  },[]);

  // Grouper les photos par fiche_id
  const parFiche={};
  photos.forEach(p=>{
    if(!parFiche[p.fiche_id])parFiche[p.fiche_id]={fiche_id:p.fiche_id,photos:[]};
    parFiche[p.fiche_id].photos.push(p);
  });

  // Fiches candidates = Terminé OU Abandonné OU > 5 mois
  const maintenant=Date.now();
  const candidates=fiches.filter(f=>{
    const nbPhotos=parFiche[f.id]?.photos?.length||0;
    if(nbPhotos===0)return false;
    const ancienne=(maintenant-new Date(f.updated_at||f.created_at).getTime())>CINQ_MOIS;
    return f.statut_chantier==="Termine"||f.statut_chantier==="Abandonne"||ancienne;
  });

  function toggleSel(id){setSelection(prev=>({...prev,[id]:!prev[id]}));}
  function toutSelectionner(){const s={};candidates.forEach(f=>{s[f.id]=true;});setSelection(s);}
  function toutDeselectionner(){setSelection({});}
  const selectionIds=Object.keys(selection).filter(id=>selection[id]);
  const photosSelectionnees=selectionIds.flatMap(id=>parFiche[id]?.photos||[]);
  const estMoTotal=Math.round(photos.length*1.5);
  const estMoSel=Math.round(photosSelectionnees.length*1.5);

  async function exporter(){
    if(photosSelectionnees.length===0)return;
    setExportEnCours(true);
    await telechargerZip(photosSelectionnees,null,"photos_archivage");
    setExportEnCours(false);
  }

  async function supprimerPhotos(){
    setSuppEnCours(true);
    try{
      for(const id of selectionIds){
        await db.del("fiche_photos","?fiche_id=eq."+id);
      }
      setPhotos(prev=>prev.filter(p=>!selectionIds.includes(p.fiche_id)));
      setSelection({});
      setConfirmSuppr(false);
      setMsg("✅ Photos supprimées — les fiches et toutes les données sont conservées intactes.");
      setTimeout(()=>setMsg(null),5000);
    }catch(e){setMsg("Erreur : "+e.message);}
    setSuppEnCours(false);
  }

  function raisonCandidate(f){
    const ancienne=(maintenant-new Date(f.updated_at||f.created_at).getTime())>CINQ_MOIS;
    if(f.statut_chantier==="Termine")return{label:"Terminé",color:"#6B7280",bg:"#F5F6F8"};
    if(f.statut_chantier==="Abandonne")return{label:"Abandonné",color:"#9B59B6",bg:"#F5EEF8"};
    if(ancienne)return{label:"+5 mois",color:"#E8720C",bg:"#FFF8E1"};
    return{label:"",color:"",bg:""};
  }

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div>
        <h2 style={{fontSize:20,fontWeight:700,margin:0}}>🗂 Gestion du stockage</h2>
        <p style={{fontSize:13,color:"#6B7280",margin:"4px 0 0"}}>{photos.length} photos · ~{estMoTotal} Mo utilisés sur 1 024 Mo</p>
      </div>
      <button style={S.p2} onClick={onRetour}>← Retour</button>
    </div>

    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16}}>
      <div style={{height:8,background:"#F3F4F6",borderRadius:8,overflow:"hidden",marginBottom:8}}>
        <div style={{height:8,borderRadius:8,width:Math.min((estMoTotal/1024)*100,100)+"%",background:estMoTotal/1024>=0.9?"#D73A49":estMoTotal/1024>=0.8?"#E8720C":"#22863A",transition:"width .4s"}}/>
      </div>
      <p style={{fontSize:12,color:"#6B7280",margin:0}}>~{estMoTotal} Mo / 1 024 Mo ({Math.round((estMoTotal/1024)*100)}%) — estimation basée sur {photos.length} photos</p>
    </div>

    {msg&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"10px 16px",marginBottom:16,fontSize:13,color:"#22863A"}}>{msg}</div>}

    <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{fontSize:13,color:"#6B7280"}}>{candidates.length} dossier{candidates.length>1?"s":""} candidat{candidates.length>1?"s":""} · {selectionIds.length} sélectionné{selectionIds.length>1?"s":""} (~{estMoSel} Mo)</span>
      <button onClick={toutSelectionner} style={{...S.p2,fontSize:12,padding:"4px 12px"}}>Tout sélectionner</button>
      <button onClick={toutDeselectionner} style={{...S.p2,fontSize:12,padding:"4px 12px"}}>Tout déselectionner</button>
    </div>

    {loading&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&candidates.length===0&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>
      <p style={{fontSize:16,margin:"0 0 8px"}}>✅ Aucun dossier à nettoyer</p>
      <p style={{fontSize:13,color:"#9CA3AF",margin:0}}>Tous vos dossiers actifs ont moins de 5 mois</p>
    </div>}

    {candidates.map(f=>{
      const nb=parFiche[f.id]?.photos?.length||0;
      const raison=raisonCandidate(f);
      const sel=!!selection[f.id];
      return(<div key={f.id} style={{background:"#fff",borderRadius:10,border:"1.5px solid "+(sel?"#1B4F8A":"#E2E6EA"),marginBottom:8,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>toggleSel(f.id)}>
        <input type="checkbox" checked={sel} onChange={()=>toggleSel(f.id)} onClick={e=>e.stopPropagation()} style={{width:18,height:18,cursor:"pointer",accentColor:"#1B4F8A"}}/>
        <div style={{flex:1,minWidth:120}}>
          <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{f.de}</span>
          <span style={{fontSize:13,marginLeft:8}}>{f.client||"—"}</span>
          <span style={{fontSize:11,marginLeft:8,color:"#9CA3AF"}}>{f.materiel||""}</span>
        </div>
        <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:raison.bg,color:raison.color}}>{raison.label}</span>
        <span style={{fontSize:12,color:"#6B7280"}}>📷 {nb} photo{nb>1?"s":""} (~{Math.round(nb*1.5)} Mo)</span>
      </div>);
    })}

    {selectionIds.length>0&&<div style={{position:"sticky",bottom:0,background:"#fff",borderTop:"1.5px solid #E2E6EA",padding:"14px 0",marginTop:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"flex-end"}}>
      {!confirmSuppr?(<>
        <button onClick={exporter} disabled={exportEnCours} style={{...S.p1,background:"#22863A",opacity:exportEnCours?0.6:1}}>
          {exportEnCours?"⏳ Export en cours…":"📥 Exporter ZIP ("+selectionIds.length+" dossier"+(selectionIds.length>1?"s":"") +")"}
        </button>
        <button onClick={()=>setConfirmSuppr(true)} style={S.pDanger}>📷 Supprimer les photos ({selectionIds.length})</button>
      </>):(<div style={{background:"#FFF5F5",border:"1.5px solid #D73A49",borderRadius:10,padding:"14px 18px",width:"100%"}}>
        <p style={{fontSize:14,fontWeight:700,color:"#D73A49",margin:"0 0 8px"}}>⚠️ Confirmation requise</p>
        <p style={{fontSize:13,margin:"0 0 14px"}}>Avez-vous bien sauvegardé ces photos sur votre NAS ou un autre support avant de supprimer ?</p>
        <p style={{fontSize:12,color:"#6B7280",margin:"0 0 14px"}}>Les fiches, mesures et données seront conservées. Seules les photos seront supprimées de Supabase.</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={supprimerPhotos} disabled={suppEnCours} style={{...S.pDanger,opacity:suppEnCours?0.6:1}}>{suppEnCours?"Suppression…":"✅ Oui, j'ai sauvegardé — supprimer les photos"}</button>
          <button onClick={()=>setConfirmSuppr(false)} style={S.p2}>❌ Non, annuler</button>
        </div>
      </div>)}
    </div>}
  </div>);
}


// ─── PAGE STATISTIQUES ──────────────────────────────────────────────────
function PageStats({fiches,pieces}){
  const [periode,setPeriode]=useState("total");

  function filtrerParPeriode(liste){
    if(periode==="total")return liste;
    const now=new Date();
    const mois=periode==="6mois"?6:12;
    const limite=new Date(now.getFullYear(),now.getMonth()-mois,now.getDate());
    return liste.filter(f=>new Date(f.created_at||f.updated_at)>=limite);
  }

  const fichesFilt=filtrerParPeriode(fiches);
  const piecesFilt=filtrerParPeriode(pieces);

  // Stats statuts
  const parStatut={};
  STATUTS_CHANTIER.forEach(s=>{parStatut[s.id]=fichesFilt.filter(f=>(f.statut_chantier||"A_demonter")===s.id).length;});
  const total=fichesFilt.length;

  // Taux conversion : Devis -> (En_commande + A_remonter + Termine)
  const totalDevis=fichesFilt.filter(f=>["Devis","En_commande","A_remonter","Termine"].includes(f.statut_chantier||"A_demonter")).length;
  const devisAcceptes=fichesFilt.filter(f=>["En_commande","A_remonter","Termine"].includes(f.statut_chantier)).length;
  const tauxConversion=totalDevis>0?Math.round((devisAcceptes/totalDevis)*100):0;
  const tauxAbandon=total>0?Math.round(((parStatut["Abandonne"]||0)/total)*100):0;
  const tauxTermine=total>0?Math.round(((parStatut["Termine"]||0)/total)*100):0;

  // Stats par technicien
  const parTech={};
  fichesFilt.forEach(f=>{const t=f.tech_entree||"—";if(!parTech[t])parTech[t]=0;parTech[t]++;});
  const techList=Object.entries(parTech).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Top clients
  const parClient={};
  fichesFilt.forEach(f=>{const c=f.client||"—";if(!parClient[c])parClient[c]=0;parClient[c]++;});
  const clientList=Object.entries(parClient).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Stats matériel
  const nAReco=piecesFilt.filter(p=>p.statut==="A_recommander"||!p.statut).length;
  const nCommande=piecesFilt.filter(p=>p.statut==="Commande").length;
  const parPiece={};
  piecesFilt.forEach(p=>{const d=p.designation||"—";if(!parPiece[d])parPiece[d]=0;parPiece[d]++;});
  const pieceList=Object.entries(parPiece).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Stats par mois (12 derniers mois)
  const parMois={};
  const now2=new Date();
  for(let i=11;i>=0;i--){
    const d=new Date(now2.getFullYear(),now2.getMonth()-i,1);
    const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    parMois[k]=0;
  }
  fiches.forEach(f=>{
    if(f.created_at){
      const d=new Date(f.created_at);
      const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
      if(parMois[k]!==undefined)parMois[k]++;
    }
  });
  const moisData=Object.entries(parMois).slice(-6);
  const maxMois=Math.max(...moisData.map(m=>m[1]),1);

  const card=(titre,valeur,detail,color="#1B4F8A")=>(
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px"}}>
      <div style={{fontSize:11,color:"#6B7280",marginBottom:4,fontWeight:500}}>{titre}</div>
      <div style={{fontSize:28,fontWeight:700,color,lineHeight:1}}>{valeur}</div>
      {detail&&<div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>{detail}</div>}
    </div>
  );

  return(<div style={{maxWidth:1000,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <h2 style={{fontSize:20,fontWeight:700,margin:0}}>📊 Statistiques atelier</h2>
      <div style={{display:"flex",gap:6}}>
        {[["6mois","6 derniers mois"],["annee","Dernière année"],["total","Total"]].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriode(v)} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid "+(periode===v?"#1B4F8A":"#E2E6EA"),background:periode===v?"#1B4F8A":"#fff",color:periode===v?"#fff":"#6B7280",fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
    </div>

    {/* Vue globale */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Vue globale</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
      {card("Total dossiers",total,"",  "#1B4F8A")}
      {card("Taux conversion devis",tauxConversion+"%","Devis → Accepté","#22863A")}
      {card("Taux abandon",tauxAbandon+"%","Sur total dossiers","#D73A49")}
      {card("Taux terminé",tauxTermine+"%","Sur total dossiers","#6B7280")}
    </div>

    {/* Répartition par statut */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Répartition par statut</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px",marginBottom:20}}>
      {STATUTS_CHANTIER.map(s=>{
        const n=parStatut[s.id]||0;
        const pct=total>0?Math.round((n/total)*100):0;
        return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,color:s.color,width:120,flexShrink:0}}>{s.label}</span>
          <div style={{flex:1,background:"#F5F6F8",borderRadius:20,height:8,overflow:"hidden"}}>
            <div style={{height:8,borderRadius:20,background:s.color,width:pct+"%",transition:"width .4s"}}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:"#1A1A2E",width:30,textAlign:"right"}}>{n}</span>
          <span style={{fontSize:11,color:"#9CA3AF",width:32}}>{pct}%</span>
        </div>);
      })}
    </div>

    {/* Activité par mois */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Activité — 6 derniers mois</div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px",marginBottom:20}}>
      <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80}}>
        {moisData.map(([k,n])=>{
          const h=maxMois>0?Math.round((n/maxMois)*64):0;
          const [y,m]=k.split("-");
          const nom=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"][parseInt(m)-1];
          return(<div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:10,fontWeight:700,color:"#1B4F8A"}}>{n||""}</span>
            <div style={{width:"100%",background:"#EEF4FF",borderRadius:"4px 4px 0 0",height:h+4,minHeight:4,transition:"height .4s"}}/>
            <span style={{fontSize:9,color:"#9CA3AF"}}>{nom}</span>
          </div>);
        })}
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
      {/* Par technicien */}
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Par technicien</div>
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px"}}>
          {techList.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:12}}>Aucune donnée</div>}
          {techList.map(([t,n])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:600,color:"#1B4F8A",width:36,flexShrink:0,background:"#EEF4FF",textAlign:"center",padding:"2px 4px",borderRadius:4}}>{t}</span>
              <div style={{flex:1,background:"#F5F6F8",borderRadius:20,height:6,overflow:"hidden"}}>
                <div style={{height:6,borderRadius:20,background:"#1B4F8A",width:Math.round((n/(techList[0]?.[1]||1))*100)+"%"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:"#1A1A2E",width:24,textAlign:"right"}}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top clients */}
      <div>
        <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Top 5 clients</div>
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px"}}>
          {clientList.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:12}}>Aucune donnée</div>}
          {clientList.map(([c,n],i)=>(
            <div key={c} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:10,color:"#9CA3AF",width:16,textAlign:"center"}}>{i+1}</span>
              <span style={{fontSize:12,flex:1,fontWeight:500,color:"#1A1A2E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#1B4F8A",background:"#EEF4FF",padding:"2px 8px",borderRadius:10}}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Matériel */}
    <div style={{fontSize:13,fontWeight:700,color:"#1B4F8A",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #EEF4FF"}}>Matériel à renouveler</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
      {card("À recommander",nAReco,"Pièces en attente","#E8720C")}
      {card("Commandées",nCommande,"Pièces commandées","#22863A")}
      {card("Total pièces",piecesFilt.length,"Sur la période","#6B7280")}
    </div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"14px 16px"}}>
      <div style={{fontSize:12,fontWeight:600,color:"#6B7280",marginBottom:8}}>Top pièces commandées</div>
      {pieceList.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:8}}>Aucune donnée</div>}
      {pieceList.map(([d,n],i)=>(
        <div key={d} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          <span style={{fontSize:10,color:"#9CA3AF",width:16,textAlign:"center"}}>{i+1}</span>
          <span style={{fontSize:12,flex:1,color:"#1A1A2E"}}>{d}</span>
          <span style={{fontSize:12,fontWeight:700,color:"#E8720C",background:"#FFF8E1",padding:"2px 8px",borderRadius:10}}>{n}×</span>
        </div>
      ))}
    </div>
  </div>);
}

// ─── PAGE SUIVI MATÉRIEL ─────────────────────────────────────────────────
function PageSuivi(){
  const [pieces,setPieces]=useState([]);const [loading,setLoading]=useState(true);const [filtre,setFiltre]=useState("actif");const [ouverts,setOuverts]=useState({});

  const ST={
    A_recommander:{label:"À recommander",color:"#E8720C",bg:"#FFF8E1"},
    Commande:{label:"Commandé",color:"#22863A",bg:"#F0FFF4"},
  };

  useEffect(()=>{
    db.get("suivi_pieces","?order=created_at.desc").then(d=>{
      setPieces(Array.isArray(d)?d:[]);setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  async function changerStatut(id,statut){
    await db.patch("suivi_pieces","?id=eq."+id,{statut,updated_at:new Date().toISOString()});
    setPieces(prev=>prev.map(p=>p.id===id?{...p,statut}:p));
  }

  async function commander(id){await changerStatut(id,"Commande");}

  const filtrees=filtre==="actif"
    ?pieces.filter(p=>p.statut!=="Commande")
    :filtre==="Commande"
    ?pieces.filter(p=>p.statut==="Commande")
    :pieces;

  const parDE={};
  filtrees.forEach(p=>{
    if(!parDE[p.de])parDE[p.de]={de:p.de,client:p.client,pieces:[]};
    parDE[p.de].pieces.push(p);
  });
  const deList=Object.keys(parDE).sort();

  const nAReco=pieces.filter(p=>p.statut==="A_recommander"||!p.statut).length;
  const nCom=pieces.filter(p=>p.statut==="Commande").length;

  function toggleDE(de){setOuverts(prev=>({...prev,[de]:!prev[de]}));}

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <h2 style={{fontSize:20,fontWeight:700,margin:0}}>Matériel à renouveler</h2>
      {nAReco>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"4px 12px",borderRadius:20,fontWeight:600}}>{nAReco} à recommander</span>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
      {[
        {id:"actif",label:"À recommander",n:nAReco,color:"#E8720C"},
        {id:"Commande",label:"Commandé",n:nCom,color:"#22863A"},
        {id:"tous",label:"Tout voir",n:pieces.length,color:"#6B7280"},
      ].map(s=>(
        <div key={s.id} onClick={()=>setFiltre(s.id)} style={{background:"#fff",borderRadius:10,border:"1.5px solid "+(filtre===s.id?s.color:"#E2E6EA"),padding:"12px",cursor:"pointer",textAlign:"center",transition:"border-color .15s"}}>
          <div style={{fontSize:22,fontWeight:700,color:filtre===s.id?s.color:"#1A1A2E"}}>{s.n}</div>
          <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>{s.label}</div>
        </div>
      ))}
    </div>

    {loading&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&deList.length===0&&<div style={{textAlign:"center",padding:32,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>Aucune pièce dans cette catégorie</div>}

    {deList.map(de=>{
      const g=parDE[de];
      const isOpen=!!ouverts[de];
      const nReco=g.pieces.filter(p=>p.statut==="A_recommander"||!p.statut).length;
      return(<div key={de} style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:8,overflow:"hidden"}}>
        <div onClick={()=>toggleDE(de)} style={{background:"#F8F9FA",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderBottom:isOpen?"1px solid #E2E6EA":"none"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A"}}>{de}</span>
          <span style={{fontSize:13,color:"#6B7280"}}>— {g.client||"—"}</span>
          <span style={{marginLeft:"auto",fontSize:11,background:"#F5F6F8",padding:"2px 8px",borderRadius:12,color:"#6B7280"}}>{g.pieces.length} pièce{g.pieces.length>1?"s":""}</span>
          {nReco>0&&<span style={{fontSize:10,background:"#FFF8E1",color:"#E8720C",padding:"2px 6px",borderRadius:10,fontWeight:600}}>{nReco} à reco.</span>}
          <span style={{fontSize:14,color:"#9CA3AF"}}>{isOpen?"▲":"▼"}</span>
        </div>
        {isOpen&&<div>
          {g.pieces.map(p=>{
            const estCommande=p.statut==="Commande";
            const sc=estCommande?ST.Commande:ST.A_recommander;
            return(<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #F5F6F8"}}>
              <div style={{flex:1,minWidth:120}}>
                <span style={{fontSize:13,fontWeight:600,textDecoration:estCommande?"line-through":"none",color:estCommande?"#9CA3AF":"#1A1A2E"}}>{p.designation}</span>
                {p.reference&&<span style={{fontSize:11,color:"#6B7280",marginLeft:8,background:"#F5F6F8",padding:"1px 6px",borderRadius:4}}>{p.reference}</span>}
              </div>
              <span style={{fontSize:10,background:p.source==="auto"?"#F0FFF4":"#EEF4FF",color:p.source==="auto"?"#22863A":"#1B4F8A",padding:"2px 6px",borderRadius:10}}>{p.source==="auto"?"Auto":"Manuel"}</span>
              <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span>
              {!estCommande
                ?<button onClick={()=>commander(p.id)} style={{fontSize:12,padding:"5px 14px",borderRadius:6,border:"none",background:"#22863A",color:"#fff",cursor:"pointer",fontWeight:600}}>✓ Commander</button>
                :<button onClick={()=>changerStatut(p.id,"A_recommander")} style={{fontSize:11,padding:"4px 10px",borderRadius:6,border:"1px solid #E2E6EA",background:"#fff",color:"#6B7280",cursor:"pointer"}}>↩ Annuler</button>
              }
            </div>);
          })}
        </div>}
      </div>);
    })}
  </div>);
}


// ─── PAGE PLANNING KANBAN ───────────────────────────────────────────────
function PagePlanning({fiches,onOuvrirFiche,onStatutChange}){
  const [filtTech,setFiltTech]=useState("tous");const [showTermine,setShowTermine]=useState(false);const [showAbandonne,setShowAbandonne]=useState(false);
  const [dragId,setDragId]=useState(null);const [dragOver,setDragOver]=useState(null);
  const statuts=(()=>{let s=STATUTS_CHANTIER;if(!showTermine)s=s.filter(x=>x.id!=="Termine");if(!showAbandonne)s=s.filter(x=>x.id!=="Abandonne");return s;})();
  const fichesFilt=fiches.filter(f=>filtTech==="tous"||(f.tech_entree||"")==filtTech);
  const parStatut={};STATUTS_CHANTIER.forEach(s=>{parStatut[s.id]=[];});
  fichesFilt.forEach(f=>{const sid=f.statut_chantier||"A_demonter";if(parStatut[sid])parStatut[sid].push(f);});
  const devisCount=parStatut["Devis"]?.length||0;
  const techs=[...new Set(fiches.map(f=>f.tech_entree).filter(Boolean))];

  function handleDragStart(e,ficheId){
    setDragId(ficheId);
    e.dataTransfer.effectAllowed="move";
    e.dataTransfer.setData("text/plain",ficheId);
  }
  function handleDragOver(e,statutId){
    e.preventDefault();e.dataTransfer.dropEffect="move";
    setDragOver(statutId);
  }
  function handleDrop(e,statutId){
    e.preventDefault();
    if(dragId&&dragId!==statutId){
      onStatutChange(dragId,statutId);
    }
    setDragId(null);setDragOver(null);
  }
  function handleDragEnd(){setDragId(null);setDragOver(null);}

  // Touch drag & drop pour tablette
  function handleTouchStart(e,ficheId){setDragId(ficheId);}
  function handleTouchEnd(e,ficheId){
    const touch=e.changedTouches[0];
    const el=document.elementFromPoint(touch.clientX,touch.clientY);
    const col=el?.closest("[data-statut]");
    if(col){const newStatut=col.getAttribute("data-statut");if(newStatut&&newStatut!==ficheId)onStatutChange(ficheId,newStatut);}
    setDragId(null);setDragOver(null);
  }

  return(<div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <h2 style={{fontSize:20,fontWeight:700,margin:0}}>Planning atelier</h2>
        {devisCount>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"3px 10px",borderRadius:20,fontWeight:600}}>⚠ {devisCount} devis en attente</span>}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <select value={filtTech} onChange={e=>setFiltTech(e.target.value)} style={{...S.sel,width:130}}>
          <option value="tous">Tous</option>
          {techs.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={()=>setShowTermine(!showTermine)} style={{...S.p2,fontSize:12,padding:"5px 12px"}}>{showTermine?"Masquer Terminé":"Afficher Terminé"}</button>
        <button onClick={()=>setShowAbandonne(!showAbandonne)} style={{...S.p2,fontSize:12,padding:"5px 12px",color:"#9B59B6",borderColor:"#9B59B6"}}>{showAbandonne?"Masquer Abandonné":"Afficher Abandonné"}</button>
      </div>
    </div>
    <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 10px",textAlign:"right"}}>💡 Glissez les cartes entre les colonnes pour changer le statut</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat("+statuts.length+",1fr)",gap:10,overflowX:"auto"}}>
      {statuts.map(s=>(
        <div key={s.id}
          data-statut={s.id}
          onDragOver={e=>handleDragOver(e,s.id)}
          onDrop={e=>handleDrop(e,s.id)}
          onDragEnd={handleDragEnd}
          style={{background:dragOver===s.id?"#EEF4FF":"#fff",borderRadius:10,border:"1.5px solid "+(dragOver===s.id?"#1B4F8A":"#E2E6EA"),padding:"10px 8px",minHeight:120,transition:"background .15s,border-color .15s"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:600,color:s.color}}>● {s.label}</span>
            <span style={{fontSize:11,background:"#F5F6F8",border:"1px solid #E2E6EA",borderRadius:20,padding:"1px 8px",color:"#6B7280"}}>{(parStatut[s.id]||[]).length}</span>
          </div>
          {(parStatut[s.id]||[]).length===0&&<p style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:"16px 0",margin:0}}>Vide</p>}
          {(parStatut[s.id]||[]).map(f=><CarteKanban key={f.id} f={f} s={s} onOuvrirFiche={onOuvrirFiche} onStatutChange={onStatutChange} onDragStart={handleDragStart} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} isDragging={dragId===f.id}/>)}
        </div>
      ))}
    </div>
  </div>);
}
function CarteKanban({f,s,onOuvrirFiche,onStatutChange,onDragStart,onTouchStart,onTouchEnd,isDragging}){
  const [ouvert,setOuvert]=useState(false);
  return(<div
    draggable={true}
    onDragStart={e=>onDragStart(e,f.id)}
    onTouchStart={()=>onTouchStart(null,f.id)}
    onTouchEnd={e=>onTouchEnd(e,f.id)}
    style={{background:isDragging?"#EEF4FF":"#F8F9FA",border:"1px solid "+(isDragging?"#1B4F8A":"#E2E6EA"),borderRadius:8,marginBottom:8,cursor:"grab",opacity:isDragging?0.6:1,transition:"opacity .15s,border-color .15s",userSelect:"none"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer"}} onClick={()=>setOuvert(!ouvert)}>
      <span style={{fontSize:13,color:"#9CA3AF",cursor:"grab"}}>⠿</span>
      <div style={{flex:1,minWidth:0}}>
        <span style={{fontSize:12,fontWeight:700,color:"#1B4F8A"}}>{f.de}</span>
        <span style={{fontSize:12,color:"#1A1A2E",marginLeft:6,fontWeight:500}}>{f.client||"—"}</span>
      </div>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"8px 10px",borderTop:"1px solid #E2E6EA",background:"#fff"}}>
      <div style={{fontSize:11,color:"#6B7280",marginBottom:4}}>{f.materiel||"Moteur"}</div>
      <div style={{fontSize:11,color:"#9CA3AF",marginBottom:8}}>Entrée le {fmt(f.created_at)}</div>
      <select value={f.statut_chantier||"A_demonter"} onChange={e=>onStatutChange(f.id,e.target.value)} style={{...S.sel,marginBottom:8,fontSize:12}}>
        {STATUTS_CHANTIER.map(st=><option key={st.id} value={st.id}>{st.label}</option>)}
      </select>
      <button onClick={()=>onOuvrirFiche(f)} style={{width:"100%",fontSize:11,padding:"5px",borderRadius:6,border:"1px solid #1B4F8A",background:"#EEF4FF",color:"#1B4F8A",cursor:"pointer",fontWeight:600}}>📂 Ouvrir la fiche</button>
    </div>}
  </div>);
}

// ─── PAGE ACCUEIL EXPLORATEUR ───────────────────────────────────────────

// ─── FICHE ITEM (niveau 3 : Lieu/Identification) ────────────────────────
function FicheItem({f,onOpen,onDelete,onStatutChange,categories}){
  const [ouvert,setOuvert]=useState(false);
  const [photos,setPhotos]=useState([]);
  const [loadingP,setLoadingP]=useState(false);
  const [confirmSupprPhotos,setConfirmSupprPhotos]=useState(false);
  const [confirmSupprFiche,setConfirmSupprFiche]=useState(false);
  const [ajoutPhoto,setAjoutPhoto]=useState(false);
  const [catPhoto,setCatPhoto]=useState("");
  const [uploadEnCours,setUploadEnCours]=useState(false);
  const fileRef=React.useRef();
  const ch=cheminFiche({client:f.client,de:f.de,materiel_lieu:f.materiel});
  const st=statutInfo(f.statut_chantier);

  async function toggle(){
    if(!ouvert&&photos.length===0){
      setLoadingP(true);
      try{const p=await db.get("fiche_photos","?fiche_id=eq."+f.id+"&order=created_at");
      if(Array.isArray(p))setPhotos(p.map(pp=>({...pp,url:db.photoUrl(pp.storage_path)})));}
      catch(e){}finally{setLoadingP(false);}
    }
    setOuvert(!ouvert);
  }

  async function supprimerPhotos(){
    try{await db.del("fiche_photos","?fiche_id=eq."+f.id);setPhotos([]);setConfirmSupprPhotos(false);}
    catch(e){alert("Erreur: "+e.message);}
  }

  async function supprimerFiche(){
    try{
      await db.del("fiche_photos","?fiche_id=eq."+f.id);
      await db.del("fiche_valeurs","?fiche_id=eq."+f.id);
      await db.del("suivi_pieces","?fiche_id=eq."+f.id);
      await db.del("fiche_historique","?fiche_id=eq."+f.id);
      await db.del("fiches","?id=eq."+f.id);
      onDelete(f.id);
    }catch(e){alert("Erreur: "+e.message);}
  }

  async function uploadPhoto(e){
    const file=e.target.files[0];if(!file||!catPhoto)return;
    setUploadEnCours(true);
    try{
      const ext=file.name.split(".").pop();
      const slug=catPhoto.toLowerCase().replace(/[^a-z0-9]/g,"_");
      const path=ch.chemin+"/"+slug+"_"+Date.now()+"."+ext;
      const {data,error}=await window._supabase.storage.from("photos").upload(path,file,{upsert:true});
      if(error)throw error;
      const rec=await db.post("fiche_photos",{fiche_id:f.id,storage_path:path,nom_fichier:file.name,categorie_nom:catPhoto,etape:""});
      if(rec&&rec[0])setPhotos(prev=>[...prev,{...rec[0],url:db.photoUrl(path)}]);
      setAjoutPhoto(false);setCatPhoto("");
    }catch(err){alert("Erreur upload: "+err.message);}
    setUploadEnCours(false);
  }

  async function handleZip(){
    // Charger les photos si pas encore fait
    let phots=photos;
    if(phots.length===0){
      try{const p=await db.get("fiche_photos","?fiche_id=eq."+f.id+"&order=created_at");
      if(Array.isArray(p)){phots=p.map(pp=>({...pp,url:db.photoUrl(pp.storage_path)}));setPhotos(phots);}}
      catch(e){}
    }
    // Télécharger même sans photos — on passe les valeurs pour le PDF
    const vals=await db.get("fiche_valeurs","?fiche_id=eq."+f.id+"&order=created_at");
    const v=Array.isArray(vals)?Object.fromEntries(vals.map(r=>[r.champ_id,r.valeur])):{};
    v.de=f.de;v.client=f.client;v.materiel_lieu=f.materiel;
    await telechargerZip(phots,v,ch.chemin.replace(/\//g,"_")||f.de);
  }

  return(<div style={{marginLeft:20,marginBottom:6,borderLeft:"2px solid #E2E6EA",paddingLeft:12}}>
    {/* En-tête lieu/identification */}
    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 10px",background:"#fff",borderRadius:8,border:"1px solid #E2E6EA"}} onClick={toggle}>
      <span style={{fontSize:15}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:13,fontWeight:600,color:"#1B4F8A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.materiel||"Sans identification"}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{fmt(f.created_at)}</p>
      </div>
      <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:12,whiteSpace:"nowrap",background:st.bg,color:st.color}}>{st.label}</span>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>

    {ouvert&&<div style={{padding:"10px 12px",background:"#fff",borderRadius:"0 0 8px 8px",border:"1px solid #E2E6EA",borderTop:"none"}}>
      {/* Statut */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"6px 10px",background:"#F8F9FA",borderRadius:6}}>
        <span style={{fontSize:12,fontWeight:600,color:"#6B7280",flexShrink:0}}>Statut :</span>
        <select value={f.statut_chantier||"A_demonter"} onChange={e=>onStatutChange(f.id,e.target.value)} style={{...S.sel,flex:1,fontSize:12}}>
          {STATUTS_CHANTIER.map(st2=><option key={st2.id} value={st2.id}>{st2.label}</option>)}
        </select>
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>onOpen(f)} style={{...S.p1,fontSize:12,padding:"6px 12px"}}>📝 Ouvrir fiche</button><button onClick={async()=>{const vals=await db.get("fiche_valeurs","?fiche_id=eq."+f.id+"&order=created_at");const v2=Array.isArray(vals)?Object.fromEntries(vals.map(r=>[r.champ_id,r.valeur])):{};v2.de=f.de;v2.client=f.client;v2.materiel_lieu=f.materiel;const ph=await db.get("fiche_photos","?fiche_id=eq."+f.id+"&order=created_at");const photos2=Array.isArray(ph)?ph.map(p=>({...p,url:db.photoUrl(p.storage_path)})):[];imprimerFiche(v2,photos2,f.statut_chantier||"A_demonter","",[])}} style={{...S.p2,fontSize:12,padding:"6px 12px"}}>👁 Aperçu</button>
        <button onClick={handleZip} style={{...S.p2,fontSize:12,padding:"6px 12px"}}>📥 ZIP + PDF</button>
        <button onClick={()=>setAjoutPhoto(!ajoutPhoto)} style={{...S.p2,fontSize:12,padding:"6px 12px",color:"#22863A",borderColor:"#22863A"}}>📷 Ajouter photo</button>
        <button onClick={()=>setConfirmSupprPhotos(true)} style={{...S.p2,fontSize:12,padding:"6px 12px",color:"#E8720C",borderColor:"#E8720C"}}>🗑 Suppr. photos</button>
        <button onClick={()=>setConfirmSupprFiche(true)} style={{...S.pDanger,fontSize:12,padding:"6px 12px"}}>🗑 Suppr. fiche</button>
      </div>

      {/* Ajout photo */}
      {ajoutPhoto&&<div style={{background:"#F0FFF4",border:"1px solid #22863A",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:"#22863A",marginBottom:8}}>📷 Ajouter une photo</div>
        <select value={catPhoto} onChange={e=>setCatPhoto(e.target.value)} style={{...S.sel,marginBottom:8,fontSize:12}}>
          <option value="">— Choisir une catégorie</option>
          {(categories||[]).map(c=><option key={c.nom} value={c.nom}>{c.nom}</option>)}
        </select>
        {catPhoto&&<div style={{display:"flex",gap:8}}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={uploadPhoto} style={{display:"none"}}/>
          <button onClick={()=>fileRef.current.click()} disabled={uploadEnCours} style={{...S.p1,fontSize:12,background:"#22863A",opacity:uploadEnCours?0.6:1}}>{uploadEnCours?"⏳ Upload...":"📷 Choisir photo"}</button>
          <button onClick={()=>{setAjoutPhoto(false);setCatPhoto("");}} style={{...S.p2,fontSize:12}}>Annuler</button>
        </div>}
      </div>}

      {/* Confirmations */}
      {confirmSupprPhotos&&<div style={{background:"#FFF8E1",border:"1px solid #E8720C",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:700,color:"#E8720C",margin:"0 0 6px"}}>⚠️ Supprimer les photos ?</p>
        <p style={{fontSize:11,color:"#6B7280",margin:"0 0 10px"}}>La fiche et toutes les données sont conservées.</p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={supprimerPhotos} style={{...S.p1,fontSize:12,background:"#E8720C"}}>✅ Confirmer</button>
          <button onClick={()=>setConfirmSupprPhotos(false)} style={{...S.p2,fontSize:12}}>Annuler</button>
        </div>
      </div>}
      {confirmSupprFiche&&<div style={{background:"#FFF5F5",border:"1px solid #D73A49",borderRadius:8,padding:"10px 12px",marginBottom:10}}>
        <p style={{fontSize:12,fontWeight:700,color:"#D73A49",margin:"0 0 6px"}}>⚠️ Supprimer toute la fiche ?</p>
        <p style={{fontSize:11,color:"#6B7280",margin:"0 0 10px"}}>Irréversible — fiche, données, photos et historique supprimés.</p>
        <div style={{display:"flex",gap:8}}>
          <button onClick={supprimerFiche} style={{...S.pDanger,fontSize:12}}>🗑 Oui, tout supprimer</button>
          <button onClick={()=>setConfirmSupprFiche(false)} style={{...S.p2,fontSize:12}}>Annuler</button>
        </div>
      </div>}

      {/* Photos */}
      {loadingP&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:8}}>Chargement…</div>}
      {photos.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))",gap:6,marginTop:6}}>
        {photos.map((p,i)=>(
          <div key={i} style={{position:"relative",cursor:"pointer"}} onClick={()=>window.open(p.url,"_blank")}>
            <img src={p.url} alt={p.categorie_nom||""} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:6,border:"1px solid #E2E6EA"}}/>
            {p.categorie_nom&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:8,padding:"2px 3px",borderRadius:"0 0 6px 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.categorie_nom}</div>}
          </div>
        ))}
      </div>}
      {!loadingP&&photos.length===0&&<div style={{fontSize:12,color:"#9CA3AF",textAlign:"center",padding:8}}>Aucune photo — utilisez "Ajouter photo" ou prenez des photos dans la fiche</div>}
    </div>}
  </div>);
}

// ─── DOSSIER DE (niveau 2) ───────────────────────────────────────────────
function DossierDE({de,fiches,onOpen,onDelete,onStatutChange,categories}){
  const [ouvert,setOuvert]=useState(false);
  return(<div style={{marginLeft:16,marginBottom:6,borderLeft:"2px solid #D6E4F7",paddingLeft:12}}>
    <div onClick={()=>setOuvert(!ouvert)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 12px",background:"#EEF4FF",borderRadius:8,border:"1px solid #D6E4F7"}}>
      <span style={{fontSize:15}}>{ouvert?"📂":"📁"}</span>
      <span style={{fontSize:13,fontWeight:700,color:"#1B4F8A",flex:1}}>{de}</span>
      <span style={{fontSize:11,color:"#6B7280",background:"#fff",padding:"2px 8px",borderRadius:10,border:"1px solid #E2E6EA"}}>{fiches.length} fiche{fiches.length>1?"s":""}</span>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{marginTop:6}}>
      {fiches.map(f=><FicheItem key={f.id} f={f} onOpen={onOpen} onDelete={onDelete} onStatutChange={onStatutChange} categories={categories}/>)}
    </div>}
  </div>);
}

// ─── DOSSIER CLIENT (niveau 1) ───────────────────────────────────────────
function DossierClient({client,fiches,onOpen,onDelete,onStatutChange,categories}){
  const [ouvert,setOuvert]=useState(false);
  // Grouper par DE
  const parDE={};
  fiches.forEach(f=>{const d=f.de||"Sans DE";if(!parDE[d])parDE[d]=[];parDE[d].push(f);});
  const deList=Object.keys(parDE).sort();
  const nbDE=deList.length;
  return(<div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",marginBottom:8,overflow:"hidden"}}>
    <div onClick={()=>setOuvert(!ouvert)} style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:"#F8F9FA"}}>
      <span style={{fontSize:16}}>{ouvert?"📂":"📁"}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{margin:0,fontSize:14,fontWeight:700,color:"#1A1A2E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client}</p>
        <p style={{margin:0,fontSize:11,color:"#9CA3AF"}}>{nbDE} N° DE · {fiches.length} fiche{fiches.length>1?"s":""}</p>
      </div>
      <span style={{fontSize:13,color:"#9CA3AF"}}>{ouvert?"▲":"▼"}</span>
    </div>
    {ouvert&&<div style={{padding:"8px 0 8px 0"}}>
      {deList.map(de=><DossierDE key={de} de={de} fiches={parDE[de]} onOpen={onOpen} onDelete={onDelete} onStatutChange={onStatutChange} categories={categories}/>)}
    </div>}
  </div>);
}

// ─── PAGE ACCUEIL ────────────────────────────────────────────────────────
function PageAccueil({fiches,setFiches,onNew,onOpen,onStatutChange,categories}){
  const [loading,setLoading]=useState(true);const [q,setQ]=useState("");const [fs,setFs]=useState("Tous");
  useEffect(()=>{db.get("fiches","?order=created_at.desc").then(d=>{setFiches(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  async function onStatutChange(ficheId,newStatut){await db.patch("fiches","?id=eq."+ficheId,{statut_chantier:newStatut});setFiches(prev=>prev.map(f=>f.id===ficheId?{...f,statut_chantier:newStatut}:f));}
  function onDelete(id){setFiches(prev=>prev.filter(f=>f.id!==id));}
  const filtrees=fiches.filter(f=>{
    const qq=q.toLowerCase();
    const matchQ=!qq||(f.de||"").toLowerCase().includes(qq)||(f.client||"").toLowerCase().includes(qq)||(f.materiel||"").toLowerCase().includes(qq);
    const matchS=fs==="Tous"||(f.statut_chantier||"A_demonter")===fs;
    return matchQ&&matchS;
  });
  const parClient={};filtrees.forEach(f=>{const c=f.client||"Sans client";if(!parClient[c])parClient[c]=[];parClient[c].push(f);});
  const clientList=Object.keys(parClient).sort();
  const devisCount=fiches.filter(f=>(f.statut_chantier||"A_demonter")==="Devis").length;
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,margin:0}}>Fiches atelier</h1>
          <p style={{fontSize:13,color:"#6B7280",margin:"3px 0 0"}}>{clientList.length} client{clientList.length>1?"s":""} · {fiches.length} fiche{fiches.length>1?"s":""}</p>
        </div>
        {devisCount>0&&<span style={{background:"#FFF8E1",color:"#E8720C",fontSize:12,padding:"4px 12px",borderRadius:20,fontWeight:600}}>⚠ {devisCount} devis en attente</span>}
      </div>
      <button style={S.p1} onClick={onNew}>+ Nouvelle fiche</button>
    </div>
    <div style={{background:"#fff",borderRadius:10,border:"1px solid #E2E6EA",padding:"12px 16px",marginBottom:16,display:"flex",gap:10,flexWrap:"wrap"}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Client, N° DE, lieu..." style={{...S.inp,flex:1,minWidth:160}}/>
      <select value={fs} onChange={e=>setFs(e.target.value)} style={{...S.sel,width:160}}>
        <option value="Tous">Tous statuts</option>
        {STATUTS_CHANTIER.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
    {loading&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF"}}>Chargement…</div>}
    {!loading&&clientList.length===0&&<div style={{textAlign:"center",padding:40,color:"#9CA3AF",background:"#fff",borderRadius:10,border:"1px solid #E2E6EA"}}>{fiches.length===0?"Aucune fiche — créez la première !":"Aucun résultat."}</div>}
    {clientList.map(c=><DossierClient key={c} client={c} fiches={parClient[c]} onOpen={onOpen} onDelete={onDelete} onStatutChange={onStatutChange} categories={categories}/>)}
  </div>);
}

function PageChoix({onChoisir,onRetour}){
  const mats=[{id:"Moteur",emoji:"⚙️",desc:"Moteur électrique seul"},{id:"Pompe",emoji:"💧",desc:"Corps de pompe + moteur"},{id:"Ventilation",emoji:"🌀",desc:"Ventilateur + moteur",soon:true},{id:"Réducteur",emoji:"🔩",desc:"Réducteur + moteur",soon:true},{id:"Moto-réducteur",emoji:"🔧",desc:"Moto-réducteur complet",soon:true}];
  return(<div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px"}}><button style={{...S.p2,marginBottom:20}} onClick={onRetour}>← Retour</button><h2 style={{fontSize:20,fontWeight:800,margin:"0 0 6px"}}>Nouvelle fiche — quel matériel ?</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14}}>{mats.map(m=><div key={m.id} onClick={()=>onChoisir(m.id)} style={{...S.card,textAlign:"center",cursor:m.soon?"default":"pointer",opacity:m.soon?0.6:1}}><div style={{fontSize:32,marginBottom:8}}>{m.emoji}</div><p style={{fontWeight:700,fontSize:15,margin:"0 0 4px"}}>{m.id}</p><p style={{fontSize:12,color:"#9CA3AF",margin:0}}>{m.desc}</p>{m.soon&&<p style={{fontSize:11,color:"#E8720C",margin:"6px 0 0"}}>Bientôt disponible</p>}</div>)}</div></div>);
}

function PageFiche({ficheInit,typeMateriel,sessionTech,techs,clients,onAddClient,categories,onRetour,onFicheUpdated}){
  const isPompe=typeMateriel==="Pompe";
  const etapesActives=isPompe?ETAPES_POMPE:ETAPES;
  const champsActifs=isPompe?CHAMPS_POMPE:CHAMPS;
  const [ficheId,setFicheId]=useState(ficheInit?.id||null);const [v,setV]=useState({de:ficheInit?.de||genDE(),date_entree:today()});const [actif,setActif]=useState(ficheInit?.etape_active||0);const [validees,setValidees]=useState(ficheInit?.etapes_validees||[]);const [nrMap,setNrMap]=useState({});const [saving,setSaving]=useState(false);const [flash,setFlash]=useState(null);const [erreur,setErreur]=useState(null);const [apercu,setApercu]=useState(false);const [photos,setPhotos]=useState([]);const [statutChantier,setStatutChantier]=useState(ficheInit?.statut_chantier||"A_demonter");const [commentaires,setCommentaires]=useState("");const [piecesCommande,setPiecesCommande]=useState([]);const [savingComm,setSavingComm]=useState(false);

  useEffect(()=>{
    if(!ficheInit?.id)return;
    db.get("fiche_valeurs","?fiche_id=eq."+ficheInit.id).then(rows=>{if(!Array.isArray(rows))return;const m={};rows.forEach(r=>{m[r.champ_id]=r.valeur;});setV(p=>({...p,...m}));setCommentaires(m["__commentaires"]||"");});
    db.get("fiche_photos","?fiche_id=eq."+ficheInit.id+"&order=created_at").then(rows=>{if(!Array.isArray(rows))return;setPhotos(rows.map(p=>({...p,url:db.photoUrl(p.storage_path)})));});
    db.get("suivi_pieces","?fiche_id=eq."+ficheInit.id).then(rows=>{if(Array.isArray(rows))setPiecesCommande(rows);});
    setStatutChantier(ficheInit.statut_chantier||"A_demonter");
  },[ficheInit?.id]);

  const onChange=useCallback((id,val)=>setV(p=>({...p,[id]:val})),[]);
  const onPhotoAdded=useCallback(p=>setPhotos(prev=>[...prev,p]),[]);

  async function changerStatut(newStatut){setStatutChantier(newStatut);if(ficheId){await db.patch("fiches","?id=eq."+ficheId,{statut_chantier:newStatut});if(onFicheUpdated)onFicheUpdated(ficheId,{statut_chantier:newStatut});}}

  async function sauvegarderComm(){
    if(!ficheId)return;setSavingComm(true);
    try{
      await db.del("fiche_valeurs","?fiche_id=eq."+ficheId+"&champ_id=in.(__commentaires)");
      if(commentaires)await db.post("fiche_valeurs",[{fiche_id:ficheId,champ_id:"__commentaires",valeur:commentaires}]);
    }catch(e){}
    setSavingComm(false);
  }

  async function savePartiel(idx){
    setSaving(true);setErreur(null);
    try{
      let fid=ficheId;
      if(!fid){
        const res=await db.post("fiches",{de:v.de,materiel:v.materiel_lieu||"Moteur",client:v.client||"",statut:"En cours",statut_chantier:statutChantier||"A_demonter",etape_active:idx,etapes_validees:validees,type_materiel:typeMateriel||"Moteur"});
        fid=Array.isArray(res)?res[0]?.id:res?.id;if(!fid)throw new Error("Impossible de créer la fiche");setFicheId(fid);
      }else{
        await db.patch("fiches","?id=eq."+fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur",statut:"En cours",etape_active:idx});
      }
      const champs=Object.keys(v).filter(k=>v[k]!==undefined&&v[k]!=="");
      if(champs.length>0){
        await db.del("fiche_valeurs","?fiche_id=eq."+fid);
        const rows=champs.map(k=>({fiche_id:fid,champ_id:k,valeur:String(v[k])}));
        for(let i=0;i<rows.length;i+=50){await db.post("fiche_valeurs",rows.slice(i,i+50));}
      }
      await db.post("fiche_historique",{fiche_id:fid,technicien:sessionTech,action:"Sauvegarde partielle étape "+(idx+1)});
      setFlash("saved_partiel");setTimeout(()=>setFlash(null),2000);if(fid)onFicheUpdated(fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur"});
    }catch(e){setErreur(e.message||"Erreur de sauvegarde");}
    setSaving(false);
  }
  async function save(idx){
    setSaving(true);setErreur(null);
    try{
      let fid=ficheId;const newVal=[...new Set([...validees,idx])];const toutFini=newVal.length===etapesActives.length;const newSC=toutFini&&statutChantier==="A_demonter"?"Devis":statutChantier;
      if(!fid){
        const res=await db.post("fiches",{de:v.de,materiel:v.materiel_lieu||"Moteur",client:v.client||"",statut:toutFini?"Terminée":"En cours",statut_chantier:newSC,etape_active:idx+1,etapes_validees:newVal,type_materiel:typeMateriel||"Moteur"});
        fid=Array.isArray(res)?res[0]?.id:res?.id;if(!fid)throw new Error("Impossible de créer la fiche");setFicheId(fid);
        for(const p of photos){if(!p.fiche_id)try{await db.post("fiche_photos",{fiche_id:fid,etape:p.etape,categorie_slug:p.categorie_slug,categorie_nom:p.categorie_nom,nom_fichier:p.nom_fichier,storage_path:p.storage_path});}catch(e){}}
      }else{await db.patch("fiches","?id=eq."+fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur",statut:toutFini?"Terminée":"En cours",statut_chantier:newSC,etape_active:Math.min(idx+1,etapesActives.length-1),etapes_validees:newVal});setStatutChantier(newSC);}
      await db.del("fiche_valeurs","?fiche_id=eq."+fid+"&champ_id=not.in.(__commentaires)");
      const vals=Object.entries(v).filter(([k,val])=>!k.startsWith("__")&&val!==undefined&&val!=="").map(([champ_id,valeur])=>({fiche_id:fid,champ_id,valeur:String(valeur)}));
      if(vals.length>0)await db.post("fiche_valeurs",vals);
      await db.post("fiche_historique",{fiche_id:fid,technicien:sessionTech,action:"Étape validée",etape:ETAPES[idx]});
      if(onFicheUpdated)onFicheUpdated(fid,{statut:toutFini?"Terminée":"En cours",statut_chantier:newSC});
      setValidees(newVal);if(idx+1<etapesActives.length)setActif(idx+1);setFlash(idx);setTimeout(()=>setFlash(null),3000);onFicheUpdated(fid,{de:v.de,client:v.client||"",materiel:v.materiel_lieu||"Moteur",statut_chantier:newSC});
    }catch(e){setErreur("Erreur : "+e.message);}finally{setSaving(false);}
  }

  const prog=Math.round((validees.length/etapesActives.length)*100);const chem=cheminFiche(v);const st=statutInfo(statutChantier);

  return(<div style={{maxWidth:800,margin:"0 auto",paddingBottom:40}}>
    {apercu&&<ApercuFiche v={v} photos={photos} statutChantier={statutChantier} commentaires={commentaires} pieces={piecesCommande} onClose={()=>setApercu(false)}/>}
    <div style={{background:"#1B4F8A",color:"#fff",padding:"10px 16px",position:"sticky",top:56,zIndex:90}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div><p style={{margin:0,fontSize:12,fontWeight:700}}>{v.de} · {v.client||"Client"} · {v.materiel_lieu||typeMateriel||"Moteur"}</p><p style={{margin:0,fontSize:10,opacity:0.7}}>📁 {chem.client}/{chem.de}/{chem.mat} · {typeMateriel||"Moteur"}</p></div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <select value={statutChantier} onChange={e=>changerStatut(e.target.value)} style={{padding:"3px 8px",borderRadius:20,border:"1.5px solid "+st.color,fontSize:11,fontWeight:600,color:st.color,background:st.bg,cursor:"pointer"}}>{STATUTS_CHANTIER.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,height:6,width:80}}><div style={{background:"#E8720C",height:6,borderRadius:20,width:prog+"%",transition:"width .4s"}}/></div>
          <span style={{fontSize:11,opacity:0.85}}>{prog}%</span>
          <button style={{...S.p2,fontSize:11,padding:"4px 10px"}} onClick={()=>setApercu(true)}>👁</button><button style={{...S.p2,fontSize:11,padding:"4px 10px",background:"#22863A",color:"#fff",border:"none"}} onClick={()=>{const nrM={};etapesActives.forEach((nom,i)=>{if(nrMap[i])nrM[String(i+1)]=true;});imprimerFiche(v,photos,statutChantier,commentaires,piecesCommande,nrM);}}>📄</button><button style={{...S.p2,fontSize:11,padding:"4px 10px"}} onClick={onRetour}>← Liste</button>
        </div>
      </div>
    </div>
    <div style={{padding:"16px 16px 0"}}>
      {flash==="saved_partiel"&&<div style={{...S.ok,background:"#EEF4FF",color:"#1B4F8A",border:"1px solid #D6E4F7"}}>💾 Données sauvegardées.</div>}{flash!==null&&flash!=="saved_partiel"&&<div style={S.ok}>✅ Étape "{etapesActives[flash]}" enregistrée.</div>}
      {erreur&&<div style={{...S.alert,marginBottom:14}}>{erreur}</div>}
      {etapesActives.map((nom,i)=><SectionEtape key={nom} nom={nom} idx={i} actif={actif} validees={validees} v={v} nr={!!nrMap[i]} onChange={onChange} onNR={()=>setNrMap(p=>({...p,[i]:!p[i]}))} onValider={()=>save(i)} onSauvegarder={()=>savePartiel(i)} sessionTech={sessionTech} techs={techs} clients={clients} onAddClient={onAddClient} saving={saving} ficheId={ficheId} cheminBase={chem.chemin} categories={categories} photos={photos} onPhotoAdded={onPhotoAdded} champsSource={champsActifs}/>)}

      <SectionMaterielCommander v={v} ficheId={ficheId} de={v.de} client={v.client||""} piecesInit={piecesCommande} onSave={setPiecesCommande} typeMateriel={typeMateriel}/>

      <div style={{...S.card,marginTop:8}}>
        <p style={{fontSize:13,fontWeight:700,margin:"0 0 10px"}}>💬 Commentaires divers</p>
        <textarea value={commentaires} onChange={e=>setCommentaires(e.target.value)} placeholder="Observations, remarques générales..." style={{...S.inp,minHeight:70,resize:"vertical",fontFamily:"inherit"}}/>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
          <button onClick={sauvegarderComm} disabled={savingComm||!ficheId} style={{...S.p1,fontSize:12,padding:"6px 14px",opacity:ficheId?1:0.5}}>{savingComm?"…":"💾 Sauvegarder"}</button>
        </div>
      </div>

      <div style={{...S.card,border:"2px solid "+(validees.length===etapesActives.length?"#22863A":"#E2E6EA")}}>
        {validees.length===etapesActives.length&&<div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:32,marginBottom:6}}>🎉</div>
          <p style={{fontSize:16,fontWeight:800,color:"#22863A",margin:0}}>Fiche complète !</p>
        </div>}
        <p style={{fontSize:12,color:"#6B7280",margin:"0 0 10px"}}>📁 {chem.client} / {chem.de} / {chem.mat} · {photos.length} photo{photos.length>1?"s":""}</p>
        <div style={{marginBottom:12}}><SelecteurStatut statutId={statutChantier} onChange={changerStatut}/></div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button style={S.p1} onClick={()=>setApercu(true)}>👁 Aperçu fiche</button>
          <button style={{...S.p1,background:"#22863A"}} onClick={()=>{const nrM={};etapesActives.forEach((nom,i)=>{if(nrMap[i])nrM[String(i+1)]=true;});imprimerFiche(v,photos,statutChantier,commentaires,piecesCommande,nrM);}}>📄 Imprimer / PDF</button>
          <button style={S.p2}>📧 Rapport client (bientôt)</button>
          <button style={S.p2} onClick={onRetour}>← Retour à l'accueil</button>
        </div>
      </div>
    </div>
  </div>);
}

export default function App(){
  const [pinOk,setPinOk]=useState(()=>localStorage.getItem(PIN_KEY)==="1");
  const [page,setPage]=useState("accueil");const [sessionTech,setSessionTech]=useState(null);const [ficheOuverte,setFicheOuverte]=useState(null);const [typeMat,setTypeMat]=useState("Moteur");const [pieces,setPieces]=useState([]);const [demandeIdent,setDemandeIdent]=useState(false);const [pending,setPending]=useState(null);const [techs,setTechs]=useState(TECHNICIENS_FB);const [clients,setClients]=useState([]);const [categories,setCategories]=useState(CATS_FB.map(n=>({nom:n,slug:slugCat(n)})));const [fiches,setFiches]=useState([]);

  useEffect(()=>{
    db.get("techniciens","?actif=eq.true&order=initiales").then(d=>{if(Array.isArray(d)&&d.length>0)setTechs(d.map(t=>t.initiales));}).catch(()=>{});
    db.get("clients","?order=nom").then(d=>{if(Array.isArray(d)&&d.length>0)setClients(d.map(c=>c.nom));}).catch(()=>{});
    db.get("categories_photos","?actif=eq.true&order=ordre").then(d=>{if(Array.isArray(d)&&d.length>0)setCategories(d);
    db.get("suivi_pieces","?order=created_at.desc").then(d=>{if(Array.isArray(d))setPieces(d);});}).catch(()=>{});
  },[]);

  function onAddClient(nom){setClients(prev=>[...prev,nom].sort());}
  function askIdent(fn){setDemandeIdent(true);setPending(()=>fn);}
  function confirmIdent(t){setSessionTech(t);setDemandeIdent(false);if(pending){pending(t);setPending(null);}}
  function onFicheUpdated(id,updates){setFiches(prev=>prev.map(f=>f.id===id?{...f,...updates}:f));if(ficheOuverte?.id===id)setFicheOuverte(prev=>({...prev,...updates}));}
  async function onStatutChange(ficheId,newStatut){await db.patch("fiches","?id=eq."+ficheId,{statut_chantier:newStatut});onFicheUpdated(ficheId,{statut_chantier:newStatut});}

  const devisCount=fiches.filter(f=>(f.statut_chantier||"A_demonter")==="Devis").length;

  const width=useWidth();
  const isMobile=width<900;
  const [menuOuvert,setMenuOuvert]=useState(false);
  if(!pinOk)return <ModalPin onSuccess={()=>setPinOk(true)}/>;

  const navItems=[
    {id:"accueil",label:"📁 Fiches"},
    {id:"planning",label:"📋 Planning"},
    {id:"suivi",label:"🔧 Matériel"},
    {id:"stats",label:"📊 Stats"},
  ];

  return(<div style={S.app}>
    {/* ── HEADER ── */}
    <div style={{...S.hdr,flexWrap:"nowrap",position:"sticky",top:0,zIndex:100}}>
      {/* Logo */}
      <img src={LOGO_B64} alt="PMV" style={{height:isMobile?30:40,objectFit:"contain",borderRadius:4,cursor:"pointer",flexShrink:0}} onClick={()=>{setPage("accueil");setMenuOuvert(false);}}/>

      {/* Onglets — masqués sur mobile */}
      {!isMobile&&<div style={{display:"flex",alignItems:"center",gap:4,flex:1,justifyContent:"center"}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?"rgba(255,255,255,0.25)":"transparent",color:"#fff",border:"none",padding:"6px 14px",borderRadius:6,fontSize:13,cursor:"pointer",fontWeight:page===n.id?700:400,position:"relative",whiteSpace:"nowrap"}}>
            {n.label}
            {n.id==="planning"&&devisCount>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#E8720C",color:"#fff",borderRadius:10,padding:"1px 5px",fontSize:9,fontWeight:700}}>{devisCount}</span>}
          </button>
        ))}
      </div>}

      {/* Droite */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto",flexShrink:0}}>
        <BadgeStockage onClick={()=>setPage("stockage")}/>
        {!isMobile&&sessionTech&&<>
          <span style={{background:"rgba(255,255,255,0.2)",padding:"3px 10px",borderRadius:5,fontSize:12,fontWeight:700,color:"#fff"}}>{sessionTech}</span>
          <button style={{background:"transparent",border:"1px solid rgba(255,255,255,0.4)",color:"#fff",padding:"3px 8px",borderRadius:5,fontSize:11,cursor:"pointer"}} onClick={()=>setSessionTech(null)}>↩</button>
        </>}
        {/* Hamburger mobile */}
        {isMobile&&<button onClick={()=>setMenuOuvert(o=>!o)} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:36,height:36,borderRadius:8,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
          {menuOuvert?"✕":"☰"}
        </button>}
      </div>
    </div>

    {/* ── MENU SANDWICH MOBILE ── */}
    {isMobile&&menuOuvert&&<div style={{position:"sticky",top:52,zIndex:99,background:"#1B4F8A",boxShadow:"0 4px 12px rgba(0,0,0,0.3)"}}>
      {navItems.map(n=>(
        <button key={n.id} onClick={()=>{setPage(n.id);setMenuOuvert(false);}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:page===n.id?"rgba(255,255,255,0.15)":"transparent",color:"#fff",border:"none",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"14px 20px",fontSize:15,fontWeight:page===n.id?700:400,cursor:"pointer",textAlign:"left"}}>
          <span>{n.label}</span>
          {n.id==="planning"&&devisCount>0&&<span style={{background:"#E8720C",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{devisCount}</span>}
        </button>
      ))}
      {sessionTech&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderTop:"1px solid rgba(255,255,255,0.2)"}}>
        <span style={{color:"#fff",fontSize:13}}>👤 {sessionTech}</span>
        <button onClick={()=>{setSessionTech(null);setMenuOuvert(false);}} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",padding:"5px 12px",borderRadius:6,fontSize:12,cursor:"pointer"}}>↩ Changer</button>
      </div>}
    </div>}

    {demandeIdent&&<ModalIdent techs={techs} onConfirm={confirmIdent}/>}
    {page==="accueil"&&<PageAccueil fiches={fiches} setFiches={setFiches} categories={categories} onNew={()=>askIdent(t=>{setSessionTech(t);setPage("choix");})} onOpen={f=>{setFicheOuverte(f);setPage("fiche");}} onStatutChange={onStatutChange}/>}
    {page==="choix"&&<PageChoix onChoisir={m=>{if(m!=="Moteur"&&m!=="Pompe"){alert("Bientôt disponible.");return;}setFicheOuverte(null);setTypeMat(m);setPage("fiche");}} onRetour={()=>setPage("accueil")}/>}
    {page==="fiche"&&<PageFiche ficheInit={ficheOuverte} typeMateriel={ficheOuverte?.type_materiel||typeMat} sessionTech={sessionTech||"—"} techs={techs} clients={clients} onAddClient={onAddClient} categories={categories} onRetour={()=>{setPage("accueil");setFicheOuverte(null);}} onFicheUpdated={onFicheUpdated}/>}
    {page==="planning"&&<PagePlanning fiches={fiches} onOuvrirFiche={f=>askIdent(t=>{setSessionTech(t);setFicheOuverte(f);setPage("fiche");})} onStatutChange={onStatutChange}/>}
    {page==="suivi"&&<PageSuivi/>}
    {page==="stockage"&&<PageStockage fiches={fiches} onRetour={()=>setPage("accueil")}/>}
    {page==="stats"&&<PageStats fiches={fiches} pieces={pieces}/>}
  </div>);
}
