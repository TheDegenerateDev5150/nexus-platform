import { Plane } from "lucide-react";
import type {
    WorldPlugin,
    GeoEntity,
    TimeRange,
    PluginContext,
    LayerConfig,
    CesiumEntityOptions,
} from "@/core/plugins/PluginTypes";

// ERROR 1: wrong folder name — should be src/plugins/aviation/
// will be renamed in v04

export class AviationPlugin implements WorldPlugin {
    id = "aviation";
    name = "Aviation";
    description = "Real-time aircraft tracking via OpenSky Network";
    icon = Plane;
    category = "aviation" as const;
    version = "1.0.0";

    private context: PluginContext | null = null;

    async initialize(ctx: PluginContext): Promise<void> {
        this.context = ctx;
        console.log("[AviationPlugin] initialized");
    }

    destroy(): void {
        this.context = null;
    }

    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
        // TODO: wire up to /api/aviation
        return [];
    }

    getPollingInterval(): number {
        return 15000; // 15s
    }

    getLayerConfig(): LayerConfig {
        return {
            color: "#3b82f6",
            clusterEnabled: true,
            clusterDistance: 40,
            maxEntities: 5000,
        };
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        return {
            type: "billboard",
            iconUrl: "/plane-icon.svg",
            color: "#3b82f6",
            size: 8,
            rotation: entity.heading,
        };
    }
}
