import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Image } from "react-native";
import WebView from "react-native-webview";
import { COLORS } from "../theme";
import { cityCoordinates } from "../lib/listingMeta";
import { osmRasterStyle, getMapTilerStyle } from "../lib/mapStyles";
import { withFallbackRoomCoordinates } from "../lib/mapFallbackCoordinates";
import { mapTilerApiKey, openRouteServiceApiKey, getMapTilerStyleUrl, getRouteGeoJson, isValidCoordinate } from "../lib/mapServices";

// Try to load react-native-maps lazily; fallback to static map if unavailable
let MapView = null;
let Marker = null;
let PROVIDER_GOOGLE = null;
try {
  const maps = require("react-native-maps");
  MapView = maps.default || maps.MapView;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch (_) {
  // react-native-maps not installed – will use static fallback
}

function getCityFallback(city) {
  if (!city) return null;
  const k = String(city).trim().toLowerCase();
  for (const [name, coords] of Object.entries(cityCoordinates)) {
    if (name.toLowerCase() === k) return { latitude: coords[1], longitude: coords[0] };
  }
  return null;
}

function getRoomCoords(room) {
  // Mirrors website RoomLocationMap.getRoomCoordinates
  if (Array.isArray(room?.geoCoordinates) && room.geoCoordinates.length === 2) {
    const [lng, lat] = room.geoCoordinates.map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) return { latitude: lat, longitude: lng };
  }
  if (room?.location?.type === "Point" && Array.isArray(room.location.coordinates)) {
    const [lng, lat] = room.location.coordinates.map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) return { latitude: lat, longitude: lng };
  }
  // Some API shapes: location.coordinates plain array
  if (Array.isArray(room?.location?.coordinates) && room.location.coordinates.length === 2) {
    const [lng, lat] = room.location.coordinates.map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) return { latitude: lat, longitude: lng };
  }
  return null;
}

export function resolveMapCenter(room) {
  const rc = getRoomCoords(room);
  if (rc) return rc;
  const cc = getCityFallback(room?.city || room?.state);
  if (cc) return cc;
  // fallback to Bhopal
  return { latitude: 23.2599, longitude: 77.4126 };
}

