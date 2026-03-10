"use client";

import React, { useEffect, useRef } from "react";
import { Viewer } from "resium";
import { Ion } from "cesium";
import type { Viewer as CesiumViewer } from "cesium";

// IMPORTATION CRUCIALE : Charge les styles de base pour éviter le crash de rendu
import "cesium/Widgets/widgets.css";

// CONFIGURATION DU CHEMIN DES ASSETS (Fix Error 404)
if (typeof window !== "undefined") {
  // Dis à Cesium de chercher les assets dans /public/cesium/
  (window as any).CESIUM_BASE_URL = "/cesium";
  
  // Configuration du token Ion si présent
  if (process.env.NEXT_PUBLIC_CESIUM_TOKEN) {
    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
  }
}

export default function GlobeView() {
  const viewerRef = useRef<CesiumViewer | null>(null);

  // Cleanup on unmount pour éviter les fuites de mémoire WebGL
  useEffect(() => {
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Viewer
        full
        ref={(v) => {
          if (v?.cesiumElement) {
            viewerRef.current = v.cesiumElement;
          }
        }}
        // Désactivation des widgets inutiles pour une UI épurée "NEXUS"
        timeline={false}
        animation={false}
        homeButton={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        geocoder={false}
        infoBox={false}
        selectionIndicator={false}
        // Optimisation des performances
        requestRenderMode={true} 
      />
    </div>
  );
}