
/* ==========================================================
   KÁRPÁTALJA ATLAS — V13 LIVE LEGEND
   Uses the actual global map binding (not window.map), and
   refreshes whenever Leaflet layer state changes.
========================================================== */
(function(){
"use strict";

function getMap(){
  try { return (typeof map !== "undefined") ? map : null; } catch(e){ return null; }
}
function getLayers(){
  const out=[];
  try{
    if(typeof overlays!=="undefined"){
      Object.entries(overlays).forEach(([name,layer])=>{
        if(layer) out.push({name,layer,kind:"overlay"});
      });
    }
  }catch(e){}
  try{
    if(typeof importedVectorRegistry!=="undefined" && Array.isArray(importedVectorRegistry)){
      importedVectorRegistry.forEach(x=>{
        if(x && x.group) out.push({name:x.name||"Saját GeoJSON",layer:x.group,kind:"geojson",style:x.style||{}});
      });
    }
  }catch(e){}
  return out;
}
function visible(layer){
  const m=getMap();
  try{return !!(m&&layer&&m.hasLayer(layer));}catch(e){return false}
}
function color(layer,style){
  if(style?.color)return style.color;
  try{
    if(layer?.options?.color)return layer.options.color;
    let found=null;
    layer?.eachLayer?.(x=>{if(!found&&x.options?.color)found=x.options.color});
    if(found)return found;
  }catch(e){}
  return "#c8a45e";
}
function geometryType(layer){
  try{
    let t="";
    layer?.eachLayer?.(x=>{
      if(!t && x.feature?.geometry?.type)t=x.feature.geometry.type;
    });
    return t;
  }catch(e){return ""}
}
function render(){
  let el=document.getElementById("atlasLiveLegend");
  if(!el){
    el=document.createElement("aside");
    el.id="atlasLiveLegend";
    el.className="atlas-live-legend";
    document.body.appendChild(el);
  }
  const m=getMap(), active=getLayers().filter(x=>visible(x.layer));
  let base="Alaptérkép";
  try{
    if(typeof baseMaps!=="undefined"){
      const b=Object.entries(baseMaps).find(([,l])=>m&&m.hasLayer(l));
      if(b) base=b[0];
    }
  }catch(e){}

  el.innerHTML=`
    <div class="atlas-live-legend-head">
      <span class="atlas-live-legend-title">JELMAGYARÁZAT</span>
      <button class="atlas-live-legend-toggle" type="button" title="Jelmagyarázat összecsukása">−</button>
    </div>
    <div class="atlas-live-legend-body">
      <div class="atlas-live-legend-row atlas-base-row">
        <i class="atlas-live-swatch" style="background:#b9c9bc"></i>
        <span>${escapeHtml(base.replace(/^.*? /,""))}</span>
      </div>
      ${active.length
        ? active.map(x=>`
          <div class="atlas-live-legend-row">
            <i class="atlas-live-swatch" style="background:${escapeAttr(color(x.layer,x.style))}"></i>
            <span>${escapeHtml(x.name)}${geometryType(x.layer)?` <small>· ${escapeHtml(geometryType(x.layer))}</small>`:""}</span>
          </div>`).join("")
        : `<div class="atlas-live-legend-empty">Nincs aktív tematikus réteg.</div>`}
    </div>`;
  el.querySelector(".atlas-live-legend-toggle").onclick=()=>{
    el.classList.toggle("collapsed");
    const b=el.querySelector(".atlas-live-legend-body");
    b.style.display=el.classList.contains("collapsed")?"none":"block";
  };
}
function escapeHtml(v){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,"")}
function bind(){
  const m=getMap();
  if(!m){setTimeout(bind,500);return}
  render();
  m.on("overlayadd overlayremove layeradd layerremove",()=>setTimeout(render,0));
  // Static atlas layers may be populated asynchronously.
  [500,1200,2500,5000].forEach(t=>setTimeout(render,t));
  // If the app replaces the legend after a later module loads, restore it.
  setInterval(render,4000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,250));
else setTimeout(bind,250);
window.AtlasLegend={refresh:render};
})();
