// wip: monolithic store — everything in one file for now
// TODO: split into slices
import { create } from "zustand";

// ─── Globe State ──────────────────────────────────────────────
interface GlobeState {
  cameraAltitude: number;
  cameraLat: number;
  cameraLon: number;
  isAnimating: boolean;
  terrainEnabled: boolean;
  atmosphereEnabled: boolean;
  setCameraPosition: (lat: number, lon: number, alt: number) => void;
  setTerrainEnabled: (v: boolean) => void;
  setAtmosphereEnabled: (v: boolean) => void;
}

// ─── Layer State ──────────────────────────────────────────────
interface LayerEntry {
  pluginId: string;
  enabled: boolean;
  opacity: number;
  entityCount: number;
}

interface LayersState {
  layers: Record<string, LayerEntry>;
  setLayerEnabled: (pluginId: string, enabled: boolean) => void;
  setLayerOpacity: (pluginId: string, opacity: number) => void;
  setEntityCount: (pluginId: string, count: number) => void;
  registerLayer: (pluginId: string) => void;
}

// ─── Timeline State ───────────────────────────────────────────
interface TimelineState {
  timeWindow: "1h" | "6h" | "24h" | "48h" | "7d";
  isLive: boolean;
  currentTime: Date;
  setTimeWindow: (w: "1h" | "6h" | "24h" | "48h" | "7d") => void;
  setLive: (live: boolean) => void;
}

// ─── UI State ─────────────────────────────────────────────────
interface UIState {
  sidebarOpen: boolean;
  activePanelId: string | null;
  selectedEntityId: string | null;
  setSidebarOpen: (v: boolean) => void;
  setActivePanelId: (id: string | null) => void;
  setSelectedEntityId: (id: string | null) => void;
}

// ─── Data Config ─────────────────────────────────────────────
interface DataConfig {
  pollingIntervals: Record<string, number>;
  cacheMaxAge: number;
  maxEntitiesPerPlugin: number;
}

interface DataConfigState {
  dataConfig: DataConfig;
  setPollingInterval: (pluginId: string, ms: number) => void;
}

// ─── Combined Store ───────────────────────────────────────────
type AppStore = GlobeState & LayersState & TimelineState & UIState & DataConfigState;

export const useStore = create<AppStore>((set, get) => ({
  // Globe
  cameraAltitude: 15000000,
  cameraLat: 20,
  cameraLon: 0,
  isAnimating: false,
  terrainEnabled: false,
  atmosphereEnabled: true,
  setCameraPosition: (lat, lon, alt) => set({ cameraLat: lat, cameraLon: lon, cameraAltitude: alt }),
  setTerrainEnabled: (v) => set({ terrainEnabled: v }),
  setAtmosphereEnabled: (v) => set({ atmosphereEnabled: v }),

  // Layers
  layers: {},
  setLayerEnabled: (pluginId, enabled) =>
    set((s) => ({
      layers: { ...s.layers, [pluginId]: { ...s.layers[pluginId], enabled } },
    })),
  setLayerOpacity: (pluginId, opacity) =>
    set((s) => ({
      layers: { ...s.layers, [pluginId]: { ...s.layers[pluginId], opacity } },
    })),
  setEntityCount: (pluginId, entityCount) =>
    set((s) => ({
      layers: { ...s.layers, [pluginId]: { ...s.layers[pluginId], entityCount } },
    })),
  registerLayer: (pluginId) =>
    set((s) => {
      if (s.layers[pluginId]) return s;
      return {
        layers: {
          ...s.layers,
          [pluginId]: { pluginId, enabled: false, opacity: 1, entityCount: 0 },
        },
      };
    }),

  // Timeline
  timeWindow: "24h",
  isLive: true,
  currentTime: new Date(),
  setTimeWindow: (timeWindow) => set({ timeWindow }),
  setLive: (isLive) => set({ isLive }),

  // UI
  sidebarOpen: true,
  activePanelId: null,
  selectedEntityId: null,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setActivePanelId: (id) => set({ activePanelId: id }),
  setSelectedEntityId: (id) => set({ selectedEntityId: id }),

  // Data config
  dataConfig: {
    pollingIntervals: {},
    cacheMaxAge: 3600000,
    maxEntitiesPerPlugin: 5000,
  },
  setPollingInterval: (pluginId, ms) =>
    set((s) => ({
      dataConfig: {
        ...s.dataConfig,
        pollingIntervals: { ...s.dataConfig.pollingIntervals, [pluginId]: ms },
      },
    })),
}));
