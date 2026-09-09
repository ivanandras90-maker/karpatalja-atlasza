
/* V14 — shared opacity control for drawn features and layer features */
(function(){
"use strict";
function addControl(panel,mode){
 if(!panel||panel.querySelector(".atlas-opacity-control"))return;
 const box=document.createElement("div");box.className="atlas-opacity-control";
 box.innerHTML='<label>ÁTLÁTSZÓSÁG <output>100%</output></label><input type="range" min="0" max="1" step=".01" value="1">';
 const input=box.querySelector("input"),out=box.querySelector("output");
 input.oninput=()=>{
   out.textContent=Math.round(Number(input.value)*100)+"%";
   if(mode==="draw"){
     let layers=[];
     try{if(typeof drawnItems!=="undefined")drawnItems.eachLayer(l=>layers.push(l))}catch(e){}
     layers.forEach(l=>{l.setStyle?.({opacity:Number(input.value),fillOpacity:Number(input.value)*.35})});
   }else{
     try{
       if(typeof importedVectorRegistry!=="undefined")importedVectorRegistry.forEach(x=>x.group?.eachLayer?.(l=>l.setStyle?.({opacity:Number(input.value),fillOpacity:Number(input.value)*.35})));
     }catch(e){}
   }
 };
 const target=panel.querySelector(".feature-editor-settings")||panel.querySelector(".feature-editor-titlebar");
 target?.appendChild(box);
}
function scan(){
 const draw=document.getElementById("featureEditorPanel");
 if(draw)addControl(draw,"draw");
 document.querySelectorAll(".layer-feature-editor,.layer-feature-editor-panel,#layerFeatureEditor").forEach(p=>addControl(p,"layer"));
}
document.addEventListener("DOMContentLoaded",()=>{setTimeout(scan,800);setTimeout(scan,1800);});
window.AtlasOpacity={scan};
})();
