/*
 * Kárpátalja Atlas — Mapbox Outdoors basemap
 * Mapbox Outdoors is a terrain/outdoor focused style.
 * A public Mapbox token is required by Mapbox for the style tiles.
 * The token is stored locally in the browser only.
 */
(function(){
  const KEY="karpatalja_mapbox_public_token";

  window.KA_getMapboxToken=function(){
    return localStorage.getItem(KEY)||"";
  };

  window.KA_requestMapboxToken=function(){
    let token=window.KA_getMapboxToken();
    if(!token){
      token=window.prompt(
        "Mapbox public token szükséges az Outdoors térképhez.\n\n" +
        "A tokennek pk.-val kell kezdődnie. A token csak ezen a gépen, " +
        "a böngésző helyi tárhelyén kerül mentésre."
      )||"";
      token=token.trim();
      if(token) localStorage.setItem(KEY,token);
    }
    return token;
  };

  window.KA_createOutdoorsLayer=function(L){
    const token=window.KA_getMapboxToken();
    const layer=L.tileLayer(
      "https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}?access_token="+encodeURIComponent(token||"__MISSING_TOKEN__"),
      {
        maxZoom:22,
        tileSize:256,
        attribution:
          '&copy; Mapbox &copy; OpenStreetMap contributors'
      }
    );
    layer._kaOutdoors=true;
    return layer;
  };

  window.KA_prepareOutdoorsLayer=function(layer,map){
    if(!layer)return false;
    let token=window.KA_getMapboxToken();
    if(!token){
      token=window.KA_requestMapboxToken();
      if(!token)return false;
    }
    const url="https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}?access_token="+encodeURIComponent(token);
    try{
      layer.setUrl(url);
      if(!map.hasLayer(layer)) layer.addTo(map);
      return true;
    }catch(e){
      console.error("Outdoors basemap error",e);
      return false;
    }
  };
})();
