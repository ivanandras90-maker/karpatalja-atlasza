/*
 * KÁRPÁTALJA ATLASZ — RASTER EXPORT
 * Browser-side tile mosaic -> polygon clip -> georeferenced GeoTIFF.
 * No server is required. Export uses the currently configured Leaflet tile URL.
 */
(function(){
  'use strict';

  const state = { polygon:null, drawing:null, busy:false, rectangle:null, licensedSources:[] };
  const $ = id => document.getElementById(id);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const esc = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const stripExt = s => String(s||'').replace(/\.(geojson|json)$/i,'');

  function basemaps(){ return window.KA_RASTER_EXPORT_BASEMAPS || {}; }
  function mapObj(){ return window.KA_RASTER_EXPORT_MAP || (typeof map !== 'undefined' ? map : null); }

  function open(){
    const m=mapObj(); if(!m) return;
    let modal=$('kaRasterExportModal');
    if(!modal){
      modal=document.createElement('div'); modal.id='kaRasterExportModal'; modal.className='ka-raster-modal';
      modal.innerHTML=`<div class="ka-raster-dialog" role="dialog" aria-modal="true" aria-labelledby="kaRasterTitle">
        <div class="ka-raster-head"><div><div id="kaRasterTitle">▦ RASTER EXPORT</div><small>Georeferált raszter export kijelölt területből</small></div><button id="kaRasterClose" type="button">×</button></div>
        <div class="ka-raster-body">
          <div class="ka-raster-grid">
            <section class="ka-raster-section"><h4>1. TERÜLET</h4>
              <div class="ka-raster-choice"><button id="kaRasterDraw" class="ka-raster-primary">▣ Téglalap kijelölése</button><button id="kaRasterClear">Törlés</button></div>
              <div id="kaRasterStatus" class="ka-raster-status">Jelölj ki egy téglalapot a térképen; az export a téglalap négy sarokkoordinátáját veszi alapul.</div>
              <div class="ka-raster-coords"><label>Észak <input id="kaRasterNorth" type="number" step="any" placeholder="48.35"></label><label>Dél <input id="kaRasterSouth" type="number" step="any" placeholder="48.10"></label><label>Kelet <input id="kaRasterEast" type="number" step="any" placeholder="24.80"></label><label>Nyugat <input id="kaRasterWest" type="number" step="any" placeholder="24.30"></label></div>
            </section>
            <section class="ka-raster-section"><h4>2. FORRÁS RÉTEG</h4>
              <label class="ka-raster-field">Térképréteg<select id="kaRasterLayer"></select></label>
              <div id="kaRasterPolicy" class="ka-raster-policy"></div>
              <div class="ka-raster-source-actions"><button id="kaRasterAddSource" type="button">＋ Engedélyezett XYZ-forrás</button></div>
              <label class="ka-raster-field">Zoom / részletesség<select id="kaRasterZoom"></select></label>
              <label class="ka-raster-field">Kimeneti CRS<select id="kaRasterCrs"><option value="3857">EPSG:3857 — Web Mercator</option></select></label>
              <div class="ka-raster-note">Az Atlasz csak olyan csempeforrást enged GeoTIFF-exporthoz, amelynél az export/offline használat jogszerűen engedélyezett és a szolgáltató ezt technikailag is támogatja. A közösségi vagy kereskedelmi megjelenítési csempék exportja alapból tiltott.</div>
            </section>
          </div>
          <section class="ka-raster-section ka-raster-preview"><h4>3. EXPORT</h4><div class="ka-raster-summary" id="kaRasterSummary">Nincs kijelölt terület.</div><div class="ka-raster-progress"><span id="kaRasterProgressBar"></span></div><div class="ka-raster-actions"><button id="kaRasterPreview">Előnézet</button><button id="kaRasterExport" class="ka-raster-primary">⬇ GEO-TIFF EXPORT</button></div><div id="kaRasterMessage" class="ka-raster-message"></div></section>
        </div>
      </div>`;
      document.body.appendChild(modal);
      $('kaRasterClose').onclick=close; modal.addEventListener('click',e=>{if(e.target===modal)close();});
      $('kaRasterDraw').onclick=startDraw; $('kaRasterClear').onclick=clearSelection;
      $('kaRasterPreview').onclick=updateSummary; $('kaRasterExport').onclick=exportRaster;
      $('kaRasterLayer').onchange=()=>{ updatePolicy(); updateSummary(); }; $('kaRasterZoom').onchange=updateSummary; $('kaRasterAddSource').onclick=addLicensedSource;
    }
    populateLayers(); populateZoom(); updatePolicy(); updateSummary(); modal.classList.add('is-open');
  }
  function close(){ const m=$('kaRasterExportModal'); if(m) m.classList.remove('is-open'); stopDraw(false); selectionOverlay(false); }
  function loadLicensedSources(){
    try{ const raw=localStorage.getItem('ka_raster_licensed_sources_v1'); state.licensedSources=raw?JSON.parse(raw):[]; }catch(e){ state.licensedSources=[]; }
  }
  function saveLicensedSources(){
    try{ localStorage.setItem('ka_raster_licensed_sources_v1',JSON.stringify(state.licensedSources)); }catch(e){}
  }
  function sourceEntries(){
    const entries=Object.entries(basemaps()).map(([name,layer])=>({id:'base:'+name,name,layer,exportAllowed:false,reason:'A beépített külső térképszolgáltatás exportja alapértelmezésben nincs engedélyezve.'}));
    for(const src of state.licensedSources){
      entries.push({id:'licensed:'+src.id,name:'✓ '+src.name,template:src.template,exportAllowed:true,license:src.license,licenseUrl:src.licenseUrl,attribution:src.attribution,permission:src.permission});
    }
    return entries;
  }
  function populateLayers(){
    const sel=$('kaRasterLayer'); if(!sel) return;
    loadLicensedSources();
    const entries=sourceEntries();
    const current=entries.find(e=>e.layer && mapObj().hasLayer(e.layer));
    sel.innerHTML=entries.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}${e.exportAllowed?' — EXPORT':''}</option>`).join('');
    if(current) sel.value=current.id;
  }
  function selectedSource(){
    const id=$('kaRasterLayer')?.value||'';
    return sourceEntries().find(e=>e.id===id)||null;
  }
  function updatePolicy(){
    const el=$('kaRasterPolicy'); if(!el)return;
    const src=selectedSource();
    if(!src){el.innerHTML='<strong>⚠ Nincs forrás</strong>';return;}
    if(src.exportAllowed){
      el.innerHTML=`<div class="ka-policy-ok"><strong>✓ EXPORTÁLHATÓ FORRÁS</strong><span>${esc(src.license||'Engedélyezett forrás')}</span>${src.licenseUrl?`<a href="${esc(src.licenseUrl)}" target="_blank" rel="noopener">Licenc</a>`:''}</div>`;
    }else{
      el.innerHTML=`<div class="ka-policy-blocked"><strong>🔒 CSAK MEGJELENÍTÉS</strong><span>${esc(src.reason)}</span><small>GeoTIFF export ehhez a forráshoz le van tiltva a jogszerű használat védelmében.</small></div>`;
    }
    const btn=$('kaRasterExport'); if(btn) btn.disabled=!src.exportAllowed;
  }
  function addLicensedSource(){
    const name=prompt('Forrás neve (pl. Saját ortofotó)'); if(!name)return;
    const template=prompt('XYZ tile URL sablon: https://.../{z}/{x}/{y}.png'); if(!template || !/\{z\}|\{x\}|\{y\}/.test(template)){ alert('Érvénytelen XYZ URL sablon.'); return; }
    const permission=prompt('Milyen jogalapon exportálható? (pl. saját szerver / szolgáltatói offline licenc)'); if(!permission)return;
    const license=prompt('Licenc megnevezése'); if(!license)return;
    const licenseUrl=prompt('Licenc URL (opcionális)')||'';
    const attribution=prompt('Kötelező forrásmegjelölés (opcionális)')||'';
    const id=Date.now().toString(36);
    state.licensedSources.push({id,name,template,permission,license,licenseUrl,attribution});
    saveLicensedSources(); populateLayers(); const sel=$('kaRasterLayer'); if(sel) sel.value='licensed:'+id; updatePolicy(); updateSummary();
  }
  function populateZoom(){
    const sel=$('kaRasterZoom'); if(!sel || sel.options.length) return;
    for(let z=8;z<=19;z++) sel.insertAdjacentHTML('beforeend',`<option value="${z}" ${z===15?'selected':''}>Zoom ${z}</option>`);
  }
  function selectionOverlay(show){
    let el=document.getElementById('kaRasterSelectionGuide');
    if(show){
      if(!el){
        el=document.createElement('div'); el.id='kaRasterSelectionGuide'; el.className='ka-raster-selection-guide';
        el.innerHTML='<div><strong>▣ TERÜLET KIJELÖLÉSE</strong><span>Húzd ki a téglalapot a térképen. A rendszer automatikusan a kijelölt terület koordinátáit használja.</span><button id="kaRasterCancelSelection" type="button">Mégse</button></div>';
        document.body.appendChild(el);
        document.getElementById('kaRasterCancelSelection').onclick=()=>{ stopDraw(false); selectionOverlay(false); const modal=$('kaRasterExportModal'); if(modal) modal.classList.add('is-open'); };
      }
      el.classList.add('is-visible');
      const modal=$('kaRasterExportModal'); if(modal) modal.classList.remove('is-open');
      document.body.classList.add('ka-raster-selecting');
    }else{
      if(el) el.classList.remove('is-visible');
      document.body.classList.remove('ka-raster-selecting');
    }
  }
  function startDraw(){
    const m=mapObj(); if(!m || !window.L) return;
    stopDraw(false);
    state.drawing=new L.Draw.Rectangle(m,{shapeOptions:{color:'#b88935',weight:2,fillOpacity:.14}});
    state.drawing.enable();
    selectionOverlay(true);
    const handler=e=>{
      if(state.drawing){ state.drawing.disable(); state.drawing=null; }
      m.off(L.Draw.Event.CREATED,handler);
      selectionOverlay(false);
      setPolygon(e.layer);
      const modal=$('kaRasterExportModal'); if(modal) modal.classList.add('is-open');
    };
    m.on(L.Draw.Event.CREATED,handler);
  }
  function stopDraw(remove){ const m=mapObj(); if(state.drawing){try{state.drawing.disable();}catch(e){} state.drawing=null;} if(remove && state.polygon && m){m.removeLayer(state.polygon);state.polygon=null;} }
  function setPolygon(layer){
    const m=mapObj(); if(state.polygon && m) m.removeLayer(state.polygon); state.polygon=layer; layer.addTo(m);
    const b=layer.getBounds();
    $('kaRasterNorth').value=b.getNorth().toFixed(7); $('kaRasterSouth').value=b.getSouth().toFixed(7); $('kaRasterEast').value=b.getEast().toFixed(7); $('kaRasterWest').value=b.getWest().toFixed(7);
    $('kaRasterStatus').textContent=`Téglalap kijelölve · É ${b.getNorth().toFixed(7)} · D ${b.getSouth().toFixed(7)} · K ${b.getEast().toFixed(7)} · Ny ${b.getWest().toFixed(7)}`;
    updateSummary();
  }
  function clearSelection(){ const m=mapObj(); if(state.polygon&&m)m.removeLayer(state.polygon); state.polygon=null; ['kaRasterNorth','kaRasterSouth','kaRasterEast','kaRasterWest'].forEach(id=>$(id).value=''); $('kaRasterStatus').textContent='Nincs kijelölt téglalap.'; updateSummary(); }
  function bbox(){
    const n=parseFloat($('kaRasterNorth').value),s=parseFloat($('kaRasterSouth').value),e=parseFloat($('kaRasterEast').value),w=parseFloat($('kaRasterWest').value);
    if([n,s,e,w].every(Number.isFinite) && n>s && e>w) return {north:n,south:s,east:e,west:w}; return null;
  }
  function polygonRings(){
    if(!state.polygon) return null;
    const rings=state.polygon.getLatLngs();
    const first=Array.isArray(rings[0])?rings[0]:rings;
    return [first.map(p=>[p.lat,p.lng])];
  }
  function tileXY(lat,lng,z){
    const n=Math.pow(2,z), x=(lng+180)/360*n, latR=clamp(lat,-85.05112878,85.05112878)*Math.PI/180, y=(1-Math.asinh(Math.tan(latR))/Math.PI)/2*n; return {x,y};
  }
  function urlFor(layer,z,x,y){
    if(layer && typeof layer.getTileUrl==='function') return layer.getTileUrl({x,y,z});
    if(layer && layer.template) return layer.template.replaceAll('{z}',z).replaceAll('{x}',x).replaceAll('{y}',y);
    return layer && layer._url ? layer._url.replaceAll('{z}',z).replaceAll('{x}',x).replaceAll('{y}',y) : null;
  }
  function updateSummary(){
    const b=bbox(), z=parseInt($('kaRasterZoom').value||15,10); if(!b){$('kaRasterSummary').textContent='Nincs kijelölt terület.';return;}
    const a=tileXY(b.north,b.west,z), c=tileXY(b.south,b.east,z), tx=Math.floor(c.x)-Math.floor(a.x)+1, ty=Math.floor(c.y)-Math.floor(a.y)+1, pixels=tx*256*ty*256;
    $('kaRasterSummary').textContent=`${b.south.toFixed(5)} … ${b.north.toFixed(5)} N · ${b.west.toFixed(5)} … ${b.east.toFixed(5)} E · ${tx*ty} csempe · kb. ${Math.round(pixels/1000000)} MP`; 
  }
  function setProgress(v){ const p=$('kaRasterProgressBar'); if(p)p.style.width=`${Math.round(v*100)}%`; }
  function msg(t,err){ const el=$('kaRasterMessage'); if(el){el.textContent=t;el.className='ka-raster-message '+(err?'error':'');} }
  async function fetchTile(url){
    const r=await fetch(url,{mode:'cors',credentials:'omit'}); if(!r.ok) throw new Error(`HTTP ${r.status}`); const blob=await r.blob(); return await createImageBitmap(blob);
  }
  function polygonPath(ctx,rings,ox,oy,z,b,canvasW,canvasH){
    const northTile=tileXY(b.north,b.west,z); const minX=Math.floor(northTile.x), minY=Math.floor(northTile.y);
    if(!rings){ctx.rect(0,0,canvasW,canvasH);return;}
    for(const ring of rings){ if(!ring.length)continue; const p0=tileXY(ring[0][0],ring[0][1],z); ctx.moveTo(p0.x*256-minX*256-ox,p0.y*256-minY*256-oy); for(let i=1;i<ring.length;i++){const p=tileXY(ring[i][0],ring[i][1],z);ctx.lineTo(p.x*256-minX*256-ox,p.y*256-minY*256-oy);} ctx.closePath(); }
  }
  async function buildCanvas(){
    const b=bbox(); if(!b) throw new Error('Adj meg egy érvényes polygon-t vagy koordináta-téglalapot.');
    const z=parseInt($('kaRasterZoom').value,10), src=selectedSource(); if(!src) throw new Error('A kiválasztott forrás nem érhető el.'); if(!src.exportAllowed) throw new Error('Ehhez a térképszolgáltatáshoz az Atlasz nem enged GeoTIFF-exportot. Válassz saját vagy kifejezetten export/offline használatra engedélyezett XYZ-forrást.'); const layer=src.layer||src;
    const nw=tileXY(b.north,b.west,z), se=tileXY(b.south,b.east,z), minX=Math.floor(nw.x), minY=Math.floor(nw.y), maxX=Math.floor(se.x), maxY=Math.floor(se.y);
    const fullW=(maxX-minX+1)*256, fullH=(maxY-minY+1)*256; const MAX=60000000; if(fullW*fullH>MAX) throw new Error('A kijelölt terület ezen a zoomon túl nagy. Válassz kisebb területet vagy alacsonyabb zoomot.');
    const cropX=Math.floor((nw.x-minX)*256), cropY=Math.floor((nw.y-minY)*256), cropW=Math.ceil((se.x-minX)*256)-cropX, cropH=Math.ceil((se.y-minY)*256)-cropY;
    const canvas=document.createElement('canvas'); canvas.width=Math.max(1,cropW); canvas.height=Math.max(1,cropH); const ctx=canvas.getContext('2d',{alpha:true});
    ctx.save(); ctx.beginPath(); polygonPath(ctx,polygonRings(),cropX,cropY,z,b,canvas.width,canvas.height); ctx.clip('evenodd');
    const total=(maxX-minX+1)*(maxY-minY+1); let done=0;
    for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++){
      const url=urlFor(layer,z,x,y); if(!url) throw new Error('A forrás réteg nem rendelkezik exportálható tile URL-lel.');
      try{const img=await fetchTile(url); ctx.drawImage(img,x*256-minX*256-cropX,y*256-minY*256-cropY,256,256); img.close&&img.close();}catch(e){throw new Error(`A csempe nem tölthető be. A szolgáltató CORS/letöltési korlátozása megakadályozta az exportot.`);}
      done++; setProgress(done/total);
    }
    ctx.restore(); return {canvas,b,z,resolution:(se.x-nw.x)*256/cropW};
  }
  function tiffRGBA(canvas,b,z,crs){
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data, w=canvas.width,h=canvas.height, entries=[];
    const align=n=> (n+1)&~1; let offset=8;
    const ifdCount=17; const ifdSize=2+ifdCount*12+4; let extra=align(offset+ifdSize); const bitsOff=extra; extra+=8; const sampleOff=extra; extra+=8; const xresOff=align(extra);extra+=8; const yresOff=align(extra);extra+=8; const scaleOff=align(extra);extra+=24; const tieOff=align(extra);extra+=48; const geoOff=align(extra); const geo=[1,1,0,3,1024,0,1,1,1025,0,1,1,3072,0,1,crs]; extra+=geo.length*2; const pixelOff=align(extra); const bytes=w*h*4; extra+=bytes;
    const buf=new ArrayBuffer(extra), dv=new DataView(buf), u8=new Uint8Array(buf); const E=[]; const add=(tag,type,count,val)=>E.push([tag,type,count,val]);
    add(256,4,1,w);add(257,4,1,h);add(258,3,4,bitsOff);add(259,3,1,1);add(262,3,1,2);add(273,4,1,pixelOff);add(277,3,1,4);add(278,4,1,h);add(279,4,1,bytes);add(282,5,1,xresOff);add(283,5,1,yresOff);add(284,3,1,1);add(338,3,1,2);add(339,3,4,sampleOff);add(33550,12,3,scaleOff);add(33922,12,6,tieOff);add(34735,3,geo.length,geoOff);
    let p=0; dv.setUint16(p,0x4949,true);p+=2;dv.setUint16(p,42,true);p+=2;dv.setUint32(p,8,true);p=8;dv.setUint16(p,E.length,true);p+=2;
    for(const [tag,type,count,val] of E){dv.setUint16(p,tag,true);dv.setUint16(p+2,type,true);dv.setUint32(p+4,count,true);if((type===3&&count===1)|| (type===4&&count===1)){if(type===3)dv.setUint16(p+8,val,true);else dv.setUint32(p+8,val,true);}else dv.setUint32(p+8,val,true);p+=12;}dv.setUint32(p,0,true);
    const putU16=(o,a)=>a.forEach((v,i)=>dv.setUint16(o+i*2,v,true)); putU16(bitsOff,[8,8,8,8]); putU16(sampleOff,[1,1,1,1]);
    dv.setUint32(xresOff,72,true);dv.setUint32(xresOff+4,1,true);dv.setUint32(yresOff,72,true);dv.setUint32(yresOff+4,1,true);
    const btm=tileXY(b.north,b.west,z), sec=tileXY(b.south,b.east,z), scaleX=(sec.x-btm.x)*256/w, scaleY=(sec.y-btm.y)*256/h; const WORLD=40075016.68557849, WORLD_PX=256*Math.pow(2,z), mpp=WORLD/WORLD_PX; dv.setFloat64(scaleOff,mpp,true);dv.setFloat64(scaleOff+8,mpp,true);dv.setFloat64(scaleOff+16,0,true);
    const worldPxX=btm.x*256, worldPxY=btm.y*256, worldX=worldPxX*mpp-WORLD/2, worldY=WORLD/2-worldPxY*mpp; dv.setFloat64(tieOff,0,true);dv.setFloat64(tieOff+8,0,true);dv.setFloat64(tieOff+16,0,true);dv.setFloat64(tieOff+24,worldX,true);dv.setFloat64(tieOff+32,worldY,true);dv.setFloat64(tieOff+40,0,true); putU16(geoOff,geo);
    u8.set(data,pixelOff); return buf;
  }
  async function saveGeoTiff(blob, filename){
    // Chromium/Edge: offer the Documents folder as the initial save location.
    if(window.showSaveFilePicker){
      const handle=await window.showSaveFilePicker({
        suggestedName:filename,
        startIn:'documents',
        types:[{description:'GeoTIFF raszter',accept:{'image/tiff':['.tif','.tiff']}}]
      });
      const writable=await handle.createWritable();
      await writable.write(blob); await writable.close();
      return 'A GeoTIFF elmentve a kiválasztott helyre.';
    }
    // Fallback: normal browser download. The browser's Downloads/save settings decide the folder.
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    return 'A böngésző letöltésként mentette a GeoTIFF-et. A mappát a böngésző letöltési beállításai határozzák meg.';
  }

  async function exportRaster(){
    const src=selectedSource(); if(!src || !src.exportAllowed){ msg('Ez a forrás csak megjelenítésre használható; GeoTIFF-export le van tiltva.',true); return; }
    if(state.busy)return; state.busy=true; setProgress(0); msg('Csempék letöltése és összeillesztése…'); $('kaRasterExport').disabled=true;
    try{const r=await buildCanvas(); const crs=3857; const buf=tiffRGBA(r.canvas,r.b,r.z,crs); const blob=new Blob([buf],{type:'image/tiff'}); const filename=`Karpatalja_Raster_${new Date().toISOString().slice(0,10)}_z${r.z}.tif`; const saved=await saveGeoTiff(blob,filename); msg(`Kész: ${r.canvas.width} × ${r.canvas.height} px, EPSG:3857 GeoTIFF. ${saved}`); }
    catch(e){msg(e.message||'Az export sikertelen.',true);} finally{state.busy=false;$('kaRasterExport').disabled=false;setProgress(0);}
  }
  window.KA_openRasterExport=open;
  window.KA_prepareRasterExport=function(){
    const m=mapObj(); if(!m)return; window.KA_RASTER_EXPORT_MAP=m;
  };
})();
