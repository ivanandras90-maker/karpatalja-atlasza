
/* V19 — display uploaded GeoJSON filename without extension.
   The original filename remains stored internally for data/source tracking. */
(function(){
"use strict";
window.AtlasDisplayName=function(filename){
  if(typeof filename!=="string") return "GeoJSON";
  return filename.replace(/\.(geojson|json)$/i,"");
};
})();
