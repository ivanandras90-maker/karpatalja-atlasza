
/* V18 — preserve exact uploaded GeoJSON filename */
(function(){
"use strict";
let lastGeoJSONFileName="";
function watchInputs(){
 document.querySelectorAll('input[type="file"]').forEach(input=>{
   if(input.dataset.v18FileName)return;
   input.dataset.v18FileName="1";
   input.addEventListener("change",()=>{
     const file=input.files?.[0];
     if(file && /\.(geojson|json)$/i.test(file.name)) lastGeoJSONFileName=file.name;
   });
 });
}
function syncRegistry(){
 try{
  if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry)){
   importedVectorRegistry.forEach(x=>{
    if(!x||!x.group)return;
    if(!x.fileName && !x.originalFileName && !x.sourceFileName && lastGeoJSONFileName){
      x.fileName=lastGeoJSONFileName;
    }
   });
  }
 }catch(e){}
}
document.addEventListener("DOMContentLoaded",()=>{watchInputs();setInterval(()=>{watchInputs();syncRegistry()},350)});
window.AtlasUploadedFileName={get:()=>lastGeoJSONFileName};
})();
