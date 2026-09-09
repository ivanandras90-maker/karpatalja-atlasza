
/* ==========================================================
 V15 — MAP UX CONTROLS
========================================================== */
(function(){
"use strict";
const SVG={
layers:`<svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>`,
search:`<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/></svg>`,
home:`<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>`,
loc:`<svg viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.2"/></svg>`
};
function getMap(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function collect(){
 const a=[];
 try{if(typeof baseMaps!=="undefined")Object.entries(baseMaps).forEach(([name,layer])=>a.push({name,layer,type:"Alaptérkép"}))}catch(e){}
 try{if(typeof overlays!=="undefined")Object.entries(overlays).forEach(([name,layer])=>a.push({name,layer,type:"Atlasz réteg"}))}catch(e){}
 try{if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry))importedVectorRegistry.forEach(x=>a.push({name:x.name||"Saját GeoJSON",layer:x.group,type:"Saját réteg",registry:x}))}catch(e){}
 return a;
}
function on(layer){try{return getMap()?.hasLayer(layer)}catch(e){return false}}
function featureCount(layer){try{return layer?Object.keys(layer._layers||{}).length:"—"}catch(e){return"—"}}
function bounds(layer){try{return layer.getBounds()}catch(e){return null}}
function openLayers(){document.getElementById("atlasLayerDrawer")?.classList.add("open");document.getElementById("atlasLayerTool")?.classList.add("active");renderLayers()}
function closeLayers(){document.getElementById("atlasLayerDrawer")?.classList.remove("open");document.getElementById("atlasLayerTool")?.classList.remove("active")}
function toggleSearch(){document.getElementById("atlasMapSearch")?.classList.toggle("open")}
function build(){
 if(document.getElementById("atlasMapRail"))return;
 const rail=document.createElement("div");rail.id="atlasMapRail";rail.className="atlas-map-rail";
 rail.innerHTML=`
  <button id="atlasLayerTool" class="atlas-map-tool" title="Rétegek" aria-label="Rétegek">${SVG.layers}</button>
  <button id="atlasSearchTool" class="atlas-map-tool" title="Keresés" aria-label="Keresés">${SVG.search}</button>
  <button id="atlasHomeTool" class="atlas-map-tool" title="Kárpátalja nézete" aria-label="Kárpátalja nézete">${SVG.home}</button>
  <button id="atlasLocateTool" class="atlas-map-tool" title="Saját helyzet" aria-label="Saját helyzet">${SVG.loc}</button>`;
 document.body.appendChild(rail);
 const drawer=document.createElement("aside");drawer.id="atlasLayerDrawer";
 drawer.innerHTML=`<div class="ald-head"><div class="ald-title"><b>🗂 RÉTEGEK</b><button id="aldClose">×</button></div><div class="ald-sub">Alaptérképek · tematikus rétegek · saját adatok</div></div>
 <div class="ald-search"><input id="aldFilter" placeholder="Réteg keresése…"></div><div class="ald-body" id="aldBody"></div>`;
 document.body.appendChild(drawer);
 const search=document.createElement("div");search.id="atlasMapSearch";search.className="atlas-map-search";
 search.innerHTML=`<form id="atlasSearchForm"><input id="atlasSearchInput" autocomplete="off" placeholder="Település, objektum, ID…"><button>⌕</button></form><div id="atlasSearchResults" class="atlas-search-results"></div>`;
 document.body.appendChild(search);
 const help=document.createElement("div");help.className="atlas-map-help";help.innerHTML="<b>Gyors használat</b><br>🗂 rétegek · ⌕ keresés · ⌂ Kárpátalja · ◉ helyzet";
 document.body.appendChild(help);
 rail.querySelector("#atlasLayerTool").onclick=()=>document.getElementById("atlasLayerDrawer").classList.contains("open")?closeLayers():openLayers();
 rail.querySelector("#atlasSearchTool").onclick=toggleSearch;
 rail.querySelector("#atlasHomeTool").onclick=()=>{const m=getMap();m?.setView([48.45,23.55],9,{animate:true})};
 rail.querySelector("#atlasLocateTool").onclick=()=>{const m=getMap();if(!navigator.geolocation)return alert("A böngésző nem támogatja a helymeghatározást.");navigator.geolocation.getCurrentPosition(pos=>m?.setView([pos.coords.latitude,pos.coords.longitude],13,{animate:true}),()=>alert("A helyzeted nem volt elérhető."))};
 drawer.querySelector("#aldClose").onclick=closeLayers;
 drawer.querySelector("#aldFilter").oninput=e=>renderLayers(e.target.value);
 search.querySelector("#atlasSearchForm").onsubmit=e=>{e.preventDefault();searchFeatures(search.querySelector("#atlasSearchInput").value)};
}
function renderLayers(filter=""){
 const body=document.getElementById("aldBody");if(!body)return;
 const all=collect(), f=filter.trim().toLowerCase();
 const groups={"Alaptérkép":[],"Atlasz réteg":[],"Saját réteg":[]};
 all.forEach(x=>{if(!f||x.name.toLowerCase().includes(f))groups[x.type].push(x)});
 body.innerHTML=Object.entries(groups).map(([type,arr])=>{
  if(!arr.length)return "";
  return `<section><div class="ald-group-title">${type}</div>${arr.map((x,i)=>{
   const opacity=Number(x.layer?.options?.opacity??1);
   return `<div class="ald-row" data-key="${esc(type)}|${i}">
    <input type="checkbox" ${on(x.layer)?"checked":""} title="Megjelenítés">
    <div><div class="ald-name">${esc(x.name)}</div><div class="ald-meta">${featureCount(x.layer)} elem</div></div>
    <div class="ald-right">${type!=="Alaptérkép"?`<input class="ald-opacity" type="range" min="0" max="1" step=".05" value="${opacity}" title="Átlátszóság"><span class="ald-opacity-value">${Math.round(opacity*100)}%</span>`:""}${type!=="Alaptérkép"?`<button class="ald-zoom" type="button">Nézet</button>`:""}</div>
   </div>`;
  }).join("")}</section>`;
 }).join("")||'<div class="ald-empty">Nincs ilyen réteg.</div>';

 const groupsNow=groups;
 body.querySelectorAll(".ald-row").forEach(row=>{
  const [type,i]=row.dataset.key.split("|"),x=groupsNow[type][+i],m=getMap(),check=row.querySelector('input[type="checkbox"]');
  check.onchange=()=>{if(check.checked)x.layer?.addTo(m);else m?.removeLayer(x.layer);window.AtlasLegend?.refresh?.();renderLayers(document.getElementById("aldFilter")?.value||"")};
  row.querySelector(".ald-zoom")?.addEventListener("click",()=>{const b=bounds(x.layer);if(b)m.fitBounds(b,{padding:[45,45],maxZoom:14})});
  const op=row.querySelector(".ald-opacity");if(op)op.oninput=()=>{setOpacity(x.layer,+op.value);row.querySelector(".ald-opacity-value").textContent=Math.round(+op.value*100)+"%";window.AtlasLegend?.refresh?.()};
 });
}
function setOpacity(layer,v){
 const o=Math.max(0,Math.min(1,v));
 try{if(layer.setOpacity)layer.setOpacity(o)}catch(e){}
 try{if(layer.setStyle)layer.setStyle({opacity:o,fillOpacity:o*.35})}catch(e){}
 try{layer.eachLayer?.(l=>{if(l!==layer)setOpacity(l,o)})}catch(e){}
}
function searchFeatures(q){
 q=(q||"").trim().toLowerCase();const out=document.getElementById("atlasSearchResults");if(!out)return;
 if(q.length<2){out.innerHTML='<div class="atlas-search-result">Írj legalább 2 karaktert.</div>';return}
 const hits=[];
 function inspect(group,name){
  group?.eachLayer?.(l=>{
   const p=l.feature?.properties||l.options?.properties||{};
   const text=Object.entries(p).map(([k,v])=>`${k} ${v}`).join(" ").toLowerCase();
   if(text.includes(q)&&hits.length<25)hits.push({layer:l,name,props:p});
   if(l._layers)inspect(l,name);
  });
 }
 try{if(typeof overlays!=="undefined")Object.entries(overlays).forEach(([n,g])=>inspect(g,n))}catch(e){}
 try{if(typeof importedVectorRegistry!=="undefined")importedVectorRegistry.forEach(x=>inspect(x.group,x.name||"Saját réteg"))}catch(e){}
 out.innerHTML=hits.length?hits.map((h,i)=>`<div class="atlas-search-result" data-hit="${i}"><b>${esc(h.props.name||h.props.NAME||h.props.NEV||h.name||"Objektum")}</b><small>${esc(h.name)} · ${esc(h.props.ID||h.props.id||"")}</small></div>`).join(""):'<div class="atlas-search-result">Nincs találat.</div>';
 out.querySelectorAll("[data-hit]").forEach((el,i)=>el.onclick=()=>{const h=hits[i],m=getMap();try{if(h.layer.getBounds)m.fitBounds(h.layer.getBounds(),{padding:[50,50],maxZoom:15});else if(h.layer.getLatLng)m.setView(h.layer.getLatLng(),15,{animate:true});h.layer.openPopup?.()}catch(e){}}); 
}
function invalidate(){
 const m=getMap();if(!m)return;
 [0,100,350,800,1500].forEach(t=>setTimeout(()=>m.invalidateSize({pan:false,animate:false}),t));
}
document.addEventListener("DOMContentLoaded",()=>{setTimeout(()=>{build();invalidate()},450);setTimeout(renderLayers,900)});
window.AtlasMapUX={openLayers,closeLayers,refresh:renderLayers,invalidate};
})();
