
(function(){
"use strict";
function refresh(){
 let el=document.getElementById("atlasLiveLegend");
 if(!el){el=document.createElement("div");el.id="atlasLiveLegend";el.className="atlas-live-legend";document.body.appendChild(el)}
 let names=[];
 try{
  if(typeof overlays!=="undefined") Object.entries(overlays).forEach(([name,layer])=>{
   if(window.map?.hasLayer(layer)) names.push({name,color:"#c8a45e"});
  });
  if(typeof importedVectorRegistry!=="undefined") importedVectorRegistry.forEach(x=>{
   if(x.group&&window.map?.hasLayer(x.group)) names.push({name:x.name,color:x.style?.color||"#17374d"});
  });
 }catch(e){}
 el.innerHTML=`<div class="atlas-live-legend-head"><span class="atlas-live-legend-title">JELMAGYARÁZAT</span><button class="atlas-live-legend-toggle" title="Elrejtés">×</button></div><div class="atlas-live-legend-body">${names.length?names.map(x=>`<div class="atlas-live-legend-row"><i class="atlas-live-swatch" style="background:${x.color}"></i><span>${x.name}</span></div>`).join(""):`<div style="color:#718087;padding:4px 0">Nincs aktív tematikus réteg.</div>`}</div>`;
 el.querySelector("button").onclick=()=>{el.style.display="none";setTimeout(()=>{el.style.display="block";refresh()},3000)};
}
window.AtlasLegend={refresh};
document.addEventListener("DOMContentLoaded",()=>setTimeout(refresh,700));
})();
