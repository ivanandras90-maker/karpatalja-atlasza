
/* ==========================================================
 V18 — CLEAN DATA LAYER MANAGER
 The layer list is data-driven:
   1. Base maps
   2. Uploaded GeoJSON files
 No hard-coded thematic catalogue.
========================================================== */
(function(){
"use strict";

function getMap(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function uploadedName(x){
  const candidates=[
    x?.fileName,x?.originalFileName,x?.sourceFileName,x?.sourceName,
    x?.file?.name,x?.source?.name,x?.name
  ];
  for(const n of candidates){
    if(typeof n==="string" && n.trim()) return n.trim();
  }
  return "GeoJSON";
}

function collect(){
  const out=[];
  try{
    if(typeof baseMaps!=="undefined"){
      Object.entries(baseMaps).forEach(([name,layer])=>{
        out.push({name,layer,type:"Alaptérkép"});
      });
    }
  }catch(e){}

  try{
    if(typeof importedVectorRegistry!=="undefined" && Array.isArray(importedVectorRegistry)){
      importedVectorRegistry.forEach((x,i)=>{
        if(x && x.group){
          const filename=uploadedName(x);
          // Preserve the original upload name on the registry object.
          x.fileName=filename;
          out.push({name:filename,layer:x.group,type:"GeoJSON",registry:x});
        }
      });
    }
  }catch(e){}
  return out;
}

function visible(layer){try{return !!getMap()?.hasLayer(layer)}catch(e){return false}}
function count(layer){
  try{
    let n=0;
    layer?.eachLayer?.(()=>n++);
    return n || Object.keys(layer?._layers||{}).length || 0;
  }catch(e){return 0}
}
function getOpacity(layer){try{return Number(layer?.options?.opacity??1)}catch(e){return 1}}
function setOpacity(layer,v){
  v=Math.max(0,Math.min(1,v));
  try{layer.setOpacity?.(v)}catch(e){}
  try{layer.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
  try{layer.eachLayer?.(l=>{
    try{l.setOpacity?.(v)}catch(e){}
    try{l.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
  })}catch(e){}
}

function ensurePanel(){
  let d=document.getElementById("atlasLayerDrawer");
  if(!d){
    d=document.createElement("aside");
    d.id="atlasLayerDrawer";
    d.innerHTML=`<div class="ald-head">
      <div class="ald-title"><b>🗂 RÉTEGEK</b><button id="aldClose" type="button">×</button></div>
      <div class="ald-sub">Alaptérképek és betöltött GeoJSON adatok</div>
    </div>
    <div class="ald-search"><input id="aldFilter" placeholder="Betöltött réteg keresése…"></div>
    <div class="ald-body" id="aldBody"></div>`;
    document.body.appendChild(d);
  }
  d.querySelector("#aldClose").onclick=()=>{
    d.classList.remove("open");
    document.getElementById("atlasLayerTool")?.classList.remove("active");
  };
  d.querySelector("#aldFilter").oninput=e=>render(e.target.value);
  return d;
}

function render(filter=""){
  const d=ensurePanel(), body=d.querySelector("#aldBody");
  const f=String(filter).trim().toLowerCase();
  const all=collect();
  const bases=all.filter(x=>x.type==="Alaptérkép");
  const files=all.filter(x=>x.type==="GeoJSON" && (!f || x.name.toLowerCase().includes(f)));

  let html="";
  if(bases.length){
    html+=`<section><div class="ald-group-title">ALAPTÉRKÉP</div>`;
    html+=bases.map((x,i)=>`<div class="ald-row" data-type="base" data-i="${i}">
      <input type="radio" name="atlasBaseMap" ${visible(x.layer)?"checked":""} title="Alaptérkép">
      <div><div class="ald-name">${esc(x.name)}</div><div class="ald-meta">Alaptérkép</div></div>
      <div class="ald-right"></div>
    </div>`).join("");
    html+="</section>";
  }
  if(files.length){
    html+=`<section><div class="ald-group-title">BETÖLTÖTT GEOJSON</div>`;
    html+=files.map((x,i)=>`
      <div class="ald-row" data-type="geojson" data-i="${i}">
        <input type="checkbox" ${visible(x.layer)?"checked":""} title="Réteg megjelenítése">
        <div>
          <div class="ald-name"><span class="ald-file-icon">🗺️</span> ${esc(x.name)}</div>
          <div class="ald-meta">${count(x.layer)} objektum · GeoJSON</div>
        </div>
        <div class="ald-right">
          <input class="ald-opacity" type="range" min="0" max="1" step=".05" value="${getOpacity(x.layer)}" title="Átlátszóság">
          <span class="ald-opacity-value">${Math.round(getOpacity(x.layer)*100)}%</span>
          <button class="ald-zoom" type="button">Nézet</button>
        </div>
      </div>`).join("");
    html+="</section>";
  }
  if(!bases.length && !files.length) html='<div class="ald-empty">Még nincs betöltött GeoJSON réteg.</div>';
  else if(!files.length && f) html='<div class="ald-empty">Nincs találat a betöltött GeoJSON fájlok között.</div>';
  body.innerHTML=html;

  body.querySelectorAll('[data-type="base"]').forEach(row=>{
    const x=bases[+row.dataset.i],m=getMap();
    row.querySelector('input').onchange=()=>{
      bases.forEach(b=>{try{m.removeLayer(b.layer)}catch(e){}});
      try{x.layer.addTo(m)}catch(e){}
    };
  });
  body.querySelectorAll('[data-type="geojson"]').forEach(row=>{
    const x=files[+row.dataset.i],m=getMap();
    row.querySelector('input[type="checkbox"]').onchange=e=>{
      if(e.target.checked)x.layer?.addTo(m); else m?.removeLayer(x.layer);
      window.AtlasLegend?.refresh?.();
    };
    row.querySelector(".ald-zoom")?.addEventListener("click",()=>{
      try{const b=x.layer.getBounds();if(b.isValid())m.fitBounds(b,{padding:[45,45],maxZoom:14})}catch(e){}
    });
    const op=row.querySelector(".ald-opacity");
    if(op)op.oninput=()=>{
      setOpacity(x.layer,+op.value);
      row.querySelector(".ald-opacity-value").textContent=Math.round(+op.value*100)+"%";
      window.AtlasLegend?.refresh?.();
    };
  });
}

function open(){ensurePanel().classList.add("open");document.getElementById("atlasLayerTool")?.classList.add("active");render()}
function close(){document.getElementById("atlasLayerDrawer")?.classList.remove("open");document.getElementById("atlasLayerTool")?.classList.remove("active")}

function install(){
  ensurePanel();
  const btn=document.getElementById("atlasLayerTool");
  if(btn)btn.onclick=()=>document.getElementById("atlasLayerDrawer").classList.contains("open")?close():open();
  render();
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(install,400));
window.AtlasLayerIcon={open,close,refresh:render};
})();
