
(function(){
"use strict";
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function getEntries(){
 const arr=[];
 if(typeof importedVectorRegistry!=="undefined" && Array.isArray(importedVectorRegistry)){
   importedVectorRegistry.forEach(x=>{
     if(!x?.group)return;
     const raw=String(x.fileName||x.originalFileName||x.sourceFileName||x.sourceName||x.file?.name||x.name||"GeoJSON");
     const name=raw.replace(/\.(geojson|json)$/i,"");
     arr.push({key:x.key,name,layer:x.group,kind:"geojson"});
   });
 }
 return arr;
}
function close(){document.getElementById("atlasWorkspace")?.remove()}
function open(){
 close();
 const box=document.createElement("div");box.id="atlasWorkspace";box.className="atlas-workspace";
 box.innerHTML=`<div class="atlas-workspace-window">
  <header class="aw-head"><div><strong>🧭 RÉTEG MUNKATÉR</strong><small>Rétegek · adatok · stílus · elemzés · export</small></div>
  <button id="awClose" title="Bezárás">×</button></header>
  <main class="aw-body">
   <div class="aw-summary" id="awSummary"></div>
   <div class="aw-actions">
    <button id="awOpen">＋ ÚJ ADAT / RÉTEG</button>
    <button id="awEditor">⚙ RÉTEG FEATURE EDITOR</button>
    <button id="awDraw">✏ DRAW OBJEKTUMOK</button>
    <button id="awPrezi">🎬 PREZI MÓD</button>
   </div>
   <div class="aw-layer-table">
    <div class="aw-layer-row header"><span></span><span>RÉTEG</span><span>TÍPUS</span><span>ÁLLAPOT</span><span>MŰVELETEK</span></div>
    <div id="awRows"></div>
   </div>
  </main>
 </div>`;
 document.body.appendChild(box);
 box.querySelector("#awClose").onclick=close;
 box.querySelector("#awOpen").onclick=()=>typeof openDataFile==="function"?openDataFile():alert("Adatbetöltő nem érhető el.");
 box.querySelector("#awEditor").onclick=()=>typeof lfeOpenEditor==="function"?lfeOpenEditor():alert("Layer Feature Editor nem érhető el.");
 box.querySelector("#awDraw").onclick=()=>{close();const p=document.getElementById("featureEditorPanel");if(p){p.hidden=false;p.style.display="block";p.removeAttribute("hidden");window.renderDrawFeatureEditor?.()}};
 box.querySelector("#awPrezi").onclick=()=>window.openPreziEditor?.();
 render();
}
function render(){
 const rows=document.getElementById("awRows"),sum=document.getElementById("awSummary");if(!rows||!sum)return;
 const entries=getEntries();
 const geo=entries.filter(x=>x.kind==="geojson").length;
 const active=entries.filter(x=>{try{return x.layer&&map.hasLayer(x.layer)}catch(e){return false}}).length;
 sum.innerHTML=`<div class="aw-stat"><b>ÖSSZES BETÖLTÖTT</b><span>${entries.length}</span></div><div class="aw-stat"><b>GEOJSON</b><span>${geo}</span></div><div class="aw-stat"><b>AKTÍV</b><span>${active}</span></div>`;
 rows.innerHTML=entries.map((e,i)=>{
   let on=false;try{on=map.hasLayer(e.layer)}catch(x){}
   const count=e.layer?((e.layer._layers&&Object.keys(e.layer._layers).length)||"—"):"—";
   return `<div class="aw-layer-row" data-kind="${e.kind}">
    <span>${e.kind==="geojson"?"🧩":e.kind==="raster"?"🛰️":"◈"}</span>
    <span class="aw-layer-name">${esc(e.name)}</span>
    <span class="aw-meta">${esc(e.kind)} · ${count}</span>
    <span class="aw-meta">${on?"● látható":"○ rejtett"}</span>
    <span class="optional">
      <button data-act="toggle" data-i="${i}">${on?"Elrejt":"Mutat"}</button>
      <button data-act="zoom" data-i="${i}">Nézet</button>
      ${e.kind==="geojson"?`<button data-act="edit" data-i="${i}">Szerkeszt</button>`:""}
    </span>
   </div>`;
 }).join("");
 rows.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
   const e=entries[+b.dataset.i],a=b.dataset.act;
   if(a==="toggle"){if(map.hasLayer(e.layer))map.removeLayer(e.layer);else e.layer.addTo(map);render();window.AtlasLegend?.refresh?.()}
   if(a==="zoom"){try{map.fitBounds(e.layer.getBounds(),{padding:[50,50],maxZoom:14})}catch(x){}}
   if(a==="edit"&&typeof lfeOpenEditor==="function")lfeOpenEditor();
 });
}
window.AtlasLayerWorkspace={open,close,refresh:render};
})();
