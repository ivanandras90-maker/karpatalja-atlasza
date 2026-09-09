
/* ==========================================================
 V17 — UNIFIED MAP CONTROL RAIL
 Fixes the V14/V15 duplicate-control conflict.
========================================================== */
(function(){
"use strict";
const ICONS={
 layers:'<svg viewBox="0 0 24 24"><path d="m12 3-9 5 9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>',
 search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>'
};
function getMap(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function collect(){
 const a=[];
 try{if(typeof baseMaps!=="undefined")Object.entries(baseMaps).forEach(([name,layer])=>a.push({name,layer,type:"Alaptérkép"}))}catch(e){}
 try{if(typeof overlays!=="undefined")Object.entries(overlays).forEach(([name,layer])=>a.push({name,layer,type:"Réteg"}))}catch(e){}
 try{if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry))
   importedVectorRegistry.forEach(x=>a.push({name:(x.fileName||x.originalFileName||x.sourceName||x.name||"Saját GeoJSON").replace(/\.geojson$/i,"").replace(/\.json$/i,""),layer:x.group,type:"Saját GeoJSON",registry:x}))}catch(e){}
 return a;
}
function visible(l){try{return !!getMap()?.hasLayer(l)}catch(e){return false}}
function count(l){try{return l?Object.keys(l._layers||{}).length:"—"}catch(e){return"—"}}
function opacity(l){try{return Number(l?.options?.opacity??1)}catch(e){return 1}}
function setOpacity(l,v){
 v=Math.max(0,Math.min(1,v));
 try{l.setOpacity?.(v)}catch(e){}
 try{l.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
 try{l.eachLayer?.(x=>{if(x!==l)setOpacity(x,v)})}catch(e){}
}
function ensureRail(){
 let rail=document.getElementById("atlasMapRail");
 if(!rail){
   rail=document.createElement("div");rail.id="atlasMapRail";rail.className="atlas-map-rail";
   rail.innerHTML=`<button id="atlasLayerTool" class="atlas-map-tool" title="Rétegek" aria-label="Rétegek">${ICONS.layers}</button>
   <button id="atlasSearchTool" class="atlas-map-tool" title="Keresés" aria-label="Keresés">${ICONS.search}</button>`;
   document.body.appendChild(rail);
 }
 // V14 may have left a legacy rail. Remove only the duplicate legacy button,
 // not the functional drawer.
 document.getElementById("atlasLayerToggle")?.remove();
 document.getElementById("atlasLayerFlyout")?.remove();
 let drawer=document.getElementById("atlasLayerDrawer");
 if(!drawer){
   drawer=document.createElement("aside");drawer.id="atlasLayerDrawer";
   drawer.innerHTML=`<div class="ald-head"><div class="ald-title"><b>🗂 RÉTEGEK</b><button id="aldClose" type="button">×</button></div>
   <div class="ald-sub">Alaptérképek · betöltött adatok · saját GeoJSON</div></div>
   <div class="ald-search"><input id="aldFilter" placeholder="Réteg keresése…"></div><div class="ald-body" id="aldBody"></div>`;
   document.body.appendChild(drawer);
 }
 if(!document.getElementById("atlasMapSearch")){
   const search=document.createElement("div");search.id="atlasMapSearch";search.className="atlas-map-search";
   search.innerHTML=`<form id="atlasSearchForm"><input id="atlasSearchInput" autocomplete="off" placeholder="Település, objektum, ID…"><button>⌕</button></form>
   <div id="atlasSearchResults" class="atlas-search-results"></div>`;
   document.body.appendChild(search);
 }
 const layerBtn=document.getElementById("atlasLayerTool"),searchBtn=document.getElementById("atlasSearchTool");
 layerBtn.onclick=()=>{const d=document.getElementById("atlasLayerDrawer");d.classList.toggle("open");layerBtn.classList.toggle("active",d.classList.contains("open"));if(d.classList.contains("open"))renderLayers()};
 searchBtn.onclick=()=>document.getElementById("atlasMapSearch").classList.toggle("open");
 document.getElementById("aldClose").onclick=()=>{document.getElementById("atlasLayerDrawer").classList.remove("open");layerBtn.classList.remove("active")};
 document.getElementById("aldFilter").oninput=e=>renderLayers(e.target.value);
 document.getElementById("atlasSearchForm").onsubmit=e=>{e.preventDefault();searchFeatures(document.getElementById("atlasSearchInput").value)};
}
function renderLayers(filter=""){
 const body=document.getElementById("aldBody");if(!body)return;
 const f=filter.trim().toLowerCase(),all=collect(),groups={"Alaptérkép":[],"Réteg":[],"Saját GeoJSON":[]};
 all.forEach(x=>{if(!f||x.name.toLowerCase().includes(f))groups[x.type]?.push(x)});
 body.innerHTML=Object.entries(groups).map(([type,arr])=>!arr.length?"":`<section><div class="ald-group-title">${type}</div>${
 arr.map((x,i)=>`<div class="ald-row" data-k="${esc(type)}|${i}">
 <input type="checkbox" ${visible(x.layer)?"checked":""} title="Megjelenítés">
 <div><div class="ald-name">${esc(x.name)}</div><div class="ald-meta">${count(x.layer)} elem</div></div>
 <div class="ald-right">${type!=="Alaptérkép"?`<input class="ald-opacity" type="range" min="0" max="1" step=".05" value="${opacity(x.layer)}" title="Átlátszóság"><span class="ald-opacity-value">${Math.round(opacity(x.layer)*100)}%</span><button class="ald-zoom" type="button">Nézet</button>`:""}</div>
 </div>`).join("")}</section>`).join("")||'<div class="ald-empty">Nincs betöltött réteg.</div>';
 body.querySelectorAll(".ald-row").forEach(row=>{
  const [type,i]=row.dataset.k.split("|"),x=groups[type][+i],m=getMap();
  row.querySelector('input[type="checkbox"]').onchange=e=>{if(e.target.checked)x.layer?.addTo(m);else m?.removeLayer(x.layer);window.AtlasLegend?.refresh?.();renderLayers(filter)};
  row.querySelector(".ald-zoom")?.addEventListener("click",()=>{try{const b=x.layer.getBounds();if(b.isValid())m.fitBounds(b,{padding:[45,45],maxZoom:14})}catch(e){}});
  const op=row.querySelector(".ald-opacity");if(op)op.oninput=()=>{setOpacity(x.layer,+op.value);row.querySelector(".ald-opacity-value").textContent=Math.round(+op.value*100)+"%";window.AtlasLegend?.refresh?.()};
 });
}
function searchFeatures(q){
 q=(q||"").trim().toLowerCase();const out=document.getElementById("atlasSearchResults");if(!out)return;
 if(q.length<2){out.innerHTML='<div class="atlas-search-result">Írj legalább 2 karaktert.</div>';return}
 const hits=[];
 const inspect=(group,name)=>{
   group?.eachLayer?.(l=>{
     const p=l.feature?.properties||l.options?.properties||{};
     const text=Object.entries(p).map(([k,v])=>`${k} ${v}`).join(" ").toLowerCase();
     if(text.includes(q)&&hits.length<25)hits.push({layer:l,name,props:p});
     if(l._layers)inspect(l,name);
   });
 };
 try{if(typeof overlays!=="undefined")Object.entries(overlays).forEach(([n,g])=>inspect(g,n))}catch(e){}
 try{if(typeof importedVectorRegistry!=="undefined")importedVectorRegistry.forEach(x=>inspect(x.group,x.name||"Saját GeoJSON"))}catch(e){}
 out.innerHTML=hits.length?hits.map((h,i)=>`<div class="atlas-search-result" data-hit="${i}"><b>${esc(h.props.name||h.props.NAME||h.props.NEV||h.name||"Objektum")}</b><small>${esc(h.name)} · ${esc(h.props.ID||h.props.id||"")}</small></div>`).join(""):'<div class="atlas-search-result">Nincs találat.</div>';
 out.querySelectorAll("[data-hit]").forEach((el,i)=>el.onclick=()=>{const h=hits[i],m=getMap();try{if(h.layer.getBounds)m.fitBounds(h.layer.getBounds(),{padding:[50,50],maxZoom:15});else if(h.layer.getLatLng)m.setView(h.layer.getLatLng(),15,{animate:true});h.layer.openPopup?.()}catch(e){}});
}
function refresh(){renderLayers(document.getElementById("aldFilter")?.value||"")}
document.addEventListener("DOMContentLoaded",()=>setTimeout(ensureRail,350));
window.AtlasLayerIcon={open:()=>{ensureRail();document.getElementById("atlasLayerDrawer").classList.add("open");renderLayers()},close:()=>document.getElementById("atlasLayerDrawer")?.classList.remove("open"),refresh:refresh};
})();
