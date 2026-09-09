
/* ==========================================================
 V20 — CLEAN LAYER WORKSPACE
 Removes predefined thematic catalogue from the user-facing
 layer list. Uploaded GeoJSON remains fully dynamic.
========================================================== */
(function(){
"use strict";

const HIDDEN_NAMES = new Set([
 "domborzat","hegységek","folyók","tavak","városok","falvak","utak",
 "közigazgatási határok","földtan","éghajlat","talaj","növényzet",
 "tájak","természetvédelem","természeti erőforrások",
 "természeti veszélyek","galéria"
]);

function norm(v){return String(v??"").trim().toLowerCase()}
function getMap(){try{return typeof map!=="undefined"?map:null}catch(e){return null}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function originalName(x){
    const n=x?.fileName||x?.originalFileName||x?.sourceFileName||
            x?.sourceName||x?.file?.name||x?.source?.name||x?.name||"GeoJSON";
    return String(n);
}
function displayName(x){
    return originalName(x).replace(/\.(geojson|json)$/i,"");
}
function isHiddenName(n){
    const s=norm(n).replace(/\.(geojson|json)$/,"");
    return HIDDEN_NAMES.has(s);
}
function visible(l){try{return !!getMap()?.hasLayer(l)}catch(e){return false}}
function count(l){
    try{let n=0;l?.eachLayer?.(()=>n++);return n||Object.keys(l?._layers||{}).length||0}catch(e){return 0}
}
function getOpacity(l){try{return Number(l?.options?.opacity??1)}catch(e){return 1}}
function setOpacity(l,v){
    v=Math.max(0,Math.min(1,v));
    try{l.setOpacity?.(v)}catch(e){}
    try{l.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
    try{l.eachLayer?.(x=>{
        try{x.setOpacity?.(v)}catch(e){}
        try{x.setStyle?.({opacity:v,fillOpacity:v*.35})}catch(e){}
    })}catch(e){}
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
            importedVectorRegistry.forEach(x=>{
                if(!x?.group)return;
                const original=originalName(x);
                if(isHiddenName(original))return;
                /* Preserve the exact uploaded filename internally. */
                x.fileName=original;
                out.push({name:displayName(x),original,layer:x.group,type:"GeoJSON",registry:x});
            });
        }
    }catch(e){}
    return out;
}

function ensure(){
    let d=document.getElementById("atlasLayerDrawer");
    if(!d){
        d=document.createElement("aside");
        d.id="atlasLayerDrawer";
        d.innerHTML=`
        <div class="ald-head">
          <div class="ald-title"><b>🗂 RÉTEGEK</b><button id="aldClose" type="button">×</button></div>
          <div class="ald-sub">Alaptérképek és betöltött adatok</div>
        </div>
        <div class="ald-search"><input id="aldFilter" placeholder="Réteg keresése…"></div>
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
    const d=ensure(),body=d.querySelector("#aldBody");
    const f=norm(filter);
    const all=collect();
    const bases=all.filter(x=>x.type==="Alaptérkép");
    const files=all.filter(x=>x.type==="GeoJSON" && (!f||norm(x.name).includes(f)));

    let html="";
    if(bases.length){
        html+=`<section><div class="ald-group-title">ALAPTÉRKÉP</div>`;
        html+=bases.map((x,i)=>`
          <div class="ald-row" data-type="base" data-i="${i}">
            <input type="radio" name="atlasBaseMap" ${visible(x.layer)?"checked":""}>
            <div><div class="ald-name">${esc(x.name)}</div><div class="ald-meta">Alaptérkép</div></div>
          </div>`).join("");
        html+="</section>";
    }
    if(files.length){
        html+=`<section><div class="ald-group-title">BETÖLTÖTT GEOJSON</div>`;
        html+=files.map((x,i)=>{
            const op=getOpacity(x.layer);
            return `<div class="ald-row" data-type="geojson" data-i="${i}">
              <input type="checkbox" ${visible(x.layer)?"checked":""} title="Megjelenítés">
              <div>
                <div class="ald-name">🗺️ ${esc(x.name)}</div>
                <div class="ald-meta">${count(x.layer)} objektum · GeoJSON</div>
              </div>
              <div class="ald-right">
                <input class="ald-opacity" type="range" min="0" max="1" step=".05" value="${op}" title="Átlátszóság">
                <span class="ald-opacity-value">${Math.round(op*100)}%</span>
                <button class="ald-zoom" type="button">Nézet</button>
              </div>
            </div>`;
        }).join("");
        html+="</section>";
    }
    if(!html)html='<div class="ald-empty">'+(f?"Nincs találat.":"Még nincs betöltött GeoJSON réteg.")+"</div>";
    body.innerHTML=html;

    body.querySelectorAll('[data-type="base"]').forEach(row=>{
        const x=bases[+row.dataset.i],m=getMap();
        row.querySelector("input").onchange=()=>{
            bases.forEach(b=>{try{m.removeLayer(b.layer)}catch(e){}});
            try{x.layer.addTo(m)}catch(e){}
        };
    });
    body.querySelectorAll('[data-type="geojson"]').forEach(row=>{
        const x=files[+row.dataset.i],m=getMap();
        row.querySelector('input[type="checkbox"]').onchange=e=>{
            if(e.target.checked)x.layer?.addTo(m);else m?.removeLayer(x.layer);
            window.AtlasLegend?.refresh?.();
        };
        row.querySelector(".ald-zoom").onclick=()=>{
            try{const b=x.layer.getBounds();if(b.isValid())m.fitBounds(b,{padding:[45,45],maxZoom:14})}catch(e){}
        };
        row.querySelector(".ald-opacity").oninput=e=>{
            setOpacity(x.layer,+e.target.value);
            row.querySelector(".ald-opacity-value").textContent=Math.round(+e.target.value*100)+"%";
            window.AtlasLegend?.refresh?.();
        };
    });
}

function open(){
    ensure();
    document.getElementById("atlasLayerDrawer").classList.add("open");
    document.getElementById("atlasLayerTool")?.classList.add("active");
    render();
}
function close(){
    document.getElementById("atlasLayerDrawer")?.classList.remove("open");
    document.getElementById("atlasLayerTool")?.classList.remove("active");
}

document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{
    ensure();
    render();
},450));

window.AtlasLayerIcon={open,close,refresh:render};
window.AtlasLayerWorkspace={setOpacity,render,collect};
})();
