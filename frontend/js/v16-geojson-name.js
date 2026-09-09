
/* V16 — preserve uploaded GeoJSON filename as the visible layer name */
(function(){
"use strict";
function rememberFile(input){
 const f=input?.files?.[0]; if(!f)return;
 window.__atlasLastGeoJSONFileName=f.name;
}
function install(){
 document.querySelectorAll('input[type="file"]').forEach(i=>{
   if(i.dataset.v16NameHook)return;
   i.dataset.v16NameHook="1";
   i.addEventListener("change",()=>rememberFile(i));
 });
 if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry)){
   importedVectorRegistry.forEach(x=>{
     if(x&&x.group&&!x.fileName){
       const nm=x.originalFileName||x.sourceName||x.name||window.__atlasLastGeoJSONFileName;
       if(nm)x.fileName=nm;
     }
   });
 }
}
document.addEventListener("DOMContentLoaded",()=>{install();setInterval(install,1000)});
})();
