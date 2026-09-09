
(function(){
"use strict";
const state={endpoint:window.ATLAS_AI_ENDPOINT||"/api/ai",open:false};
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function open(){
 let p=document.getElementById("atlasAIPanel");
 if(!p){p=document.createElement("aside");p.id="atlasAIPanel";p.innerHTML=`
 <header><div><b>🤖 ATLAS AI</b><small>GIS Copilot · adatelemzés</small></div><button id="aiClose">×</button></header>
 <div id="aiContext">Betöltött térképi és táblázatos adatok elemzése.</div>
 <section id="aiGeorefDiagnostics" class="ai-georef-diagnostics" hidden></section>
 <div id="aiMessages"><div class="ai-msg bot">Írj például: „Színezd 5 kategóriába a népességet”, „Készíts diagramot”, vagy „Készíts 5 km-es rácshálót”.</div></div>
 <div class="ai-quick"><button>Adatok elemzése</button><button>Tematikus réteg</button><button>Diagram</button><button>5 km Grid</button></div>
 <form id="aiForm"><input id="aiInput" placeholder="Írj GIS parancsot…"><button>➤</button></form>`;
 document.body.appendChild(p);
 p.querySelector("#aiClose").onclick=()=>p.classList.remove("open");
 p.querySelector("#aiForm").onsubmit=e=>{e.preventDefault();send(p.querySelector("#aiInput").value)}
 const prompts=["Elemezd a betöltött adatokat és adj javaslatot.","Készíts tematikus réteget a legjobb numerikus mezőből.","Készíts diagramot a kiválasztott adatokból.","Készíts 5 km-es gridet."];
 p.querySelectorAll(".ai-quick button").forEach((b,i)=>b.onclick=()=>send(prompts[i]));
 }
 p.classList.add("open");refreshContext();
}
function context(){
 let ls=[];
 try{if(window.AtlasLayerWorkspace){} if(typeof overlays!=="undefined")ls=Object.keys(overlays).map(x=>({name:x,active:map.hasLayer(overlays[x])}));if(typeof importedVectorRegistry!=="undefined")ls=ls.concat(importedVectorRegistry.map(x=>({name:x.name,active:map.hasLayer(x.group)})))}catch(e){}
 return {page:location.pathname,layers:ls,drawObjects:typeof drawState!=="undefined"?drawState.objects?.size||0:0};
}
function refreshContext(){const c=document.getElementById("aiContext");if(c)c.textContent=`GIS-környezet · ${context().layers.length} réteg`;renderGeorefDiagnostics()}
function renderGeorefDiagnostics(){const el=document.getElementById("aiGeorefDiagnostics"),r=window.KA_GeorefReport;if(!el)return;if(!r||!r.gcpCount){el.hidden=true;el.innerHTML="";return}el.hidden=false;const n=v=>Number.isFinite(v)?v.toFixed(2):"—";const q=r.rmseM<=2?"Kiváló illeszkedés":r.rmseM<=5?"Jó illeszkedés":r.rmseM<=10?"Elfogadható — ellenőrizd a GCP-ket":"Jelentős eltérés — GCP-k felülvizsgálata javasolt";el.innerHTML=`<div class="ai-gd-head"><strong>⌖ GEOREFERÁLÁSI DIAGNOSZTIKA</strong><span>${r.gcpCount} GCP</span></div><div class="ai-gd-grid"><div><b>${n(r.rmseM)} m</b><small>RMS hiba</small></div><div><b>${n(r.maeM)} m</b><small>átlagos eltérés</small></div><div><b>${n(r.maxM)} m</b><small>max. eltérés</small></div><div><b>${n(r.p95M)} m</b><small>95%-os eltérés</small></div></div><div class="ai-gd-line"><span>Illeszkedés</span><b>${q}</b></div><div class="ai-gd-line"><span>Skála / pixelméret</span><b>${n(r.scaleFactor)} m/px</b></div><div class="ai-gd-line"><span>Anizotrópia</span><b>${n(r.anisotropy)}×</b></div><div class="ai-gd-line"><span>Forgatási komponens</span><b>${n(r.rotationDeg)}°</b></div>${r.outlierGcp?`<div class="ai-gd-warning">⚠ A legnagyobb maradékhiba: GCP ${r.outlierGcp}. Érdemes ellenőrizni, hogy a pont valóban ugyanazt a térképi objektumot jelöli-e.</div>`:""}<div class="ai-gd-note">A hibákat síkbeli helyi méterkoordinátákban számítjuk a GCP-k körüli referenciahelyzetben. Ez diagnosztikai mérés; nem helyettesíti a forrásadat pontosságának független ellenőrzését.</div>`}
function add(role,text){const b=document.getElementById("aiMessages");if(!b)return;const d=document.createElement("div");d.className="ai-msg "+role;d.textContent=text;b.appendChild(d);b.scrollTop=b.scrollHeight}
async function send(text){
 if(!text)return;const input=document.getElementById("aiInput");if(input)input.value="";add("user",text);
 try{
  const r=await fetch(state.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text,context:context()})});
  if(!r.ok)throw Error("HTTP "+r.status);const d=await r.json();add("bot",d.reply||"Az AI nem adott választ.");
  (d.actions||[]).forEach(a=>document.dispatchEvent(new CustomEvent("atlas:ai-action",{detail:a})));
 }catch(e){add("bot","Az Atlas AI backend nincs csatlakoztatva. A GIS modulok ettől függetlenül használhatók.");}
}
document.addEventListener('atlas:georef-report',()=>{if(document.getElementById('atlasAIPanel')?.classList.contains('open'))renderGeorefDiagnostics()});
window.AtlasAI={open,send};
document.addEventListener("DOMContentLoaded",()=>{const b=document.getElementById("headerAtlasAIButton");if(b)b.onclick=open});
})();
