// Accès à la base Supabase (clé publique "anon"), partagé par App.js et les modules séparés (Stock.js…).
export const SUPA_URL = "https://pupbzngvudprcweukuoi.supabase.co";
export const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cGJ6bmd2dWRwcmN3ZXVrdW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODY3NDAsImV4cCI6MjA5Nzc2Mjc0MH0.jn025v42M3qNpAKfvy49cdCySBdTqwRz99b1EfaKYoo";
export const H = {"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY};
export const db = {
  async get(t,p=""){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{headers:{...H,"Prefer":"return=representation"}});return r.json();}catch(e){return[];}},
  async post(t,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t,{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async patch(t,p,b){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)});return r.json();}catch(e){return null;}},
  async del(t,p){try{await fetch(SUPA_URL+"/rest/v1/"+t+p,{method:"DELETE",headers:H});}catch(e){}},
  async uploadPhoto(path,file){const r=await fetch(SUPA_URL+"/storage/v1/object/photos/"+path,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Content-Type":file.type,"x-upsert":"true"},body:file});if(!r.ok){const e=await r.text();throw new Error(e);}return true;},
  photoUrl(path){return SUPA_URL+"/storage/v1/object/public/photos/"+path;},
  async deleteFile(path){try{await fetch(SUPA_URL+"/storage/v1/object/photos/"+path,{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY}});}catch(e){}},
  async upsert(table,body,conflict){
    const r=await fetch(SUPA_URL+"/rest/v1/"+table+"?on_conflict="+conflict,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(body)});
    if(!r.ok){const e=await r.text();throw new Error(e);}
    return null;
  }
};
