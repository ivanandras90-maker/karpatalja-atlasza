
/* V23 — reliable layer-level opacity for Layer Feature Editor */
(function(){
"use strict";

function entry(){
  try{return typeof lfeGetEntry==="function"?lfeGetEntry():null}catch(e){return null}
}
function group(){
  const e=entry();
  return e?.group||null;
}
function applyLayerOpacity(g,v){
  v=Math.max(0,Math.min(1,Number(v)));
  if(!g)return;
  g._atlasOpacity=v;
  try{
    const layers=Array.isArray(g._lfeRegistry)?g._lfeRegistry:[];
    layers.forEach((layer,i)=>{
      try{
        const m=typeof lfeMeta==="function"?lfeMeta(layer,i):null;
        const base=m?Number(m.opacity??1):Number(layer.options?.opacity??1);
        const fill=m?Number(m.fillOpacity??layer.options?.fillOpacity??.25):Number(layer.options?.fillOpacity??.25);
        if(typeof lfeApplyStyle==="function") lfeApplyStyle(layer);
        else layer.setStyle?.({opacity:base*v,fillOpacity:fill*v});
      }catch(e){}
    });
  }catch(e){}
}
function syncBox(box){
  const g=group(); if(!g)return;
  const v=Number(g._atlasOpacity??1);
  const input=box.querySelector("[data-v23-layer-opacity]");
  const out=box.querySelector("[data-v23-opacity-value]");
  if(input)input.value=v;
  if(out)out.textContent=Math.round(v*100)+"%";
}
function install(){
  const modal=document.getElementById("layerFeatureEditorModal");
  if(!modal || modal.style.display==="none")return;
  let box=modal.querySelector("[data-v23-opacity-box]");
  if(!box){
    const toolbar=modal.querySelector(".lfe-toolbar");
    if(!toolbar)return;
    box=document.createElement("div");
    box.setAttribute("data-v23-opacity-box","1");
    box.className="v23-lfe-opacity";
    box.innerHTML=`<div class="v23-lfe-opacity-title"><span>Réteg átlátszósága</span><strong data-v23-opacity-value>100%</strong></div>
      <input data-v23-layer-opacity type="range" min="0" max="1" step=".01" value="1" aria-label="Réteg átlátszósága">`;
    toolbar.appendChild(box);
    box.querySelector("[data-v23-layer-opacity]").addEventListener("input",e=>{
      applyLayerOpacity(group(),e.target.value);
      const out=box.querySelector("[data-v23-opacity-value]");
      if(out)out.textContent=Math.round(Number(e.target.value)*100)+"%";
      window.AtlasLegend?.refresh?.();
    });
  }
  syncBox(box);
}
document.addEventListener("DOMContentLoaded",()=>setInterval(install,400));
window.AtlasLFEOpacity={install,apply:applyLayerOpacity};
})();
