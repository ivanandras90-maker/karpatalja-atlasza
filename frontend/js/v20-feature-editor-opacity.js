
/* ==========================================================
 V20 — FEATURE EDITOR LAYER OPACITY
 Adds a layer-level opacity slider without replacing the
 existing Feature Editor functionality.
========================================================== */
(function(){
"use strict";

function currentLayer(){
 const candidates=["selectedLayer","activeLayer","currentLayer","featureLayer","editingLayer"];
 for(const n of candidates){
   try{
     if(window[n] && (window[n].setOpacity || window[n].setStyle || window[n].eachLayer)) return window[n];
   }catch(e){}
 }
 try{
   if(typeof importedVectorRegistry!=="undefined" && Array.isArray(importedVectorRegistry)){
     const active=importedVectorRegistry.find(x=>x?.group && (map?.hasLayer?.(x.group)));
     if(active)return active.group;
   }
 }catch(e){}
 return null;
}
function setOpacity(layer,v){
 v=Math.max(0,Math.min(1,Number(v)||0));
 try{layer.setOpacity?.(v)}catch(e){}
 try{layer.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
 try{layer.eachLayer?.(l=>{
   try{l.setOpacity?.(v)}catch(e){}
   try{l.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
 })}catch(e){}
}
function findPanel(){
 return document.querySelector(
   "#featureEditorPanel,.feature-editor-panel,.feature-editor,.layer-feature-editor,"+
   "[data-feature-editor],.editor-sidebar,.feature-editor-sidebar"
 );
}
function install(){
 const panel=findPanel();
 if(!panel)return;
 if(panel.querySelector("[data-v20-opacity]"))return;

 const box=document.createElement("div");
 box.className="feature-editor-opacity";
 box.setAttribute("data-v20-opacity","1");
 box.innerHTML=`
   <label style="display:block;width:100%">
     <span style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
       <b>Réteg átlátszósága</b>
       <span class="opacity-value">100%</span>
     </span>
     <input type="range" min="0" max="1" step=".05" value="1" aria-label="Réteg átlátszósága">
   </label>`;
 const anchor=panel.querySelector(".editor-actions,.feature-actions,.panel-actions,.actions");
 if(anchor)anchor.parentNode.insertBefore(box,anchor);
 else panel.appendChild(box);

 const range=box.querySelector("input"),value=box.querySelector(".opacity-value");
 const sync=()=>{
   const l=currentLayer();
   if(!l)return;
   let v=1;try{v=Number(l.options?.opacity??1)}catch(e){}
   range.value=v;value.textContent=Math.round(v*100)+"%";
 };
 range.addEventListener("input",()=>{
   const l=currentLayer();
   if(!l)return;
   setOpacity(l,range.value);
   value.textContent=Math.round(Number(range.value)*100)+"%";
   window.AtlasLegend?.refresh?.();
 });
 sync();
}
document.addEventListener("DOMContentLoaded",()=>setInterval(install,800));
window.AtlasFeatureEditorOpacity={install};
})();
