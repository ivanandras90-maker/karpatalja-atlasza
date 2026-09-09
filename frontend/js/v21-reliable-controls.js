
/* ==========================================================
 V21 — RELIABLE LAYER + SEARCH CONTROLS
 No dependency on old V15–V20 control creators.
 ========================================================== */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function M(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function nameOf(x){
 const n=x?.fileName||x?.originalFileName||x?.sourceFileName||x?.sourceName||x?.file?.name||x?.source?.name||x?.name||"GeoJSON";
 return String(n).replace(/\.(geojson|json)$/i,"");
}
function originalOf(x){
 return String(x?.fileName||x?.originalFileName||x?.sourceFileName||x?.sourceName||x?.file?.name||x?.source?.name||x?.name||"GeoJSON");
}
function children(g){try{let n=0;g?.eachLayer?.(()=>n++);return n||Object.keys(g?._layers||{}).length||0}catch(e){return 0}}
function visible(g){try{return !!M()?.hasLayer(g)}catch(e){return false}}
function op(g){try{return Number(g?.options?.opacity??1)}catch(e){return 1}}
function setOp(g,v){
 v=Math.max(0,Math.min(1,+v));
 try{g.setOpacity?.(v)}catch(e){}
 try{g.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
 try{g.eachLayer?.(l=>{try{l.setOpacity?.(v)}catch(e){}try{l.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}})}catch(e){}
}
function collect(){
 const a=[];
 try{if(typeof baseMaps!=="undefined")Object.entries(baseMaps).forEach(([n,l])=>a.push({name:n,layer:l,kind:"base"}))}catch(e){}
 try{if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry))
   importedVectorRegistry.forEach(x=>{if(x?.group)a.push({name:nameOf(x),original:originalOf(x),layer:x.group,kind:"geojson",x})})}catch(e){}
  /* Historical-map layers use the same V21 layer manager as Geography. */
  try{
    [
      ["📜 Helyszínek", typeof historicalPlacesLayer!=="undefined" ? historicalPlacesLayer : null],
      ["⚔️ Események", typeof historicalEventsLayer!=="undefined" ? historicalEventsLayer : null],
      ["🏛️ Történelmi vármegyék", typeof historicalCountiesLayer!=="undefined" ? historicalCountiesLayer : null],
      ["📷 Galéria", typeof historicalGalleryLayer!=="undefined" ? historicalGalleryLayer : null]
    ].forEach(([name,layer])=>{
      if(layer) a.push({name,original:name,layer,kind:"history"});
    });
  }catch(e){}
 return a;
}
function ensure(){
 let rail=$("atlasV21Rail");
 if(!rail){
  rail=document.createElement("div");rail.id="atlasV21Rail";
  rail.innerHTML=`<button id="atlasV21Layer" class="atlas-v21-btn" title="Rétegek" aria-label="Rétegek">▱</button>
  <button id="atlasV21Search" class="atlas-v21-btn" title="Keresés" aria-label="Keresés">⌕</button>`;
  document.body.appendChild(rail);
 }
 let lp=$("atlasV21LayerPanel");
 if(!lp){
  lp=document.createElement("aside");lp.id="atlasV21LayerPanel";lp.className="atlas-v21-panel";
  lp.innerHTML=`<div class="atlas-v21-head"><div><strong>RÉTEGEK</strong><small>Alaptérkép és betöltött GeoJSON</small></div><button class="atlas-v21-close" id="atlasV21LayerClose">×</button></div>
  <div class="atlas-v21-search"><input id="atlasV21LayerFilter" placeholder="Réteg keresése…"></div><div class="atlas-v21-list" id="atlasV21LayerList"></div>`;
  document.body.appendChild(lp);
 }
 let sp=$("atlasV21SearchPanel");
 if(!sp){
  sp=document.createElement("aside");sp.id="atlasV21SearchPanel";sp.className="atlas-v21-panel";
  sp.innerHTML=`<div class="atlas-v21-head"><div><strong>KERESÉS</strong><small>Objektum · ID · attribútum</small></div><button class="atlas-v21-close" id="atlasV21SearchClose">×</button></div>
  <div class="atlas-v21-search"><input id="atlasV21Query" placeholder="Keresés…"></div><div id="atlasV21Results" class="atlas-v21-search-results"></div>`;
  document.body.appendChild(sp);
 }
 $("atlasV21Layer").onclick=()=>{sp.classList.remove("open");lp.classList.toggle("open");$("atlasV21Layer").classList.toggle("active",lp.classList.contains("open"));$("atlasV21Search").classList.remove("active");renderLayers()};
 $("atlasV21Search").onclick=()=>{lp.classList.remove("open");sp.classList.toggle("open");$("atlasV21Search").classList.toggle("active",sp.classList.contains("open"));$("atlasV21Layer").classList.remove("active")};
 $("atlasV21LayerClose").onclick=()=>{lp.classList.remove("open");$("atlasV21Layer").classList.remove("active")};
 $("atlasV21SearchClose").onclick=()=>{sp.classList.remove("open");$("atlasV21Search").classList.remove("active")};
 $("atlasV21LayerFilter").oninput=e=>renderLayers(e.target.value);
 $("atlasV21Query").oninput=e=>search(e.target.value);
}
function renderLayers(filter=""){
 const list=$("atlasV21LayerList");if(!list)return;
 const f=String(filter).trim().toLowerCase(),all=collect();
 const bases=all.filter(x=>x.kind==="base"),files=all.filter(x=>(x.kind==="geojson"||x.kind==="history")&&(!f||x.name.toLowerCase().includes(f)));
 let h="";
 if(bases.length){h+='<div class="atlas-v21-group">ALAPTÉRKÉP</div>';bases.forEach(x=>{h+=`<div class="atlas-v21-row"><input type="radio" name="atlasV21Base" ${visible(x.layer)?"checked":""}><div><div class="atlas-v21-name">${esc(x.name)}</div><div class="atlas-v21-meta">Alaptérkép</div></div></div>`})}
 if(files.length){
  const geoFiles=files.filter(x=>x.kind==="geojson");
  const historyFiles=files.filter(x=>x.kind==="history");
  if(geoFiles.length){
    h+='<div class="atlas-v21-group">BETÖLTÖTT GEOJSON</div>';
    geoFiles.forEach((x,i)=>{
      const o=op(x.layer);
      h+=`<div class="atlas-v21-row" data-kind="geojson" data-i="${i}">
        <input type="checkbox" ${visible(x.layer)?"checked":""}>
        <div><div class="atlas-v21-name">🗺️ ${esc(x.name)}</div><div class="atlas-v21-meta">${children(x.layer)} objektum</div></div>
        <div class="atlas-v21-right"><input class="atlas-v21-opacity" type="range" min="0" max="1" step=".05" value="${o}"><span class="atlas-v21-opval">${Math.round(o*100)}%</span><button class="atlas-v21-action">Nézet</button></div>
      </div>`;
    });
  }
  if(historyFiles.length){
    h+='<div class="atlas-v21-group">TÖRTÉNETI RÉTEGEK</div>';
    historyFiles.forEach((x,i)=>{
      const o=op(x.layer);
      h+=`<div class="atlas-v21-row" data-kind="history" data-i="${i}">
        <input type="checkbox" ${visible(x.layer)?"checked":""}>
        <div><div class="atlas-v21-name">${esc(x.name)}</div><div class="atlas-v21-meta">${children(x.layer)} objektum</div></div>
        <div class="atlas-v21-right"><input class="atlas-v21-opacity" type="range" min="0" max="1" step=".05" value="${o}"><span class="atlas-v21-opval">${Math.round(o*100)}%</span><button class="atlas-v21-action">Nézet</button></div>
      </div>`;
    });
  }
}
 if(!h)h='<div class="atlas-v21-empty">Még nincs betöltött GeoJSON.</div>';
 list.innerHTML=h;
 list.querySelectorAll('.atlas-v21-row[data-kind]').forEach(row=>{
  const pool=row.dataset.kind==="history" ? files.filter(x=>x.kind==="history") : files.filter(x=>x.kind==="geojson");
  const x=pool[+row.dataset.i],m=M();
  row.querySelector('input[type="checkbox"]').onchange=e=>{if(e.target.checked)x.layer?.addTo(m);else m?.removeLayer(x.layer);window.AtlasLegend?.refresh?.()};
  row.querySelector('.atlas-v21-action').onclick=()=>{try{const b=x.layer.getBounds();if(b.isValid())m.fitBounds(b,{padding:[45,45],maxZoom:14})}catch(e){}};
  row.querySelector('.atlas-v21-opacity').oninput=e=>{setOp(x.layer,e.target.value);row.querySelector('.atlas-v21-opval').textContent=Math.round(+e.target.value*100)+"%";window.AtlasLegend?.refresh?.()};
 });
 list.querySelectorAll('.atlas-v21-row:not([data-i]) input[type="radio"]').forEach((r,i)=>r.onchange=()=>{const b=bases[i],m=M();bases.forEach(x=>{try{m.removeLayer(x.layer)}catch(e){}});b?.layer?.addTo(m)});
}
function search(q){
 const out=$("atlasV21Results");if(!out)return;q=String(q||"").trim().toLowerCase();
 if(q.length<2){out.innerHTML='<div class="atlas-v21-empty">Írj legalább 2 karaktert.</div>';return}
 const hits=[];
 const inspect=(g,n)=>{
  g?.eachLayer?.(l=>{
   const p=l.feature?.properties||l.options?.properties||{};
   const txt=Object.entries(p).map(([k,v])=>`${k} ${v}`).join(" ").toLowerCase();
   if(txt.includes(q)&&hits.length<30)hits.push({l,n,p});
   if(l._layers)inspect(l,n);
  });
 };
 try{
   if(typeof importedVectorRegistry!=="undefined"&&Array.isArray(importedVectorRegistry))
     importedVectorRegistry.forEach(x=>inspect(x.group,nameOf(x)));
   [
     ["📜 Helyszínek", typeof historicalPlacesLayer!=="undefined" ? historicalPlacesLayer : null],
     ["⚔️ Események", typeof historicalEventsLayer!=="undefined" ? historicalEventsLayer : null],
     ["🏛️ Történelmi vármegyék", typeof historicalCountiesLayer!=="undefined" ? historicalCountiesLayer : null],
     ["📷 Galéria", typeof historicalGalleryLayer!=="undefined" ? historicalGalleryLayer : null]
   ].forEach(([n,g])=>{if(g)inspect(g,n)});
 }catch(e){}
 out.innerHTML=hits.length?hits.map((h,i)=>`<div class="atlas-v21-result" data-i="${i}"><b>${esc(h.p.name||h.p.NAME||h.p.NEV||h.n)}</b><small>${esc(h.n)} · ${esc(h.p.ID||h.p.id||"")}</small></div>`).join(""):'<div class="atlas-v21-empty">Nincs találat.</div>';
 out.querySelectorAll('[data-i]').forEach((el,i)=>el.onclick=()=>{const h=hits[i],m=M();try{if(h.l.getBounds)m.fitBounds(h.l.getBounds(),{padding:[50,50],maxZoom:15});else if(h.l.getLatLng)m.setView(h.l.getLatLng(),15,{animate:true});h.l.openPopup?.()}catch(e){}});
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{ensure();renderLayers()},600));
window.AtlasV21={refresh:renderLayers};
})();