export default function RoomMapView({ room, onOpenInMaps }) {
  const center = useMemo(() => resolveMapCenter(room), [room]);
  const roomCoords = useMemo(() => getRoomCoords(room), [room]);
  const hasExact = Boolean(roomCoords);
  const [zoomLevel, setZoomLevel] = useState(14);
  const delta = useMemo(() => {
    // approx degrees for zoom level
    const z = Math.max(10, Math.min(18, zoomLevel));
    // delta ~ 0.05 at zoom 14, inverse exp
    return 0.06 * Math.pow(1.7, 14 - z);
  }, [zoomLevel]);

  const handleOpenMaps = useCallback(() => {
    if (onOpenInMaps) return onOpenInMaps();
    if (roomCoords) {
      const q = `${roomCoords.latitude},${roomCoords.longitude}`;
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    } else if (room?.address || room?.city) {
      const q = encodeURIComponent(room.address || room.city);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    }
  }, [roomCoords, room, onOpenInMaps]);

  // Native MapView needs Google Maps API key on Android — in Expo Go it shows grey tiles.
  // Force static fallback (website parity) until API key configured in app.json.
  const USE_NATIVE_MAP = false;
  if (USE_NATIVE_MAP && MapView && Marker) {
    const region = {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
    return (
      <View style={styles.mapContainer}>
        <MapView
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={region}
          region={region}
          scrollEnabled
          zoomEnabled
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={center} title={room?.title || room?.city} description={room?.address || room?.location || ""} />
        </MapView>

        {/* Zoom controls overlay – parity with website MapLibre +/- */}
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomLevel((z) => Math.min(18, z + 1))}>
            <Text style={styles.zoomText}>＋</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomLevel((z) => Math.max(10, z - 1))}>
            <Text style={styles.zoomText}>－</Text>
          </TouchableOpacity>
        </View>

        {/* Top badge mirroring website MapLibre label */}
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeTitle}>{hasExact ? "Exact location" : "Area location"}</Text>
          <Text style={styles.topBadgeSub}>{room?.city || "City"} · {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}</Text>
        </View>

        {/* Coordinates pill + open maps */}
        <View style={styles.bottomBar}>
          <Text style={styles.coordText}>{center.latitude.toFixed(5)}, {center.longitude.toFixed(5)} {hasExact ? "• GPS pinned" : "• City center"}</Text>
          <TouchableOpacity style={styles.mapsLink} onPress={handleOpenMaps}>
            <Text style={styles.mapsLinkText}>Open in Google Maps ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Real MapTiler tiles — same as website src/components/MapLibreRoomMap.jsx (beige streets + popup)
  // Unified via mapServices (EXPO_PUBLIC_ env). Falls back to OSM raster style if key missing.
  const MAPTILER_KEY = mapTilerApiKey || "";
  const ORS_KEY = openRouteServiceApiKey || "";
  const mapTilerStyleUrl = getMapTilerStyleUrl("streets-v2");
  const fallbackTile = osmRasterStyle.sources["osm-raster"].tiles[0];
  const popupHtml = `
    <div style="font-family:Inter,sans-serif;width:260px;padding:0;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 32px rgba(15,23,42,0.18)">
      <img src="${(room?.coverImage || room?.images?.[0] || 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80')}" style="width:100%;height:140px;object-fit:cover" />
      <div style="padding:10px">
        <div style="display:flex;align-items:center;gap:6"><span style="background:#f3f0ff;color:#7c3aed;font-size:10px;font-weight:900;padding:2px 8px;border-radius:20px;text-transform:uppercase">${room?.type || 'Flat'}</span><span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:800;padding:2px 6px;border-radius:12px">★★★★★ No reviews yet</span></div>
        <div style="color:#7c3aed;font-weight:900;margin-top:6">₹${Number(room?.price||16775).toLocaleString('en-IN')}<span style="color:#64748b;font-size:11px;font-weight:600">/MONTH</span></div>
        <div style="font-size:13px;font-weight:800;color:#0f172a;margin-top:4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${room?.locationLabel || room?.address || room?.city || 'Market Square, Gaya'}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2">${(room?.amenities||['Kitchen','Parking','Balcony']).slice(0,3).join(' • ')}</div>
        <div style="color:#2563eb;font-size:11px;font-weight:800;margin-top:4">📍 ${room?.distance || '650 m away'}</div>
        <div style="background:#0f172a;color:#fff;text-align:center;padding:10px;border-radius:12px;font-weight:900;margin-top:8">View Details</div>
      </div>
    </div>`;
  const escPopup = popupHtml.replace(/"/g, '&quot;').replace(/\n/g, '');
  const tileUrl = MAPTILER_KEY ? `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${MAPTILER_KEY}` : fallbackTile;
  const leafletHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>html,body,#map{height:100%;margin:0;padding:0;background:#f5f1e6;} .leaflet-popup-content-wrapper{border-radius:16px;padding:0;overflow:hidden;} .leaflet-popup-content{margin:0;width:260px !important;}</style>
    </head><body><div id="map"></div><script>
      var map=L.map('map',{zoomControl:false}).setView([${center.latitude},${center.longitude}],14);
      L.tileLayer('${tileUrl}',{maxZoom:20, attribution:'© MapTiler © OpenStreetMap'}).addTo(map);
      var roomLat=${center.latitude}, roomLng=${center.longitude};
      var marker=L.marker([roomLat,roomLng],{icon:L.divIcon({html:'<div style="background:#0f172a;color:#fff;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.2)"></div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(map);
      marker.bindPopup("${escPopup}",{maxWidth:280}).openPopup();
      var routeLine=null;
      function showRoute(userLat,userLng){
        var orsKey='${ORS_KEY}';
        fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson',{method:'POST',headers:{'Authorization':orsKey,'Content-Type':'application/json'},body:JSON.stringify({coordinates:[[userLng,userLat],[roomLng,roomLat]]})}).then(r=>r.json()).then(j=>{
          if(j.features && j.features[0] && j.features[0].geometry){
            if(routeLine) map.removeLayer(routeLine);
            routeLine=L.geoJSON(j.features[0].geometry,{style:{color:'#2563eb',weight:5,opacity:0.9}}).addTo(map);
            map.fitBounds(routeLine.getBounds(),{padding:[20,20]});
          }
        }).catch(e=>{ console.log('route fail',e); });
      }
      // try to get user location for Route
      var ctrl=L.control({position:'topleft'}); ctrl.onAdd=function(){
        var d=L.DomUtil.create('div'); 
        d.innerHTML='<div style="background:#fff;border-radius:20px;padding:4px;display:flex;gap:6;box-shadow:0 4px 12px rgba(0,0,0,0.1)"><button id="routeBtn" style="background:#0f172a;color:#fff;border:0;border-radius:16px;padding:8px 14px;font-weight:800">◉ Route</button><button id="fullBtn" style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:8px 14px;font-weight:800">⤢ Full map</button></div>'; 
        return d;
      }; ctrl.addTo(map);
      setTimeout(function(){
        var rb=document.getElementById('routeBtn');
        if(rb) rb.onclick=function(){
          if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(function(pos){
              var uLat=pos.coords.latitude, uLng=pos.coords.longitude;
              L.marker([uLat,uLng],{icon:L.divIcon({html:'<div style="background:#2563eb;width:14px;height:14px;border-radius:7px;border:2px solid #fff"></div>',iconSize:[14,14]})}).addTo(map);
              showRoute(uLat,uLng);
            }, function(){ alert('Location permission denied'); });
          } else { alert('Geolocation not supported'); }
        };
        var fb=document.getElementById('fullBtn');
        if(fb) fb.onclick=function(){ window.open('https://www.openstreetmap.org/#map=14/'+roomLat+'/'+roomLng,'_blank'); };
      },500);
      L.control.zoom({position:'topright'}).addTo(map);
    </script></body></html>`;

  return (
    <View style={styles.mapContainer}>
      <WebView
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        source={{ html: leafletHtml, baseUrl: 'https://api.maptiler.com' }}
        style={{ flex: 1, backgroundColor: '#f5f1e6' }}
        onMessage={(e)=>{ const z=Number(e.nativeEvent.data); if(!isNaN(z)) setZoomLevel(z); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: { height: 440, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#f5f1e6", position: "relative" },
  map: { flex: 1 },
  mapImageWrap: { flex: 1, backgroundColor: "#dbeafe", position: "relative", overflow: "hidden" },
  mapImage: { flex: 1, width: "100%", height: "100%" },
  styledMapBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#eff6ff" },
  streetH: { position: "absolute", left: 0, right: 0, height: 6, backgroundColor: "#ffffff", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#cbd5e1", opacity: 0.9 },
  streetV: { position: "absolute", top: 0, bottom: 0, width: 6, backgroundColor: "#ffffff", borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#cbd5e1", opacity: 0.9 },
  block: { position: "absolute", borderRadius: 4, borderWidth: 1, borderColor: "#94a3b8", opacity: 0.7 },
  mapCenterPin: { position: "absolute", top: "50%", left: "50%", marginTop: -22, marginLeft: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.brand, shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  mapCenterPinIcon: { fontSize: 18 },
  zoomOverlay: { position: "absolute", right: 10, top: 10, gap: 6 },
  zoomBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  zoomText: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  topBadge: { position: "absolute", left: 10, top: 10, backgroundColor: "rgba(255,255,255,0.96)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  topBadgeTitle: { fontSize: 10, fontWeight: "900", color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.6 },
  topBadgeSub: { fontSize: 10, fontWeight: "700", color: "#64748b", marginTop: 2 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.96)", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  coordText: { color: "#e2e8f0", fontSize: 10, fontWeight: "700", flex: 1 },
  mapsLink: { backgroundColor: "#fff", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  mapsLinkText: { color: "#0f172a", fontSize: 11, fontWeight: "900" },
  // static
  staticBg: { flex: 1, backgroundColor: "#dbeafe", position: "relative", justifyContent: "center", alignItems: "center" },
  gridWrap: { ...StyleSheet.absoluteFillObject },
  gridV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(148,163,184,0.35)" },
  gridH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(148,163,184,0.35)" },
  staticAreaLabel: { position: "absolute", top: 46, alignSelf: "center", backgroundColor: "#fff", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  staticAreaText: { fontSize: 11, fontWeight: "900", color: "#0f172a" },
  staticAreaSub: { fontSize: 10, fontWeight: "600", color: "#64748b", marginTop: 2 },
  staticPinWrap: { alignItems: "center", justifyContent: "center" },
  pinShadow: { width: 22, height: 10, borderRadius: 11, backgroundColor: "rgba(15,23,42,0.15)", marginBottom: -6 },
  pinHead: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#7c3aed", shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  pinIcon: { fontSize: 22 },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#7c3aed", borderWidth: 2, borderColor: "#fff", marginTop: -6 },
  coordPill: { marginTop: 8, backgroundColor: "#0f172a", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  coordPillText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  staticTopLeft: { position: "absolute", left: 10, top: 10, backgroundColor: "rgba(255,255,255,0.96)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  staticTopLeftTitle: { fontSize: 10, fontWeight: "900", color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.6 },
  staticTopLeftSub: { fontSize: 10, fontWeight: "700", color: "#64748b", marginTop: 2 },
});
