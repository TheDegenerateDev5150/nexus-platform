"use client";

import React, { useEffect, useRef } from "react";
import { Viewer } from "resium";
import { Ion } from "cesium";
import type { Viewer as CesiumViewer } from "cesium";

// Set Cesium Ion token if provided
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_CESIUM_TOKEN) {
  Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
}

export default function GlobeView() {
  const viewerRef = useRef<CesiumViewer | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  return (
    <Viewer
      full
      ref={(v) => {
        if (v?.cesiumElement) {
          viewerRef.current = v.cesiumElement;
        }
      }}
      timeline={false}
      animation={false}
      homeButton={false}
      navigationHelpButton={false}
      sceneModePicker={false}
      baseLayerPicker={false}
      geocoder={false}
      infoBox={false}
      selectionIndicator={false}
    />
  );
}
