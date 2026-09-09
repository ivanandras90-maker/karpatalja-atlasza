
/* ==========================================================
 V20 — LEGEND
 Uses the original uploaded file name as the source identity,
 but hides the .geojson/.json extension in the visible label.
========================================================== */
(function(){
"use strict";
function getMap(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function nameOf(x){
 const n=x?.fileName||x?.originalFileName||x?.sourceFileName||x?.sourceName||
         x?.file?.name||x?.source?.name||x?.name||"GeoJSON";
 return String(n).replace(/\.(geojson|json)$/i,"");
}
function visible(l){try{return !!getMap()?.hasLayer(l)}catch(e){return false}}
function color(l){
 try{
   if(l?.options?.color)return l.options.color;
   let c=null;l?.eachLayer?.(x=>{if(!c&&x.options?.color)c=x.options.color});
   return c||"#a33";
 }catch(e){return"#a33"}
}
function render(){
 let el=document.getElementById("atlasLiveLegend");
 if(!el){
   el=document.createElement("aside");
   el.id="atlasLiveLegend";
   el.className="atlas-live-legend";
   document.body.appendChild(el);
 }
 let rows=[];
 try{
   if(typeof baseMaps!=="undefined"){
     const b=Object.entries(baseMaps).find(([,l])=>visible(l));
     if(b)rows.push(`<div class="atlas-live-legend-row"><i class="atlas-live-swatch" style="background:#b9c9bc"></i><span>${esc(b[0])}</span></div>`);
   }
 }catch(e){}
 try{
   if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry)){
     importedVectorRegistry.forEach(x=>{
       if(x?.group&&visible(x.group)){
         rows.push(`<div class="atlas-live-legend-row"><i class="atlas-live-swatch" style="background:${color(x.group)}"></i><span>${esc(nameOf(x))}</span></div>`);
       }
     });
   }
 }catch(e){}
 el.innerHTML=`<div class="atlas-live-legend-head"><span class="atlas-live-legend-title">JELMAGYARÁZAT</span><button class="atlas-live-legend-toggle" type="button">−</button></div>
   <div class="atlas-live-legend-body">${rows.join("")||'<div class="atlas-live-legend-empty">Nincs aktív réteg.</div>'}</div>`;
 el.querySelector(".atlas-live-legend-toggle").onclick=()=>{
   el.classList.toggle("collapsed");
   el.querySelector(".atlas-live-legend-body").style.display=el.classList.contains("collapsed")?"none":"block";
 };
}
function bind(){
 const m=getMap();
 if(!m){setTimeout(bind,400);return}
 render();
 m.on("layeradd layerremove overlayadd overlayremove",()=>setTimeout(render,0));
 [500,1200,2500].forEach(t=>setTimeout(render,t));
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,300));
window.AtlasLegend={refresh:render};
})();
