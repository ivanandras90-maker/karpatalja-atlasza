
/* ==========================================================
 V16 — REAL LAYER NAMES / NO ATLASZ GROUP
========================================================== */
(function(){
"use strict";
function getMap(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function collect(){
 const out=[];
 try{
   if(typeof baseMaps!=="undefined")
     Object.entries(baseMaps).forEach(([name,layer])=>out.push({name,layer,type:"Alaptérkép"}));
 }catch(e){}
 /* Do not create an "Atlasz réteg" category. Keep real overlay names. */
 try{
   if(typeof overlays!=="undefined")
     Object.entries(overlays).forEach(([name,layer])=>out.push({name,layer,type:"Réteg"}));
 }catch(e){}
 try{
   if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry))
     importedVectorRegistry.forEach(x=>{
       const display=(x.fileName||x.originalFileName||x.sourceName||x.name||"Saját GeoJSON")
         .replace(/\.geojson$/i,"").replace(/\.json$/i,"");
       out.push({name:display,layer:x.group,type:"Saját GeoJSON",registry:x});
     });
 }catch(e){}
 return out;
}
function on(layer){try{return !!getMap()?.hasLayer(layer)}catch(e){return false}}
function count(layer){try{return layer?Object.keys(layer._layers||{}).length:"—"}catch(e){return"—"}}
function zoom(layer){try{const b=layer.getBounds();if(b&&b.isValid())getMap().fitBounds(b,{padding:[45,45],maxZoom:14})}catch(e){}}
function setOpacity(layer,v){
 const o=Math.max(0,Math.min(1,v));
 try{if(layer.setOpacity)layer.setOpacity(o)}catch(e){}
 try{if(layer.setStyle)layer.setStyle({opacity:o,fillOpacity:o*.35})}catch(e){}
 try{layer.eachLayer?.(l=>{if(l!==layer)setOpacity(l,o)})}catch(e){}
}
function build(){
 if(document.getElementById("atlasLayerDrawer"))return;
 const drawer=document.createElement("aside");
 drawer.id="atlasLayerDrawer";
 drawer.innerHTML=`<div class="ald-head">
   <div class="ald-title"><b>🗂 RÉTEGEK</b><button id="aldClose" type="button">×</button></div>
   <div class="ald-sub">Alaptérképek · betöltött adatok · saját GeoJSON</div>
 </div>
 <div class="ald-search"><input id="aldFilter" placeholder="Réteg keresése…"></div>
 <div class="ald-body" id="aldBody"></div>`;
 document.body.appendChild(drawer);
 drawer.querySelector("#aldClose").onclick=close;
 drawer.querySelector("#aldFilter").oninput=e=>render(e.target.value);
}
function open(){build();document.getElementById("atlasLayerDrawer").classList.add("open");document.getElementById("atlasLayerTool")?.classList.add("active");render()}
function close(){document.getElementById("atlasLayerDrawer")?.classList.remove("open");document.getElementById("atlasLayerTool")?.classList.remove("active")}
function render(filter=""){
 build();
 const body=document.getElementById("aldBody"), f=String(filter).trim().toLowerCase(), all=collect();
 const groups={"Alaptérkép":[],"Réteg":[],"Saját GeoJSON":[]};
 all.forEach(x=>{if(!f||x.name.toLowerCase().includes(f))groups[x.type]?.push(x)});
 body.innerHTML=Object.entries(groups).map(([type,arr])=>{
   if(!arr.length)return "";
   return `<section><div class="ald-group-title">${esc(type)}</div>${arr.map((x,i)=>{
     const opacity=Number(x.layer?.options?.opacity??1);
     return `<div class="ald-row" data-key="${esc(type)}|${i}">
       <input type="checkbox" ${on(x.layer)?"checked":""} title="Megjelenítés">
       <div><div class="ald-name">${esc(x.name)}</div><div class="ald-meta">${count(x.layer)} elem</div></div>
       <div class="ald-right">
         ${type!=="Alaptérkép"?`<input class="ald-opacity" type="range" min="0" max="1" step=".05" value="${opacity}" title="Átlátszóság"><span class="ald-opacity-value">${Math.round(opacity*100)}%</span>`:""}
         ${type!=="Alaptérkép"?`<button class="ald-zoom" type="button">Nézet</button>`:""}
       </div>
     </div>`;
   }).join("")}</section>`;
 }).join("") || '<div class="ald-empty">Nincs betöltött réteg.</div>';
 body.querySelectorAll(".ald-row").forEach(row=>{
   const [type,i]=row.dataset.key.split("|"),x=groups[type][+i],m=getMap();
   row.querySelector('input[type="checkbox"]').onchange=e=>{
     if(e.target.checked)x.layer?.addTo(m);else m?.removeLayer(x.layer);
     window.AtlasLegend?.refresh?.();render(document.getElementById("aldFilter")?.value||"");
   };
   row.querySelector(".ald-zoom")?.addEventListener("click",()=>zoom(x.layer));
   const op=row.querySelector(".ald-opacity");
   if(op)op.oninput=()=>{
     setOpacity(x.layer,+op.value);
     row.querySelector(".ald-opacity-value").textContent=Math.round(+op.value*100)+"%";
     window.AtlasLegend?.refresh?.();
   };
 });
}
function install(){
 build();
 const layerBtn=document.getElementById("atlasLayerTool");
 const searchBtn=document.getElementById("atlasSearchTool");
 if(layerBtn)layerBtn.onclick=()=>document.getElementById("atlasLayerDrawer").classList.contains("open")?close():open();
 if(searchBtn)searchBtn.onclick=()=>document.getElementById("atlasMapSearch")?.classList.toggle("open");
 render();
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(install,500));
window.AtlasLayerIcon={open,close,refresh:render};
})();
