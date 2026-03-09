import { Moon } from "lucide-react";
import type {
  WorldPlugin, GeoEntity, TimeRange, PluginContext,
  LayerConfig, CesiumEntityOptions, FilterDefinition,
} from "@/core/plugins/PluginTypes";

interface NightlightAnomaly {
  id: string;
  lat: number;
  lng: number;
  zone: string;
  country: string;
  type: "BLACKOUT" | "SURGE" | "GRADUAL_DECLINE" | "RECOVERY";
  delta: number;
  baseline: number;
  current: number;
  radiusKm: number;
  affectedPopulation: number;
  confidence: number;
  possibleCause: string;
  nexusSignal: number;
  detectedAt: Date;
  durationDays: number;
}

const NIGHTLIGHT_DEMO: NightlightAnomaly[] = [
  {
    id: "nl-001", lat: 31.5, lng: 34.45, zone: "Gaza", country: "PS",
    type: "BLACKOUT", delta: -0.92, baseline: 8.4, current: 0.67,
    radiusKm: 50, affectedPopulation: 2100000,
    confidence: 0.96, possibleCause: "Infrastructure destruction — power grid 92% offline",
    nexusSignal: 0.96, detectedAt: new Date(Date.now() - 86400000 * 90), durationDays: 90,
  },
  {
    id: "nl-002", lat: 47.8, lng: 35.2, zone: "Zaporizhzhia", country: "UA",
    type: "GRADUAL_DECLINE", delta: -0.68, baseline: 22.1, current: 7.1,
    radiusKm: 80, affectedPopulation: 750000,
    confidence: 0.89, possibleCause: "Systematic missile strikes on energy infrastructure",
    nexusSignal: 0.89, detectedAt: new Date(Date.now() - 86400000 * 200), durationDays: 200,
  },
  {
    id: "nl-003", lat: 33.89, lng: 35.50, zone: "Dahieh — Beyrouth", country: "LB",
    type: "BLACKOUT", delta: -0.85, baseline: 14.2, current: 2.1,
    radiusKm: 30, affectedPopulation: 380000,
    confidence: 0.91, possibleCause: "IDF airstrikes on Hezbollah infrastructure",
    nexusSignal: 0.91, detectedAt: new Date(Date.now() - 86400000 * 45), durationDays: 45,
  },
  {
    id: "nl-004", lat: 39.01, lng: 125.73, zone: "Pyongyang", country: "KP",
    type: "SURGE", delta: +0.45, baseline: 1.2, current: 1.74,
    radiusKm: 40, affectedPopulation: 3000000,
    confidence: 0.72, possibleCause: "Unusual nighttime activity — possible military exercise or launch prep",
    nexusSignal: 0.78, detectedAt: new Date(Date.now() - 86400000 * 3), durationDays: 3,
  },
  {
    id: "nl-005", lat: 15.35, lng: 44.20, zone: "Sanaa", country: "YE",
    type: "GRADUAL_DECLINE", delta: -0.55, baseline: 11.8, current: 5.3,
    radiusKm: 60, affectedPopulation: 2900000,
    confidence: 0.84, possibleCause: "Prolonged conflict impact — fuel shortage + grid damage",
    nexusSignal: 0.80, detectedAt: new Date(Date.now() - 86400000 * 120), durationDays: 120,
  },
  {
    id: "nl-006", lat: 15.6, lng: 32.5, zone: "Khartoum", country: "SD",
    type: "BLACKOUT", delta: -0.77, baseline: 18.5, current: 4.3,
    radiusKm: 70, affectedPopulation: 6500000,
    confidence: 0.87, possibleCause: "SAF/RSF conflict — grid destruction, population displacement",
    nexusSignal: 0.87, detectedAt: new Date(Date.now() - 86400000 * 180), durationDays: 180,
  },
  {
    id: "nl-007", lat: 49.84, lng: 36.23, zone: "Kharkiv", country: "UA",
    type: "RECOVERY", delta: +0.28, baseline: 31.2, current: 18.4,
    radiusKm: 60, affectedPopulation: 1100000,
    confidence: 0.78, possibleCause: "Partial infrastructure reconstruction detected post-strike",
    nexusSignal: 0.60, detectedAt: new Date(Date.now() - 86400000 * 14), durationDays: 14,
  },
];

function anomalyToEntity(a: NightlightAnomaly): GeoEntity {
  return {
    id: a.id,
    pluginId: "nightlights",
    latitude: a.lat,
    longitude: a.lng,
    timestamp: a.detectedAt,
    label: a.zone,
    properties: {
      zone: a.zone,
      country: a.country,
      type: a.type,
      delta: a.delta,
      baseline: a.baseline,
      current: a.current,
      radiusKm: a.radiusKm,
      affectedPopulation: a.affectedPopulation,
      confidence: a.confidence,
      possibleCause: a.possibleCause,
      nexusSignal: a.nexusSignal,
      durationDays: a.durationDays,
    },
  };
}

const TYPE_COLORS: Record<NightlightAnomaly["type"], string> = {
  BLACKOUT:        "#dc2626",
  SURGE:           "#f59e0b",
  GRADUAL_DECLINE: "#f97316",
  RECOVERY:        "#4ade80",
};

export class NightlightsPlugin implements WorldPlugin {
  id = "nightlights";
  name = "Night Lights";
  description = "NASA Black Marble VIIRS delta anomalies — blackouts & surges";
  icon = Moon;
  category = "custom" as const;
  version = "1.0.0";

  private context: PluginContext | null = null;

  async initialize(ctx: PluginContext): Promise<void> {
    this.context = ctx;
  }

  destroy(): void {
    this.context = null;
  }

  async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
    try {
      const res = await fetch("/api/nightlights", {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.anomalies?.length) return data.anomalies.map(anomalyToEntity);
      }
    } catch {}

    return NIGHTLIGHT_DEMO.map(anomalyToEntity);
  }

  getPollingInterval(): number {
    return 86400000;
  }

  getLayerConfig(): LayerConfig {
    return {
      color: "#1e3a5f",
      clusterEnabled: false,
      clusterDistance: 0,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const type = entity.properties.type as NightlightAnomaly["type"];
    const delta = Math.abs(entity.properties.delta as number);
    const color = TYPE_COLORS[type] || "#64748b";

    return {
      type: "point",
      color,
      size: 8 + Math.min(10, delta * 12),
      outlineColor: color,
      outlineWidth: 1,
      labelText: entity.label || undefined,
      labelFont: "10px JetBrains Mono, monospace",
    };
  }

  getFilterDefinitions(): FilterDefinition[] {
    return [
      {
        id: "anomaly_type",
        label: "Anomaly Type",
        type: "select",
        propertyKey: "type",
        options: [
          { value: "BLACKOUT", label: "Blackout" },
          { value: "SURGE", label: "Surge" },
          { value: "GRADUAL_DECLINE", label: "Gradual Decline" },
          { value: "RECOVERY", label: "Recovery" },
        ],
      },
      {
        id: "confidence",
        label: "Confidence",
        type: "range",
        propertyKey: "confidence",
        range: { min: 0.5, max: 1.0, step: 0.05 },
      },
    ];
  }
}
