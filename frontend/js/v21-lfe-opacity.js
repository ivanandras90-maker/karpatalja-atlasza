
/* V21 — Layer Feature Editor opacity, wired to the actual editor state. */
(function(){
"use strict";
function getLayer(){
 try{
  if(typeof lfeGetEntry==="function"){
   const e=lfeGetEntry();
   if(e?.group)return e.group;
  }
 }catch(e){}
 try{
  if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry)){
   const e=importedVectorRegistry.find(x=>x?.group && map?.hasLayer?.(x.group));
   if(e)return e.group;
  }
 }catch(e){}
 return null;
}
function setOpacity(g,v){
 v=Math.max(0,Math.min(1,+v));
 try{g.setOpacity?.(v)}catch(e){}
 try{g.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
 try{g.eachLayer?.(l=>{try{l.setOpacity?.(v)}catch(e){}try{l.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}})}catch(e){}
}
function install(){
 const modal=document.getElementById("layerFeatureEditorModal");
 if(!modal || modal.style.display==="none")return;
 let box=modal.querySelector("[data-v21-lfe-opacity]");
 if(!box){
  const toolbar=modal.querySelector(".lfe-toolbar");
  if(!toolbar)return;
  box=document.createElement("div");
  box.className="lfe-layer-opacity";box.setAttribute("data-v21-lfe-opacity","1");
  box.innerHTML=`<div class="lfe-layer-opacity-title"><span>Réteg átlátszósága</span><span data-v21-opval>100%</span></div><input data-v21-op type="range" min="0" max="1" step=".05" value="1">`;
  toolbar.appendChild(box);
  box.querySelector("[data-v21-op]").oninput=e=>{
   const g=getLayer();if(!g)return;
   setOpacity(g,e.target.value);
   box.querySelector("[data-v21-opval]").textContent=Math.round(+e.target.value*100)+"%";
   window.AtlasLegend?.refresh?.();
  };
 }
 const g=getLayer();if(g){
  let v=1;try{v=Number(g.options?.opacity??1)}catch(e){}
  box.querySelector("[data-v21-op]").value=v;
  box.querySelector("[data-v21-opval]").textContent=Math.round(v*100)+"%";
 }
}
document.addEventListener("DOMContentLoaded",()=>setInterval(install,500));
window.AtlasLFEOpacity={install};
})();
