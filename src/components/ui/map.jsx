import "maplibre-gl/dist/maplibre-gl.css";

import maplibregl from "maplibre-gl";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { MapContext } from "@/components/ui/mapContext.js";
import { osmRasterStyle } from "@/lib/mapStyles.js";

export const Map = forwardRef(function Map(
  { center, zoom = 13, styles, attribution = "OpenStreetMap", children, className = "", onReady },
  ref,
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const style = useMemo(() => getActiveStyle(styles), [styles]);

  useImperativeHandle(ref, () => mapRef.current, []);

  useEffect(() => {
    if (!containerRef.current || !center) return undefined;

    setIsLoaded(false);
    setLoadError("");
    let didFallbackToOsm = false;
    let didLoad = false;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: attribution,
      }),
      "bottom-right",
    );

    mapRef.current = map;
    setMapInstance(map);

    function handleLoad() {
      didLoad = true;
      setIsLoaded(true);
      setLoadError("");
      onReady?.(map);
    }

    function handleMapError() {
      if (!didLoad && !didFallbackToOsm && typeof style === "string") {
        didFallbackToOsm = true;
        map.setStyle(osmRasterStyle);
        return;
      }

      if (!didLoad) {
        setLoadError("Map is having trouble loading.");
      }
    }

    map.once("load", handleLoad);
    map.on("error", handleMapError);

    return () => {
      map.off("error", handleMapError);
      try {
        map.remove();
      } catch {
        // MapLibre can throw if the WebGL context was already torn down during a fast remount.
      }
      mapRef.current = null;
      setMapInstance(null);
      setIsLoaded(false);
    };
  }, [attribution, center, onReady, style, zoom]);

  const contextValue = useMemo(() => ({ map: mapInstance, isLoaded }), [isLoaded, mapInstance]);

  return (
    <MapContext.Provider value={contextValue}>
      <div className={`relative overflow-hidden ${className}`}>
        <div ref={containerRef} className="h-full w-full" />
        {loadError && !isLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 p-4 text-center text-sm font-bold text-slate-500 backdrop-blur-sm">
            {loadError}
          </div>
        )}
        {children}
      </div>
    </MapContext.Provider>
  );
});

function getActiveStyle(styles) {
  if (!styles) return osmRasterStyle;
  if (typeof styles === "string") return styles;
  if (styles.light || styles.dark) {
    const prefersDark = document.documentElement.classList.contains("dark");
    return (prefersDark ? styles.dark : styles.light) || styles.light || styles.dark;
  }
  return styles;
}
