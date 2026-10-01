import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Compass,
  Eye,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  X,
  Sparkles,
  Info,
} from "lucide-react";

/**
 * High-performance, full-sphere 360° equirectangular room panorama viewer.
 * Supports mouse drag, touch drag, pinch zoom, auto-rotation, fullscreen,
 * and switching between multiple room panorama angles.
 */
export default function RoomPanoramaViewer({
  panoramas = [],
  initialIndex = 0,
  title = "360° Room Virtual Tour",
  onClose,
  isModal = false,
}) {
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [yawAngle, setYawAngle] = useState(0);

  // Normalize list of panoramas (supports strings or objects with { url, label })
  const panoList = (Array.isArray(panoramas) && panoramas.length > 0
    ? panoramas
    : [
        {
          url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=3000&q=85",
          label: "Master Bedroom",
        },
      ]
  ).map((item, idx) => {
    if (typeof item === "string") {
      return { url: item, label: `View ${idx + 1}` };
    }
    return {
      url: item.url || item.image || item,
      label: item.label || item.title || `Room Angle ${idx + 1}`,
    };
  });

  const activePano = panoList[currentIndex] || panoList[0];

  // Three.js internal references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const sphereMeshRef = useRef(null);
  const animationFrameId = useRef(null);
  const isInteracting = useRef(false);
  const onPointerDownPointerX = useRef(0);
  const onPointerDownPointerY = useRef(0);
  const onPointerDownLon = useRef(0);
  const onPointerDownLat = useRef(0);
  const lon = useRef(0);
  const lat = useRef(0);
  const targetLon = useRef(0);
  const targetLat = useRef(0);
  const touchDistanceRef = useRef(0);

  // Setup Three.js scene once on mount
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    // 2. Sphere Geometry inverted for inside viewing
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    // Placeholder black material initially
    const material = new THREE.MeshBasicMaterial({ color: 0x0a0f1d });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    sphereMeshRef.current = mesh;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    // Clean any prior children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      if (autoRotate && !isInteracting.current) {
        targetLon.current += 0.08;
      }

      // Damped smooth camera movement
      lon.current += (targetLon.current - lon.current) * 0.12;
      lat.current += (targetLat.current - lat.current) * 0.12;
      lat.current = Math.max(-85, Math.min(85, lat.current));

      const phi = THREE.MathUtils.degToRad(90 - lat.current);
      const theta = THREE.MathUtils.degToRad(lon.current);

      camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
      camera.target.y = 500 * Math.cos(phi);
      camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);
      camera.lookAt(camera.target);

      // Normalize yaw for compass UI
      const currentYaw = Math.round(((lon.current % 360) + 360) % 360);
      setYawAngle(currentYaw);

      renderer.render(scene, camera);
    };

    animate();

    // 5. Resize observer
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load active panorama texture whenever currentIndex changes
  useEffect(() => {
    if (!activePano?.url || !sphereMeshRef.current) return;

    setLoading(true);
    setErrorMessage("");

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    loader.load(
      activePano.url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        if (sphereMeshRef.current) {
          const oldMaterial = sphereMeshRef.current.material;
          sphereMeshRef.current.material = new THREE.MeshBasicMaterial({ map: texture });
          if (oldMaterial) oldMaterial.dispose();
        }
        setLoading(false);
      },
      undefined,
      () => {
        setLoading(false);
        setErrorMessage("Failed to load 360° panorama image. Please check your network connection.");
      }
    );
  }, [activePano?.url]);

  // Pointer & Touch Interaction Handlers
  const handlePointerDown = (e) => {
    isInteracting.current = true;
    setShowHint(false);
    onPointerDownPointerX.current = e.clientX;
    onPointerDownPointerY.current = e.clientY;
    onPointerDownLon.current = targetLon.current;
    onPointerDownLat.current = targetLat.current;
  };

  const handlePointerMove = (e) => {
    if (!isInteracting.current) return;
    const deltaX = (e.clientX - onPointerDownPointerX.current) * 0.22;
    const deltaY = (e.clientY - onPointerDownPointerY.current) * 0.22;
    targetLon.current = onPointerDownLon.current - deltaX;
    targetLat.current = Math.max(-85, Math.min(85, onPointerDownLat.current + deltaY));
  };

  const handlePointerUp = () => {
    isInteracting.current = false;
  };

  // Touch handlers for mobile with pinch zoom
  const handleTouchStart = (e) => {
    setShowHint(false);
    if (e.touches.length === 1) {
      isInteracting.current = true;
      onPointerDownPointerX.current = e.touches[0].clientX;
      onPointerDownPointerY.current = e.touches[0].clientY;
      onPointerDownLon.current = targetLon.current;
      onPointerDownLat.current = targetLat.current;
    } else if (e.touches.length === 2) {
      isInteracting.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isInteracting.current) {
      const deltaX = (e.touches[0].clientX - onPointerDownPointerX.current) * 0.25;
      const deltaY = (e.touches[0].clientY - onPointerDownPointerY.current) * 0.25;
      targetLon.current = onPointerDownLon.current - deltaX;
      targetLat.current = Math.max(-85, Math.min(85, onPointerDownLat.current + deltaY));
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const diff = (newDist - touchDistanceRef.current) * 0.15;
      touchDistanceRef.current = newDist;
      adjustZoom(-diff);
    }
  };

  const handleTouchEnd = () => {
    isInteracting.current = false;
  };

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    adjustZoom(e.deltaY * 0.05);
  };

  const adjustZoom = (delta) => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const newFov = Math.max(35, Math.min(95, camera.fov + delta));
    camera.fov = newFov;
    camera.updateProjectionMatrix();
  };

  const resetOrientation = () => {
    targetLon.current = 0;
    targetLat.current = 0;
    if (cameraRef.current) {
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden bg-slate-950 text-white transition-all ${
        isModal
          ? "fixed inset-0 z-50 flex flex-col"
          : "rounded-3xl border border-slate-800 shadow-2xl"
      }`}
      style={!isModal ? { minHeight: "460px", height: "520px" } : {}}
    >
      {/* 360 WebGL Canvas Viewport */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      />

      {/* Top Bar: Title, Room Selector & Controls */}
      <div className="absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent p-4 backdrop-blur-xs sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-600/80 px-3 py-1 text-xs font-black tracking-wider text-white shadow-md">
            <Sparkles className="size-3.5" />
            360° VIRTUAL TOUR
          </span>
          <h2 className="hidden text-sm font-black text-white drop-shadow-sm sm:inline-block">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Compass Angle Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/80 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md">
            <Compass
              className="size-3.5 text-blue-400 transition-transform duration-100"
              style={{ transform: `rotate(${yawAngle}deg)` }}
            />
            <span>{yawAngle}°</span>
          </div>

          {/* Auto Rotate Toggle */}
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            title={autoRotate ? "Pause auto-rotation" : "Start auto-rotation"}
            className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-white transition-all hover:bg-slate-800 hover:scale-105"
          >
            {autoRotate ? <Pause className="size-4 text-blue-400" /> : <Play className="size-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-white transition-all hover:bg-slate-800 hover:scale-105"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          {/* Close Button (if modal) */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-rose-600/90 text-white transition-all hover:bg-rose-600 hover:scale-105"
              title="Close 360° Tour"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Side Zoom & Orientation Floating Controls */}
      <div className="absolute right-4 top-20 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => adjustZoom(-8)}
          title="Zoom In"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-slate-900/85 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110"
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(8)}
          title="Zoom Out"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-slate-900/85 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110"
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={resetOrientation}
          title="Reset Camera View"
          className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-slate-900/85 text-white shadow-lg backdrop-blur-md transition-transform hover:scale-110"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      {/* Interactive Drag Hint Overlay */}
      {showHint && !loading && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/80 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur-md animate-bounce">
            <Eye className="size-4 text-blue-400" />
            <span>Drag anywhere to look around (360° horizontal + ceiling & floor)</span>
          </div>
        </div>
      )}

      {/* Loading State Spinner */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm">
          <div className="size-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-300">
            Loading 360° room panorama...
          </p>
        </div>
      )}

      {/* Error Fallback State */}
      {errorMessage && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/90 p-6 text-center">
          <Info className="size-8 text-rose-500" />
          <p className="max-w-md text-sm font-bold text-slate-300">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setErrorMessage("");
            }}
            className="rounded-full bg-brand px-5 py-2 text-xs font-black text-white transition-transform hover:scale-105"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Bottom Angle / Room Selector Carousel */}
      {panoList.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center px-4">
          <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-white/15 bg-slate-950/85 p-1.5 shadow-2xl backdrop-blur-md">
            {panoList.map((item, idx) => {
              const active = idx === currentIndex;
              return (
                <button
                  key={`${item.url}-${idx}`}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                      : "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Eye className="size-3 text-blue-300" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
