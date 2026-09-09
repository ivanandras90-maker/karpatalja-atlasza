
/* V21 FINAL — independent geographic-map legend.
   Does not depend on the old legend modules. */
(function(){
"use strict";

function getMap(){
  try{return typeof map!=="undefined"?map:null}catch(e){return null}
}
function esc(v){
  return String(v??"").replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function visible(layer){
  try{return !!getMap()?.hasLayer(layer)}catch(e){return false}
}
function displayName(x){
  var n=x?.fileName||x?.originalFileName||x?.sourceFileName||
        x?.sourceName||x?.file?.name||x?.source?.name||x?.name||"GeoJSON";
  return String(n).replace(/\.(geojson|json)$/i,"");
}
function color(layer){
  try{
    if(layer?.options?.color)return layer.options.color;
    var c=null;
    layer?.eachLayer?.(function(l){
      if(!c && l?.options?.color)c=l.options.color;
    });
    return c||"#9d2525";
  }catch(e){return "#9d2525"}
}
function ensure(){
  var el=document.getElementById("atlasV21FinalLegend");
  if(!el){
    el=document.createElement("aside");
    el.id="atlasV21FinalLegend";
    el.innerHTML=
      '<div class="v21-legend-head">'+
        '<span class="v21-legend-title">JELMAGYARÁZAT</span>'+
        '<button class="v21-legend-close" type="button" aria-label="Jelmagyarázat összecsukása">−</button>'+
      '</div>'+
      '<div class="v21-legend-body" id="atlasV21FinalLegendBody"></div>';
    document.body.appendChild(el);
    el.querySelector(".v21-legend-close").onclick=function(){
      el.classList.toggle("v21-collapsed");
      this.textContent=el.classList.contains("v21-collapsed")?"+":"−";
    };
  }
  return el;
}
function render(){
  var el=ensure(), body=document.getElementById("atlasV21FinalLegendBody");
  if(!body)return;
  var rows=[];

  try{
    if(typeof baseMaps!=="undefined"){
      var base=Object.entries(baseMaps).find(function(pair){return visible(pair[1])});
      if(base){
        rows.push(
          '<div class="v21-legend-row">'+
          '<i class="v21-swatch" style="background:#b9c9bc"></i>'+
          '<span>'+esc(base[0])+'</span></div>'
        );
      }
    }
  }catch(e){}

  try{
    if(typeof importedVectorRegistry!=="undefined" && Array.isArray(importedVectorRegistry)){
      importedVectorRegistry.forEach(function(x){
        if(x?.group && visible(x.group)){
          rows.push(
            '<div class="v21-legend-row">'+
            '<i class="v21-swatch" style="background:'+esc(color(x.group))+'"></i>'+
            '<span>'+esc(displayName(x))+'</span></div>'
          );
        }
      });
    }
  }catch(e){}

  body.innerHTML=rows.length?rows.join(""):'<div class="v21-empty">Nincs aktív réteg.</div>';
}

function bind(){
  var m=getMap();
  if(!m){setTimeout(bind,500);return}
  render();
  try{
    m.on("layeradd layerremove overlayadd overlayremove",function(){setTimeout(render,0)});
  }catch(e){}
  [500,1200,2500,5000].forEach(function(t){setTimeout(render,t)});
}
document.addEventListener("DOMContentLoaded",function(){setTimeout(bind,250)});
window.AtlasV21FinalLegend={refresh:render,open:function(){ensure().classList.remove("v21-collapsed")}};
})();
