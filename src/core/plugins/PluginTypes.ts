import type { ComponentType } from "react";

// ─── Categories ──────────────────────────────────────────────
export type PluginCategory =
    | "aviation"
    | "maritime"
    | "conflict"
    | "natural-disaster"
    | "infrastructure"
    | "cyber"
    | "economic"
    | "custom";

// ─── Time ────────────────────────────────────────────────────
export interface TimeRange {
    start: Date;
    end: Date;
}

export type TimeWindow = "1h" | "6h" | "24h" | "48h" | "7d";

// ─── Geo Entities ────────────────────────────────────────────
export interface GeoEntity {
    id: string;
    pluginId: string;
    latitude: number;
    longitude: number;
    altitude?: number;
    heading?: number;
    speed?: number;
    timestamp: Date;
    label?: string;
    properties: Record<string, unknown>;
}

// ─── Layer Config ────────────────────────────────────────────
export interface LayerConfig {
    color: string;
    iconUrl?: string;
    clusterEnabled: boolean;
    clusterDistance: number;
    minZoomLevel?: number;
    maxEntities?: number;
}

// ─── Cesium Entity Options ───────────────────────────────────
export interface CesiumEntityOptions {
    type: "billboard" | "point" | "polyline" | "polygon" | "label";
    color?: string;
    size?: number;
    iconUrl?: string;
    rotation?: number;
    outlineColor?: string;
    outlineWidth?: number;
    labelText?: string;
    labelFont?: string;
}

// ─── Plugin Context ──────────────────────────────────────────
export interface PluginContext {
    apiBaseUrl: string;
    timeRange: TimeRange;
    onDataUpdate: (entities: GeoEntity[]) => void;
    onError: (error: Error) => void;
}

// ─── World Plugin Interface ──────────────────────────────────
export interface WorldPlugin {
    id: string;
    name: string;
    description: string;
    icon: string | ComponentType<{ size?: number; color?: string }>;
    category: PluginCategory;
    version: string;

    initialize(ctx: PluginContext): Promise<void>;
    destroy(): void;
    fetch(timeRange: TimeRange): Promise<GeoEntity[]>;
    getPollingInterval(): number;
    getLayerConfig(): LayerConfig;
    renderEntity(entity: GeoEntity): CesiumEntityOptions;
}

// ─── Data Bus Event Types ────────────────────────────────────
export type DataBusEvents = {
    dataUpdated: { pluginId: string; entities: GeoEntity[] };
    entitySelected: { entity: GeoEntity | null };
    layerToggled: { pluginId: string; enabled: boolean };
    timeRangeChanged: { timeRange: TimeRange };
};
