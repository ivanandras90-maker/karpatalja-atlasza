/* KÁRPÁTALJA ATLASZ — PROFESSIONAL GEOREFERENCING V41
 * Global Mapper inspired, center-crosshair GCP workflow.
 * LEFT  = local source raster with pan/zoom and pixel-coordinate center readout.
 * RIGHT = live reference map with fixed center crosshair and WGS84 coordinate readout.
 * GCP = source-center pixel + reference-center coordinate. This avoids click-offset errors.
 */
(function(){
  'use strict';
  const S={file:null,files:[],image:null,url:null,displayUrl:null,mode:'gcp',gcpPicking:false,pendingPixel:null,pendingRef:null,gcps:[],gcpMarkers:[],diagnosticLayer:null,refMap:null,refLayer:null,refSourceKey:null,imageScale:1,imageX:0,imageY:0,imageDragging:false,imageDragStart:null,refMoveHandler:null};
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const safeName=n=>String(n||'').replace(/\.[^.]+$/,'');
  const mainMap=()=>window.KA_GEOREF_MAP||(typeof map!=='undefined'?map:null);

  function sources(){
    const out=[]; const bases=window.KA_RASTER_EXPORT_BASEMAPS||{};
    Object.entries(bases).forEach(([name,layer])=>out.push({key:'base:'+name,name,kind:'base',layer}));
    try{if(typeof importedVectorRegistry!=='undefined'&&Array.isArray(importedVectorRegistry)) importedVectorRegistry.forEach(x=>x?.group&&out.push({key:x.key||('geojson:'+x.name),name:x.name||safeName(x.fileName)||'Saját GeoJSON',kind:'geojson',layer:x.group,registry:x}));}catch(e){}
    return out;
  }

  function open(){
    const m=mainMap(); if(!m){alert('A földrajzi térkép még nem töltődött be.');return;}
    window.KA_GEOREF_MAP=m;
    let modal=$('kaGeorefModal'); if(!modal) buildModal(); modal=$('kaGeorefModal');
    modal.classList.add('is-open');
    ensureRefMap(); populateSources(); updateFileUi();
    if(S.image) showImage();
    setTimeout(()=>{S.refMap?.invalidateSize(); updateCenterReadout(); updateStatus();},100);
  }

  function buildModal(){
    const modal=document.createElement('div'); modal.id='kaGeorefModal'; modal.className='ka-georef-modal';
    modal.innerHTML=`
      <div class="ka-georef-dialog ka-georef-v41" role="dialog" aria-modal="true" aria-labelledby="kaGeorefTitle">
        <div class="ka-georef-head">
          <div><div id="kaGeorefTitle">⌖ GEOREFERÁLÁS</div><small>Professzionális GCP munkafolyamat • középpontos igazítás • Global Mapper jellegű referencia-nézet</small></div>
          <button id="kaGeorefClose" type="button" aria-label="Bezárás">×</button>
        </div>
        <div class="ka-georef-toolbar">
          <button id="kaGeorefOpenFolder" class="primary" type="button">📂 OPEN MAPPA</button>
          <button id="kaGeorefOpenFile" type="button">Kép megnyitása</button>
          <input id="kaGeorefFolderInput" type="file" webkitdirectory directory multiple accept=".jpg,.jpeg,.png,.tif,.tiff" hidden>
          <input id="kaGeorefFileInput" type="file" accept=".jpg,.jpeg,.png,.tif,.tiff" hidden>
          <div id="kaGeorefFileList" class="ka-georef-file-list"></div>
          <span id="kaGeorefFileName" class="file-name">Nincs raszter betöltve</span>
        </div>
        <div class="ka-georef-workbar">
          <div class="ka-georef-step"><b>1</b><span>FORRÁS RASZTER</span></div><div class="ka-georef-arrow">→</div>
          <div class="ka-georef-step active"><b>2</b><span>KONTROLLPONTOK</span></div><div class="ka-georef-arrow">→</div>
          <div class="ka-georef-step"><b>3</b><span>TRANSZFORMÁCIÓ</span></div>
          <div class="ka-georef-source-select"><label>Referencia réteg<select id="kaGeorefSource"></select></label></div>
        </div>
        <div class="ka-georef-layout">
          <section class="ka-georef-pane ka-georef-source-pane">
            <div class="ka-georef-pane-head"><div><strong>FORRÁS KÉP</strong><small id="kaGeorefImageInfo">JPG / PNG / TIFF</small></div><span class="pane-badge">PIXEL</span></div>
            <div id="kaGeorefImageViewport" class="ka-georef-image-viewport">
              <div class="ka-georef-image-zoom-controls" aria-label="Forráskép zoom">
                <button id="kaGeorefImageZoomIn" type="button" title="Nagyítás">+</button>
                <button id="kaGeorefImageZoomOut" type="button" title="Kicsinyítés">−</button>
                <button id="kaGeorefImageFit" type="button" title="Kép illesztése">⌗</button>
              </div>
              <div class="ka-georef-image-empty" id="kaGeorefImageEmpty">📂 Nyisd meg a térképet tartalmazó JPG / PNG / TIFF fájlt.<br><small>Görgetés = zoom • húzás = mozgatás • a középső kereszt jelzi a rögzítési pontot</small></div>
              <img id="kaGeorefSourceImage" class="ka-georef-source-image" alt="Georeferálandó forrásraszter" draggable="false" hidden>
              <div id="kaGeorefSourcePickMarker" class="ka-georef-source-pick-marker" aria-hidden="true"></div>
            </div>
            <div class="ka-georef-pane-foot"><span id="kaGeorefPixelStatus">Pixel: —</span><span id="kaGeorefSourceCoordStatus">Forráspont: —</span></div>
          </section>
          <section class="ka-georef-pane ka-georef-reference-pane">
            <div class="ka-georef-pane-head"><div><strong>REFERENCIA TÉRKÉP</strong><small id="kaGeorefRefInfo">Válassz térképréteget</small></div><span class="pane-badge">WGS84</span></div>
            <div id="kaGeorefRefMap" class="ka-georef-ref-map">
              <div class="ka-georef-map-center-crosshair" aria-hidden="true"><span></span></div><div id="kaGeorefRefPickMarker" class="ka-georef-ref-pick-marker" aria-hidden="true"></div>
              <div id="kaGeorefRefCoordBadge" class="ka-georef-ref-coord-badge">48.000000, 23.000000</div>
            </div>
            <div class="ka-georef-pane-foot"><span id="kaGeorefCoordStatus">Kurzor: —</span><span>Kattints a kívánt referencia pontra</span></div>
          </section>
        </div>
        <div class="ka-georef-center-hint"><span>⌖</span><b>GCP kijelölés:</b> a bal oldali képen kattints közvetlenül a kívánt pontra; a képet közben szabadon mozgathatod és zoomolhatod. Ezután a jobb oldali referencia-térképen kattints ugyanarra a földrajzi pontra, vagy add meg kézzel a szélesség/hosszúság koordinátát.</div>
        <div class="ka-georef-bottom">
          <section class="ka-georef-control-panel">
            <div class="ka-georef-panel-title"><strong>GROUND CONTROL POINTS</strong><span id="kaGeorefPickState">Tölts be egy forrásképet, majd indíts új kontrollpontot.</span></div>
            <div class="ka-georef-actions">
              <button id="kaGeorefStartGcp" class="primary" type="button">⌖ ÚJ KONTROLLPONT</button>
              <button id="kaGeorefCapturePixel" type="button" disabled>① FORRÁSPONT KIJELÖLVE</button>
              <button id="kaGeorefCaptureRef" type="button" disabled>② GCP RÖGZÍTÉSE</button>
              <button id="kaGeorefManualCoords" type="button" disabled>Koordináta kézi megadása</button>
              <button id="kaGeorefClearGcps" type="button">GCP-k törlése</button>
            </div>
            <div class="ka-georef-coordinate-editor">
              <div><label>Pixel X<input id="kaGeorefPixelX" type="number" step="0.1" placeholder="—"></label><label>Pixel Y<input id="kaGeorefPixelY" type="number" step="0.1" placeholder="—"></label><button id="kaGeorefApplyPixel" type="button">Pixel alkalmazása</button></div>
              <div><label>Szélesség (Latitude)<input id="kaGeorefLat" type="number" step="0.000001" placeholder="—"></label><label>Hosszúság (Longitude)<input id="kaGeorefLon" type="number" step="0.000001" placeholder="—"></label><button id="kaGeorefApplyCoord" type="button">Koordináta alkalmazása</button></div>
            </div>
            <div class="ka-georef-gcp-grid">
              <div class="gcp-table-wrap"><table class="ka-georef-gcp-table"><thead><tr><th>#</th><th>Pixel X</th><th>Pixel Y</th><th>Latitude</th><th>Longitude</th><th>Eltérés (m)</th><th></th></tr></thead><tbody id="kaGeorefGcpTable"></tbody></table><div id="kaGeorefGcpEmpty" class="gcp-empty">Még nincs kontrollpont. A középső keresztekkel pontosan ugyanarra a térképi objektumra állíthatod a két nézetet.</div></div>
              <div class="ka-georef-fit-panel"><h3>TRANSZFORMÁCIÓ</h3><label>Koordinátarendszer<select id="kaGeorefCrs"><option value="4326">EPSG:4326 — WGS 84</option><option value="3857">EPSG:3857 — Web Mercator</option></select></label><div id="kaGeorefFit" class="fit-box">Legalább 3 kontrollpont szükséges. 4–6 jól elosztott GCP ajánlott.</div><div id="kaGeorefDistortion" class="fit-box ka-georef-distortion">A torzításdiagnosztika a kontrollpontok után jelenik meg.</div><button id="kaGeorefExport" class="primary wide" type="button">⬇ GEO-TIFF MENTÉSE</button><div id="kaGeorefMessage" class="message" aria-live="polite"></div></div>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(modal);
    $('kaGeorefClose').onclick=close; modal.addEventListener('click',e=>{if(e.target===modal)close();});
    $('kaGeorefOpenFolder').onclick=()=>$('kaGeorefFolderInput').click(); $('kaGeorefOpenFile').onclick=()=>$('kaGeorefFileInput').click();
    $('kaGeorefImageZoomIn').onclick=()=>zoomImage(1.16); $('kaGeorefImageZoomOut').onclick=()=>zoomImage(.862); $('kaGeorefImageFit').onclick=fitImageToViewport;
    $('kaGeorefFolderInput').onchange=e=>handleFiles([...e.target.files||[]]); $('kaGeorefFileInput').onchange=e=>handleFiles([...e.target.files||[]]);
    $('kaGeorefSource').onchange=e=>selectSource(e.target.value); $('kaGeorefStartGcp').onclick=startGcpWorkflow;
    $('kaGeorefCapturePixel').onclick=capturePixelFromCenter; $('kaGeorefCaptureRef').onclick=captureReferenceFromCenter;
    $('kaGeorefManualCoords').onclick=manualCoordinateDialog; $('kaGeorefApplyPixel').onclick=applyPixelFields; $('kaGeorefApplyCoord').onclick=applyCoordinateFields;
    $('kaGeorefClearGcps').onclick=clearGcps; $('kaGeorefCrs').onchange=updateFit; $('kaGeorefExport').onclick=exportGeoTiff;
    setupImageInteraction(); document.addEventListener('keydown',onKey);
  }

  function close(){const modal=$('kaGeorefModal');if(modal)modal.classList.remove('is-open');S.gcpPicking=false;document.body.classList.remove('ka-georef-gcp-picking');setButtons();}

  function ensureRefMap(){
    if(S.refMap)return; const m=mainMap(),center=m?.getCenter()||{lat:48.45,lng:23.55};
    S.refMap=L.map('kaGeorefRefMap',{center:[center.lat,center.lng],zoom:m?.getZoom()||9,zoomControl:true,attributionControl:true,preferCanvas:true});
    S.refMap.on('mousemove',updateReferenceReadout); S.refMap.on('move',updateReferenceReadout); S.refMap.on('zoomend',updateReferenceReadout); S.refMap.on('click',e=>{if(!S.gcpPicking||!S.pendingPixel)return; S.pendingRef={lat:e.latlng.lat,lon:e.latlng.lng}; renderReferencePickMarker(); updateCoordinateFieldsFromPending(); setMsg('Referencia pont kijelölve. Ellenőrizd a koordinátát, majd rögzítsd a GCP-t.'); setButtons();});
    updateReferenceReadout();
  }

  function cloneLayer(source){
    if(!source)return null;
    if(source._url){const opts={...source.options};delete opts.attribution;return L.tileLayer(source._url,{...opts,attribution:source.options?.attribution||''});}
    try{if(typeof source.toGeoJSON==='function'){const gj=source.toGeoJSON();return L.geoJSON(gj,{style:()=>({color:'#17374d',weight:2,opacity:.9,fillOpacity:.08})});}}catch(e){}
    return null;
  }
  function populateSources(){const sel=$('kaGeorefSource');if(!sel)return;const arr=sources();sel.innerHTML=arr.length?arr.map(x=>`<option value="${esc(x.key)}">${esc(x.name)}</option>`).join(''):'<option value="">Nincs elérhető réteg</option>';const active=arr.find(x=>x.kind==='base'&&mainMap()?.hasLayer?.(x.layer));const preferred=arr.find(x=>x.key===S.refSourceKey)||active||arr.find(x=>x.name.includes('OpenStreetMap'))||arr[0];if(preferred){sel.value=preferred.key;selectSource(preferred.key);}}
  function selectSource(key){const item=sources().find(x=>x.key===key);if(!item||!S.refMap)return;if(S.refLayer){try{S.refMap.removeLayer(S.refLayer);}catch(e){}}S.refLayer=cloneLayer(item.layer);S.refSourceKey=key;if(S.refLayer){S.refLayer.addTo(S.refMap);try{const b=item.layer?.getBounds?.();if(b?.isValid?.())S.refMap.fitBounds(b,{padding:[20,20],maxZoom:mainMap()?.getZoom?.()||12});else if(mainMap())S.refMap.setView(mainMap().getCenter(),mainMap().getZoom());}catch(e){if(mainMap())S.refMap.setView(mainMap().getCenter(),mainMap().getZoom());}}if($('kaGeorefRefInfo'))$('kaGeorefRefInfo').textContent=item.name;updateReferenceReadout();}

  function handleFiles(files){const images=files.filter(f=>/\.(jpe?g|png|tiff?)$/i.test(f.name));if(!images.length){setMsg('A kiválasztott mappában nem található JPG, PNG vagy TIFF.',true);return;}S.files=images;const list=$('kaGeorefFileList');if(list){list.innerHTML=images.map((f,i)=>`<button type="button" class="ka-georef-file-chip${i===0?' active':''}" data-file="${i}">${esc(f.name)}</button>`).join('');list.querySelectorAll('[data-file]').forEach(b=>b.onclick=()=>{list.querySelectorAll('.ka-georef-file-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadFile(S.files[+b.dataset.file]);});}loadFile(images[0]);}

  async function loadFile(file){
    try{if(S.url)URL.revokeObjectURL(S.url);if(S.displayUrl&&S.displayUrl!==S.url)URL.revokeObjectURL(S.displayUrl);}catch(e){}
    clearGcps();S.file=file;S.url=URL.createObjectURL(file);S.displayUrl=S.url;S.image=null;S.imageScale=1;S.imageX=0;S.imageY=0;setMsg('Raszter betöltése…');
    try{let img;if(/\.(tiff?)$/i.test(file.name)){img=await decodeTiff(file);const blob=await new Promise((resolve,reject)=>img.toBlob(b=>b?resolve(b):reject(new Error('A TIFF előnézete nem készíthető el.')),'image/png'));S.displayUrl=URL.createObjectURL(blob);}else img=await decodeImage(S.url);S.image=img;showImage();setMsg('✓ Forrásraszter betöltve. A képet szabadon mozgathatod és zoomolhatod; GCP módban közvetlenül kattints a kívánt pontra.');}catch(e){S.image=null;const img=$('kaGeorefSourceImage');if(img){img.hidden=true;img.removeAttribute('src');}if($('kaGeorefImageEmpty'))$('kaGeorefImageEmpty').hidden=false;setMsg(e.message||'A raszter nem olvasható.',true);}updateFileUi();}
  function showImage(){const img=$('kaGeorefSourceImage'),empty=$('kaGeorefImageEmpty');if(!img||!S.image)return;img.classList.add('ka-georef-source-image');img.onload=()=>{img.hidden=false;fitImageToViewport();renderImageTransform();};img.src=S.displayUrl;img.hidden=false;empty.hidden=true;$('kaGeorefImageInfo').textContent=`${S.file?.name||'Raszter'} • ${S.image.width} × ${S.image.height} px`;fitImageToViewport();renderImageTransform();updatePixelReadout();}
  function fitImageToViewport(){const vp=$('kaGeorefImageViewport');if(!vp||!S.image)return;const pad=30,scale=Math.min((vp.clientWidth-pad)/(S.image.width||1),(vp.clientHeight-pad)/(S.image.height||1));S.imageScale=clamp(scale,.02,4);S.imageX=(vp.clientWidth-S.image.width*S.imageScale)/2;S.imageY=(vp.clientHeight-S.image.height*S.imageScale)/2;renderImageTransform();updatePixelReadout();}
  function renderImageTransform(){const img=$('kaGeorefSourceImage');if(!img||!S.image)return;img.style.width=S.image.width+'px';img.style.height=S.image.height+'px';img.style.transform=`translate3d(${S.imageX}px,${S.imageY}px,0) scale(${S.imageScale})`;updatePixelReadout();}
  function setupImageInteraction(){
    const vp=$('kaGeorefImageViewport'); if(!vp)return;
    vp.addEventListener('wheel',e=>{
      if(!S.image)return; e.preventDefault();
      const r=vp.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,old=S.imageScale,next=clamp(old*(e.deltaY<0?1.16:.862),.02,16);
      S.imageX=mx-(mx-S.imageX)*(next/old); S.imageY=my-(my-S.imageY)*(next/old); S.imageScale=next; renderImageTransform();
    },{passive:false});
    vp.addEventListener('pointerdown',e=>{
      if(!S.image)return;
      S.imageDragging=true; S.imageDragStart={x:e.clientX,y:e.clientY,ix:S.imageX,iy:S.imageY,moved:false};
      vp.setPointerCapture?.(e.pointerId);
    });
    vp.addEventListener('pointermove',e=>{
      if(!S.imageDragging)return;
      const dx=e.clientX-S.imageDragStart.x,dy=e.clientY-S.imageDragStart.y;
      if(Math.hypot(dx,dy)>4)S.imageDragStart.moved=true;
      S.imageX=S.imageDragStart.ix+dx; S.imageY=S.imageDragStart.iy+dy; renderImageTransform();
    });
    vp.addEventListener('pointerup',e=>{
      if(!S.imageDragging)return;
      const drag=S.imageDragStart; S.imageDragging=false;
      try{vp.releasePointerCapture?.(e.pointerId);}catch(_){}
      if(S.gcpPicking && !drag.moved){
        const p=sourcePixelFromViewportPoint(e.clientX,e.clientY);
        if(p){S.pendingPixel=p; renderSourcePickMarker(e.clientX,e.clientY); updatePixelReadout(p); setMsg('Forráspont kijelölve. A jobb oldali térképen kattints a megfelelő földrajzi pontra, vagy add meg kézzel a koordinátát.'); $('kaGeorefPickState').textContent='2/2 — JOBB: kattints a referencia pontra, vagy adj meg koordinátát.'; setButtons();}
      }
    });
    window.addEventListener('resize',()=>{if($('kaGeorefModal')?.classList.contains('is-open')){S.refMap?.invalidateSize();updatePixelReadout();updateReferenceReadout();}});
  }
  function sourcePixelFromViewportPoint(clientX,clientY){
    if(!S.image)return null; const vp=$('kaGeorefImageViewport'); if(!vp)return null; const r=vp.getBoundingClientRect();
    const px=clamp((clientX-r.left-S.imageX)/S.imageScale,0,S.image.width-1),py=clamp((clientY-r.top-S.imageY)/S.imageScale,0,S.image.height-1); return{x:px,y:py};
  }
  function sourceCenterPixel(){const vp=$('kaGeorefImageViewport');if(!vp)return null;return sourcePixelFromViewportPoint(vp.getBoundingClientRect().left+vp.clientWidth/2,vp.getBoundingClientRect().top+vp.clientHeight/2);}
  function updatePixelReadout(p){
    p=p||S.pendingPixel||sourceCenterPixel(); const st=$('kaGeorefPixelStatus');
    if(!p){if(st)st.textContent='Pixel: —';return;}
    if(st)st.textContent=`Pixel: X ${p.x.toFixed(1)} • Y ${p.y.toFixed(1)}`;
    const x=$('kaGeorefPixelX'),y=$('kaGeorefPixelY'); if(x)x.value=p.x.toFixed(1); if(y)y.value=p.y.toFixed(1);
    const sc=$('kaGeorefSourceCoordStatus'); if(sc)sc.textContent=S.pendingPixel?`Forráspont: X ${p.x.toFixed(1)} • Y ${p.y.toFixed(1)}`:'Forráspont: —';
  }
  function renderSourcePickMarker(clientX,clientY){
    const vp=$('kaGeorefImageViewport'),mk=$('kaGeorefSourcePickMarker'); if(!vp||!mk)return; const r=vp.getBoundingClientRect();
    mk.style.left=(clientX-r.left)+'px'; mk.style.top=(clientY-r.top)+'px'; mk.classList.add('visible');
  }
  function updateReferenceReadout(latlng){
    if(!S.refMap)return; const c=latlng||S.refMap.getCenter(),txt=`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;
    const st=$('kaGeorefCoordStatus');if(st)st.textContent=`Kurzor: ${txt}`; if(S.pendingRef) renderReferencePickMarker();
    const b=$('kaGeorefRefCoordBadge');if(b)b.textContent=txt;
    if(!latlng&&!S.pendingRef){const lat=$('kaGeorefLat'),lon=$('kaGeorefLon');if(lat)lat.value=c.lat.toFixed(6);if(lon)lon.value=c.lng.toFixed(6);}
  }
  function updateCoordinateFieldsFromPending(){
    if(!S.pendingRef)return; const lat=$('kaGeorefLat'),lon=$('kaGeorefLon'); if(lat)lat.value=S.pendingRef.lat.toFixed(6); if(lon)lon.value=S.pendingRef.lon.toFixed(6);
    const b=$('kaGeorefRefCoordBadge');if(b)b.textContent=`${S.pendingRef.lat.toFixed(6)}, ${S.pendingRef.lon.toFixed(6)}`;
  }
  function renderReferencePickMarker(){
    const mk=$('kaGeorefRefPickMarker'); if(!mk||!S.refMap||!S.pendingRef)return; const pt=S.refMap.latLngToContainerPoint([S.pendingRef.lat,S.pendingRef.lon]); mk.style.left=pt.x+'px';mk.style.top=pt.y+'px';mk.classList.add('visible');
  }
  function startGcpWorkflow(){
    if(!S.image){setMsg('Előbb tölts be egy forrásképet.',true);return;}
    S.gcpPicking=true;S.pendingPixel=null;S.pendingRef=null;document.body.classList.add('ka-georef-gcp-picking');
    const mk=$('kaGeorefSourcePickMarker');if(mk)mk.classList.remove('visible');const rm=$('kaGeorefRefPickMarker');if(rm)rm.classList.remove('visible');
    $('kaGeorefPickState').textContent='1/2 — BAL: kattints a kívánt pontra. A kép szabadon mozgatható és zoomolható.';setMsg('Kattints közvetlenül a georeferálandó kép kívánt pontjára.');setButtons();
  }
  function capturePixelFromCenter(){
    if(!S.gcpPicking||!S.image){setMsg('Indíts új kontrollpontot.',true);return;} const p=sourceCenterPixel(); if(!p)return; S.pendingPixel=p; updatePixelReadout(p); setMsg('Forráspont a nézet közepéről rögzítve.'); $('kaGeorefPickState').textContent='2/2 — JOBB: kattints a referencia pontra, vagy adj meg koordinátát.'; setButtons();
  }
  function captureReferenceFromCenter(){
    if(!S.gcpPicking||!S.pendingPixel){setMsg('Előbb jelöld ki a forráspontot a bal oldali képen.',true);return;} const c=S.refMap?.getCenter(); if(!c)return; S.pendingRef={lat:c.lat,lon:c.lng}; updateCoordinateFieldsFromPending(); finalizePendingGcp();
  }
  function finalizePendingGcp(){
    if(!S.pendingPixel||!S.pendingRef){setMsg('A GCP-hez forráspont és referencia-koordináta is szükséges.',true);return;}
    saveGcp(S.pendingPixel.x,S.pendingPixel.y,S.pendingRef.lat,S.pendingRef.lon); S.pendingPixel=null;S.pendingRef=null;S.gcpPicking=false;document.body.classList.remove('ka-georef-gcp-picking');
    $('kaGeorefPickState').textContent='Kontrollpont mentve. Újabb ponthoz indíts új kontrollpontot.';setButtons();
  }
  function setButtons(){
    const a=$('kaGeorefCapturePixel'),b=$('kaGeorefCaptureRef'),m=$('kaGeorefManualCoords');
    if(a)a.disabled=!S.gcpPicking;
    if(b)b.disabled=!S.gcpPicking||!S.pendingPixel||!S.pendingRef;
    if(m)m.disabled=!S.gcpPicking||!S.pendingPixel;
    const start=$('kaGeorefStartGcp');if(start)start.textContent=S.gcpPicking?(S.pendingPixel?'2/2 REFERENCIA':'1/2 FORRÁSPONT'):'⌖ ÚJ KONTROLLPONT';
  }

  function applyPixelFields(){
    const x=parseFloat(($('kaGeorefPixelX')?.value||'').replace(',','.')),y=parseFloat(($('kaGeorefPixelY')?.value||'').replace(',','.'));
    if(!S.image||!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=S.image.width||y>=S.image.height){setMsg('Érvénytelen pixelkoordináta.',true);return;}
    S.pendingPixel={x,y};S.gcpPicking=true;updatePixelReadout(S.pendingPixel);$('kaGeorefPickState').textContent='2/2 — JOBB: kattints a referencia pontra, vagy adj meg koordinátát.';setMsg('Pixelkoordináta beállítva.');setButtons();
  }
  function applyCoordinateFields(){
    const lat=parseFloat(($('kaGeorefLat')?.value||'').replace(',','.')),lon=parseFloat(($('kaGeorefLon')?.value||'').replace(',','.'));
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180){setMsg('Érvénytelen WGS84 koordináta.',true);return;}
    if(!S.pendingPixel){setMsg('Előbb jelöld ki a forráspontot a bal oldali képen.',true);return;}
    S.pendingRef={lat,lon};finalizePendingGcp();
  }
  function manualCoordinateDialog(){
    if(!S.pendingPixel){setMsg('Előbb jelöld ki a forráspontot a bal oldali képen.',true);return;}
    const lat=prompt('Szélesség / Latitude (WGS84):',$('kaGeorefLat')?.value||'');if(lat===null)return;
    const lon=prompt('Hosszúság / Longitude (WGS84):',$('kaGeorefLon')?.value||'');if(lon===null)return;
    const la=parseFloat(lat.replace(',','.')),lo=parseFloat(lon.replace(',','.'));if(!Number.isFinite(la)||!Number.isFinite(lo)||la<-90||la>90||lo<-180||lo>180){setMsg('Érvénytelen WGS84 koordináta.',true);return;}
    S.pendingRef={lat:la,lon:lo};updateCoordinateFieldsFromPending();finalizePendingGcp();
  }
  function saveGcp(px,py,lat,lon){if(!Number.isFinite(px)||!Number.isFinite(py)||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180){setMsg('Érvénytelen kontrollpont.',true);return;}S.gcps.push({px,py,lat,lon});renderGcps();updateFit();}
  function clearGcps(){S.gcps=[];S.gcpMarkers.forEach(m=>{try{S.refMap?.removeLayer(m);}catch(e){}});S.gcpMarkers=[];if(S.diagnosticLayer){try{S.refMap?.removeLayer(S.diagnosticLayer);}catch(e){}}S.diagnosticLayer=null;S.pendingPixel=null;S.gcpPicking=false;document.body.classList.remove('ka-georef-gcp-picking');if($('kaGeorefGcpTable'))$('kaGeorefGcpTable').innerHTML='';if($('kaGeorefGcpEmpty'))$('kaGeorefGcpEmpty').hidden=false;if($('kaGeorefFit'))$('kaGeorefFit').innerHTML='<strong>3+ GCP szükséges</strong><span>4–6 jól elosztott pont ajánlott.</span>';if($('kaGeorefDistortion'))$('kaGeorefDistortion').textContent='A torzításdiagnosztika a stabil transzformáció után jelenik meg.';setButtons();}
  function renderGcps(){const tb=$('kaGeorefGcpTable'),empty=$('kaGeorefGcpEmpty');if(!tb)return;tb.innerHTML=S.gcps.map((g,i)=>`<tr><td><b>GCP ${i+1}</b></td><td>${g.px.toFixed(1)}</td><td>${g.py.toFixed(1)}</td><td>${g.lat.toFixed(6)}</td><td>${g.lon.toFixed(6)}</td><td class="gcp-error" id="gcpErr${i}">—</td><td><button type="button" data-del-gcp="${i}">×</button></td></tr>`).join('');if(empty)empty.hidden=!!S.gcps.length;tb.querySelectorAll('[data-del-gcp]').forEach(b=>b.onclick=()=>{S.gcps.splice(+b.dataset.delGcp,1);renderGcps();updateFit();});S.gcpMarkers.forEach(m=>{try{S.refMap?.removeLayer(m);}catch(e){}});S.gcpMarkers=[];S.gcps.forEach((g,i)=>{if(!S.refMap)return;const mk=L.circleMarker([g.lat,g.lon],{radius:5,color:'#17374d',weight:2,fillColor:'#fff',fillOpacity:1,interactive:false,zIndexOffset:10000}).addTo(S.refMap);mk.bindTooltip(`GCP ${i+1}`,{permanent:true,direction:'top',offset:[0,-6],className:'ka-georef-gcp-label'});S.gcpMarkers.push(mk);});}

  function merc(lon,lat){const R=6378137;return[R*lon*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+clamp(lat,-85.05112878,85.05112878)*Math.PI/360))];}
  function solveLeastSquares(A,b){const M=A.map((r,i)=>[r[0],r[1],r[2],b[i]]);for(let c=0;c<3;c++){let piv=c;for(let r=c+1;r<M.length;r++)if(Math.abs(M[r][c])>Math.abs(M[piv][c]))piv=r;if(Math.abs(M[piv][c])<1e-12)return null;[M[c],M[piv]]=[M[piv],M[c]];const div=M[c][c];for(let k=c;k<4;k++)M[c][k]/=div;for(let r=0;r<M.length;r++){if(r===c)continue;const q=M[r][c];for(let k=c;k<4;k++)M[r][k]-=q*M[c][k];}}return[M[0][3],M[1][3],M[2][3]];}
  function localXY(lon,lat,lat0,lon0){const R=6378137,rad=Math.PI/180,c=Math.cos(lat0*rad);return[R*(lon-lon0)*rad*c,R*(lat-lat0)*rad];}
  function fitAffine(points,crs){if(points.length<3)return null;const A=[],X=[],Y=[];for(const p of points){const xy=crs==='3857'?merc(p.lon,p.lat):[p.lon,p.lat];A.push([p.px,p.py,1]);X.push(xy[0]);Y.push(xy[1]);}const cx=solveLeastSquares(A,X),cy=solveLeastSquares(A,Y);if(!cx||!cy)return null;let ss=0;const residuals=[];for(let i=0;i<points.length;i++){const xx=cx[0]*A[i][0]+cx[1]*A[i][1]+cx[2],yy=cy[0]*A[i][0]+cy[1]*A[i][1]+cy[2],d=Math.hypot(xx-X[i],yy-Y[i]);ss+=d*d;residuals.push(d);}return{x:cx,y:cy,rmse:Math.sqrt(ss/points.length),residuals};}
  function diagnosticFit(points){if(points.length<3)return null;const lat0=points.reduce((s,p)=>s+p.lat,0)/points.length,lon0=points.reduce((s,p)=>s+p.lon,0)/points.length;const A=points.map(p=>[p.px,p.py,1]),X=[],Y=[];points.forEach(p=>{const q=localXY(p.lon,p.lat,lat0,lon0);X.push(q[0]);Y.push(q[1]);});const cx=solveLeastSquares(A,X),cy=solveLeastSquares(A,Y);if(!cx||!cy)return null;const residuals=[],vectors=[];let ss=0,abs=0,max=0;points.forEach((p,i)=>{const px=cx[0]*p.px+cx[1]*p.py+cx[2],py=cy[0]*p.px+cy[1]*p.py+cy[2],dx=px-X[i],dy=py-Y[i],d=Math.hypot(dx,dy);residuals.push(d);vectors.push({dx,dy,d});ss+=d*d;abs+=d;max=Math.max(max,d);});const sorted=[...residuals].sort((a,b)=>a-b),q95=sorted[Math.min(sorted.length-1,Math.floor(.95*(sorted.length-1)))],rmse=Math.sqrt(ss/points.length),mae=abs/points.length,j00=cx[0],j01=cx[1],j10=cy[0],j11=cy[1],det=j00*j11-j01*j10,col1=Math.hypot(j00,j10),col2=Math.hypot(j01,j11),scale=Math.sqrt(Math.abs(det)),anisotropy=Math.max(col1,col2)/Math.max(1e-12,Math.min(col1,col2)),rotationDeg=Math.atan2(j10,j00)*180/Math.PI,predicted=points.map(p=>{const qx=cx[0]*p.px+cx[1]*p.py+cx[2],qy=cy[0]*p.px+cy[1]*p.py+cy[2],rad=Math.PI/180,R=6378137;return{lat:lat0+(qy/R)/rad,lon:lon0+(qx/(R*Math.cos(lat0*rad)))/rad};}),outlierIndex=residuals.indexOf(max);return{lat0,lon0,cx,cy,residuals,vectors,predicted,rmse,mae,max,q95,det,scale,anisotropy,rotationDeg,outlierIndex};}
  function updateFit(){const el=$('kaGeorefFit'),crs=$('kaGeorefCrs')?.value||'4326';if(!el)return;const fit=fitAffine(S.gcps,crs),diag=diagnosticFit(S.gcps);if(!fit||!diag){el.innerHTML=S.gcps.length<3?'<strong>3+ GCP szükséges</strong><span>4–6 jól elosztott pont ajánlott.</span>':'<strong>⚠ Nem számítható stabil transzformáció.</strong>';if($('kaGeorefDistortion'))$('kaGeorefDistortion').textContent='A torzításdiagnosztika a stabil transzformáció után jelenik meg.';renderResidualVectors({predicted:[],residuals:[]});publishReport(null);return;}el.innerHTML=`<strong>✓ Affin transzformáció kész</strong><span>${S.gcps.length} GCP • RMS: ${diag.rmse.toFixed(2)} m • max: ${diag.max.toFixed(2)} m</span>`;if($('kaGeorefDistortion'))$('kaGeorefDistortion').innerHTML=`<strong>TORZÍTÁSI DIAGNÓZIS</strong><span>Átlagos eltérés: ${diag.mae.toFixed(2)} m</span><span>95% eltérés: ${diag.q95.toFixed(2)} m</span><span>Maximális eltérés: ${diag.max.toFixed(2)} m</span><span>Skálafaktor: ${diag.scale.toFixed(6)} m/px • anizotrópia: ${diag.anisotropy.toFixed(4)}× • forgatás: ${diag.rotationDeg.toFixed(4)}°</span><span>Vörös szaggatott vektor: GCP → transzformáció által számított hely.</span>`;diag.residuals.forEach((v,i)=>{const c=$('gcpErr'+i);if(c)c.textContent=`${v.toFixed(2)} m`;});renderResidualVectors(diag);publishReport(diag);}
  function renderResidualVectors(diag){if(!S.refMap)return;if(S.diagnosticLayer){try{S.refMap.removeLayer(S.diagnosticLayer);}catch(e){}}S.diagnosticLayer=L.layerGroup().addTo(S.refMap);(diag.predicted||[]).forEach((p,i)=>{const g=S.gcps[i],d=diag.residuals[i];L.polyline([[g.lat,g.lon],[p.lat,p.lon]],{color:'#b84b3d',weight:2,dashArray:'5 4',opacity:.9,interactive:false}).bindTooltip(`GCP ${i+1} • eltérés ${d.toFixed(2)} m`,{sticky:true}).addTo(S.diagnosticLayer);});}
  function publishReport(diag){window.KA_GeorefReport=diag?{timestamp:new Date().toISOString(),gcpCount:S.gcps.length,rmseM:diag.rmse,maeM:diag.mae,maxM:diag.max,p95M:diag.q95,anisotropy:diag.anisotropy,scaleFactor:diag.scale,rotationDeg:diag.rotationDeg,outlierGcp:diag.outlierIndex>=0?diag.outlierIndex+1:null,residualsM:diag.residuals.slice(),vectors:diag.vectors.map(v=>({dxM:v.dx,dyM:v.dy,lengthM:v.d}))}:{timestamp:new Date().toISOString(),gcpCount:S.gcps.length};document.dispatchEvent(new CustomEvent('atlas:georef-report',{detail:window.KA_GeorefReport}));}
  function setMsg(t,err){const el=$('kaGeorefMessage');if(el){el.textContent=t||'';el.className='message '+(err?'error':'');}}
  function updateFileUi(){if($('kaGeorefFileName'))$('kaGeorefFileName').textContent=S.file?.name||'Nincs raszter betöltve';}
  function onKey(e){const modal=$('kaGeorefModal');if(!modal?.classList.contains('is-open'))return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.key==='Escape'){close();return;}if(e.key==='0'){fitImageToViewport();}if(e.key==='+'||e.key==='='){zoomImage(1.16);}if(e.key==='-'){zoomImage(.862);}}
  function zoomImage(f){const vp=$('kaGeorefImageViewport');if(!vp||!S.image)return;const r=vp.getBoundingClientRect(),mx=r.width/2,my=r.height/2,old=S.imageScale,next=clamp(old*f,.02,16);S.imageX=mx-(mx-S.imageX)*(next/old);S.imageY=my-(my-S.imageY)*(next/old);S.imageScale=next;renderImageTransform();}
  async function decodeImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('A JPG/PNG nem olvasható be a böngészőben.'));img.src=url;});}
  async function decodeTiff(file){try{const mod=await import('https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm');const ab=await file.arrayBuffer();const t=await mod.fromArrayBuffer(ab),page=await t.getImage(),ras=await page.readRasters({interleave:true}),w=page.getWidth(),h=page.getHeight(),samples=page.getSamplesPerPixel(),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),out=ctx.createImageData(w,h);let min=Infinity,max=-Infinity;for(let i=0;i<ras.length;i++){const v=ras[i];if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v);}}const scale=max>min?255/(max-min):1;for(let i=0,p=0;i<w*h;i++,p+=4){let r,g,b,a=255;if(samples===1){r=g=b=clamp(Math.round((ras[i]-min)*scale),0,255);}else{r=clamp(Math.round(ras[i*samples]),0,255);g=clamp(Math.round(ras[i*samples+1]),0,255);b=clamp(Math.round(ras[i*samples+2]),0,255);if(samples>3)a=clamp(Math.round(ras[i*samples+3]),0,255);}out.data[p]=r;out.data[p+1]=g;out.data[p+2]=b;out.data[p+3]=a;}ctx.putImageData(out,0,0);return canvas;}catch(e){throw new Error('A TIFF előnézetéhez szükség van a GeoTIFF dekóder betöltésére. JPG/PNG esetén ez nem szükséges.');}}
  function imagePixels(){if(!S.image)return null;const canvas=document.createElement('canvas');canvas.width=S.image.width;canvas.height=S.image.height;canvas.getContext('2d').drawImage(S.image,0,0);return canvas;}
  function writeGeoTiffRGBA(canvas,fit,crs){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,w=canvas.width,h=canvas.height,entries=[],align=n=>(n+1)&~1,ifdCount=16,ifdSize=2+ifdCount*12+4;let extra=align(8+ifdSize),bitsOff=extra;extra+=8;let xresOff=align(extra);extra+=8;let yresOff=align(extra);extra+=8;let geoOff=align(extra);const geo=crs==='4326'?[1,1,0,3,1024,0,1,1,1025,0,1,1,2048,0,1,4326]:[1,1,0,3,1024,0,1,1,1025,0,1,1,3072,0,1,3857];extra+=geo.length*2;let transOff=align(extra);extra+=16*8;let pixelOff=align(extra);extra+=w*h*4;const buf=new ArrayBuffer(extra),dv=new DataView(buf),u8=new Uint8Array(buf),add=(tag,type,count,val)=>entries.push([tag,type,count,val]);add(256,4,1,w);add(257,4,1,h);add(258,3,4,bitsOff);add(259,3,1,1);add(262,3,1,2);add(273,4,1,pixelOff);add(277,3,1,4);add(278,4,1,h);add(279,4,1,w*h*4);add(282,5,1,xresOff);add(283,5,1,yresOff);add(284,3,1,1);add(338,3,1,2);add(34735,3,geo.length,geoOff);add(34264,12,16,transOff);let p=0;dv.setUint16(p,0x4949,true);p+=2;dv.setUint16(p,42,true);p+=2;dv.setUint32(p,8,true);p=8;dv.setUint16(p,entries.length,true);p+=2;for(const [tag,type,count,val] of entries){dv.setUint16(p,tag,true);dv.setUint16(p+2,type,true);dv.setUint32(p+4,count,true);dv.setUint32(p+8,val,true);if(type===3&&count===1)dv.setUint16(p+8,val,true);p+=12;}dv.setUint32(p,0,true);dv.setUint16(bitsOff,8,true);dv.setUint16(bitsOff+2,8,true);dv.setUint16(bitsOff+4,8,true);dv.setUint16(bitsOff+6,8,true);dv.setUint32(xresOff,72,true);dv.setUint32(xresOff+4,1,true);dv.setUint32(yresOff,72,true);dv.setUint32(yresOff+4,1,true);let go=geoOff;for(const v of geo){dv.setUint16(go,v,true);go+=2;}const t=[fit.x[0],fit.x[1],0,fit.x[2],fit.y[0],fit.y[1],0,fit.y[2],0,0,1,0,0,0,0,1];let to=transOff;for(const v of t){dv.setFloat64(to,v,true);to+=8;}u8.set(data,pixelOff);return buf;}
  async function exportGeoTiff(){if(!S.image){setMsg('Előbb tölts be egy forrásrasztert.',true);return;}if(S.gcps.length<3){setMsg('GeoTIFF exporthoz legalább 3 kontrollpont szükséges. 4–6 jól elosztott GCP ajánlott.',true);return;}const crs=$('kaGeorefCrs').value,fit=fitAffine(S.gcps,crs);if(!fit){setMsg('A kontrollpontok nem alkalmasak stabil affin transzformációra.',true);return;}try{$('kaGeorefExport').disabled=true;setMsg('Georeferált GeoTIFF összeállítása…');const blob=new Blob([writeGeoTiffRGBA(imagePixels(),fit,crs)],{type:'image/tiff'});await saveFile(blob,`${safeName(S.file?.name||'raszter')}_georeferenced.tif`);setMsg('✓ Georeferált GeoTIFF elkészült.');}catch(e){if(e?.name==='AbortError')setMsg('Mentés megszakítva.');else setMsg(e.message||'A GeoTIFF export sikertelen.',true);}finally{$('kaGeorefExport').disabled=false;}}
  async function saveFile(blob,filename){if(window.showSaveFilePicker){const h=await window.showSaveFilePicker({suggestedName:filename,startIn:'documents',types:[{description:'GeoTIFF',accept:{'image/tiff':['.tif','.tiff']}}]});const w=await h.createWritable();await w.write(blob);await w.close();return;}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}

  window.KA_openGeoreferencing=open; window.KA_prepareGeoreferencing=function(){window.KA_GEOREF_MAP=mainMap();};
})();
