
(function(){
"use strict";
function getMap(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function displayName(x){
 const n=x?.fileName||x?.originalFileName||x?.sourceFileName||x?.sourceName||x?.file?.name||x?.source?.name||x?.name||"GeoJSON";
 return window.AtlasDisplayName?window.AtlasDisplayName(n):String(n).replace(/\.(geojson|json)$/i,"");
}
function collect(){
 const out=[];
 try{if(typeof baseMaps!=="undefined")Object.entries(baseMaps).forEach(([name,layer])=>out.push({name,layer,type:"Alaptérkép"}))}catch(e){}
 try{if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry))importedVectorRegistry.forEach(x=>{
   if(x?.group)out.push({name:displayName(x),layer:x.group,type:"GeoJSON",registry:x});
 })}catch(e){}
 return out;
}
function visible(l){try{return !!getMap()?.hasLayer(l)}catch(e){return false}}
function count(l){try{let n=0;l?.eachLayer?.(()=>n++);return n||Object.keys(l?._layers||{}).length||0}catch(e){return 0}}
function opacity(l){try{return Number(l?.options?.opacity??1)}catch(e){return 1}}
function setOpacity(l,v){
 v=Math.max(0,Math.min(1,v));
 try{l.setOpacity?.(v)}catch(e){} try{l.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
 try{l.eachLayer?.(x=>{try{x.setOpacity?.(v)}catch(e){} try{x.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}})}catch(e){}
}
function ensure(){
 let d=document.getElementById("atlasLayerDrawer");
 if(!d){d=document.createElement("aside");d.id="atlasLayerDrawer";d.innerHTML=`<div class="ald-head"><div class="ald-title"><b>🗂 RÉTEGEK</b><button id="aldClose">×</button></div><div class="ald-sub">Alaptérképek és betöltött GeoJSON adatok</div></div><div class="ald-search"><input id="aldFilter" placeholder="Réteg keresése…"></div><div class="ald-body" id="aldBody"></div>`;document.body.appendChild(d)}
 d.querySelector("#aldClose").onclick=()=>{d.classList.remove("open");document.getElementById("atlasLayerTool")?.classList.remove("active")}
 d.querySelector("#aldFilter").oninput=e=>render(e.target.value);
 return d;
}
function render(filter=""){
 const d=ensure(),body=d.querySelector("#aldBody"),f=String(filter).trim().toLowerCase(),all=collect();
 const bases=all.filter(x=>x.type==="Alaptérkép"),files=all.filter(x=>x.type==="GeoJSON"&&(!f||x.name.toLowerCase().includes(f)));
 let html="";
 if(bases.length)html+=`<section><div class="ald-group-title">ALAPTÉRKÉP</div>`+bases.map((x,i)=>`<div class="ald-row" data-type="base" data-i="${i}"><input type="radio" name="atlasBaseMap" ${visible(x.layer)?"checked":""}><div><div class="ald-name">${esc(x.name)}</div><div class="ald-meta">Alaptérkép</div></div></div>`).join("")+"</section>";
 if(files.length)html+=`<section><div class="ald-group-title">BETÖLTÖTT GEOJSON</div>`+files.map((x,i)=>`<div class="ald-row" data-type="geojson" data-i="${i}"><input type="checkbox" ${visible(x.layer)?"checked":""}><div><div class="ald-name">🗺️ ${esc(x.name)}</div><div class="ald-meta">${count(x.layer)} objektum · GeoJSON</div></div><div class="ald-right"><input class="ald-opacity" type="range" min="0" max="1" step=".05" value="${opacity(x.layer)}"><span class="ald-opacity-value">${Math.round(opacity(x.layer)*100)}%</span><button class="ald-zoom" type="button">Nézet</button></div></div>`).join("")+"</section>";
 if(!html)html='<div class="ald-empty">'+(f?"Nincs találat.":"Még nincs betöltött GeoJSON réteg.")+"</div>";
 body.innerHTML=html;
 body.querySelectorAll('[data-type="base"]').forEach(r=>r.querySelector("input").onchange=()=>{const x=bases[+r.dataset.i],m=getMap();bases.forEach(b=>{try{m.removeLayer(b.layer)}catch(e){}});x.layer?.addTo(m)});
 body.querySelectorAll('[data-type="geojson"]').forEach(r=>{
   const x=files[+r.dataset.i],m=getMap();
   r.querySelector('input[type="checkbox"]').onchange=e=>{if(e.target.checked)x.layer?.addTo(m);else m?.removeLayer(x.layer);window.AtlasLegend?.refresh?.()};
   r.querySelector(".ald-zoom").onclick=()=>{try{const b=x.layer.getBounds();if(b.isValid())m.fitBounds(b,{padding:[45,45],maxZoom:14})}catch(e){}};
   r.querySelector(".ald-opacity").oninput=e=>{setOpacity(x.layer,+e.target.value);r.querySelector(".ald-opacity-value").textContent=Math.round(+e.target.value*100)+"%";window.AtlasLegend?.refresh?.()};
 });
}
function open(){ensure();document.getElementById("atlasLayerDrawer").classList.add("open");document.getElementById("atlasLayerTool")?.classList.add("active");render()}
function close(){document.getElementById("atlasLayerDrawer")?.classList.remove("open");document.getElementById("atlasLayerTool")?.classList.remove("active")}
document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{ensure();render()},450));
window.AtlasLayerIcon={open,close,refresh:render};
})();
