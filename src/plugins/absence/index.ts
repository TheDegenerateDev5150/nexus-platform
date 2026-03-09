import { EyeOff } from "lucide-react";
import type {
  WorldPlugin, GeoEntity, TimeRange, PluginContext,
  LayerConfig, CesiumEntityOptions, FilterDefinition,
} from "@/core/plugins/PluginTypes";

interface AbsenceZone {
  id: string;
  type: "ADS_B_VOID" | "AIS_DARK" | "SOCIAL_BLACKOUT" | "INTERNET_SHUTDOWN";
  lat: number;
  lng: number;
  radiusKm: number;
  label: string;
  country: string;
  detectedAt: Date;
  confidenceScore: number;
  baselineTraffic: number;
  currentTraffic: number;
  dropPercent: number;
  durationMin: number;
  nexusSignalStrength: number;
  militaryContext: boolean;
}

const ABSENCE_DEMO: AbsenceZone[] = [
  {
    id: "abs-001", type: "ADS_B_VOID",
    lat: 32.08, lng: 34.78, radiusKm: 80,
    label: "ADS-B VOID — Tel Aviv sector",
    country: "IL", detectedAt: new Date(Date.now() - 1800000),
    confidenceScore: 0.94, baselineTraffic: 140, currentTraffic: 12,
    dropPercent: 91, durationMin: 30, nexusSignalStrength: 0.94, militaryContext: true,
  },
  {
    id: "abs-002", type: "AIS_DARK",
    lat: 14.8, lng: 42.7, radiusKm: 120,
    label: "DARK SHIP — Hodeida corridor",
    country: "YE", detectedAt: new Date(Date.now() - 5400000),
    confidenceScore: 0.88, baselineTraffic: 24, currentTraffic: 3,
    dropPercent: 87, durationMin: 90, nexusSignalStrength: 0.88, militaryContext: true,
  },
  {
    id: "abs-003", type: "ADS_B_VOID",
    lat: 26.5, lng: 56.3, radiusKm: 100,
    label: "ADS-B VOID — Strait of Hormuz",
    country: "IR", detectedAt: new Date(Date.now() - 3600000),
    confidenceScore: 0.91, baselineTraffic: 85, currentTraffic: 8,
    dropPercent: 90, durationMin: 60, nexusSignalStrength: 0.91, militaryContext: true,
  },
  {
    id: "abs-004", type: "INTERNET_SHUTDOWN",
    lat: 35.69, lng: 51.39, radiusKm: 200,
    label: "INTERNET SHUTDOWN — Tehran",
    country: "IR", detectedAt: new Date(Date.now() - 7200000),
    confidenceScore: 0.82, baselineTraffic: 100, currentTraffic: 18,
    dropPercent: 82, durationMin: 120, nexusSignalStrength: 0.82, militaryContext: false,
  },
  {
    id: "abs-005", type: "AIS_DARK",
    lat: 1.3, lng: 103.8, radiusKm: 150,
    label: "DARK SHIP — Malacca Strait",
    country: "SG", detectedAt: new Date(Date.now() - 900000),
    confidenceScore: 0.78, baselineTraffic: 180, currentTraffic: 42,
    dropPercent: 76, durationMin: 15, nexusSignalStrength: 0.78, militaryContext: false,
  },
  {
    id: "abs-006", type: "SOCIAL_BLACKOUT",
    lat: 55.75, lng: 37.62, radiusKm: 300,
    label: "SOCIAL BLACKOUT — Moscow region",
    country: "RU", detectedAt: new Date(Date.now() - 10800000),
    confidenceScore: 0.72, baselineTraffic: 100, currentTraffic: 22,
    dropPercent: 78, durationMin: 180, nexusSignalStrength: 0.72, militaryContext: false,
  },
];

function absenceToEntity(z: AbsenceZone): GeoEntity {
  return {
    id: z.id,
    pluginId: "absence",
    latitude: z.lat,
    longitude: z.lng,
    timestamp: z.detectedAt,
    label: z.label,
    properties: {
      type: z.type,
      country: z.country,
      radiusKm: z.radiusKm,
      confidenceScore: z.confidenceScore,
      dropPercent: z.dropPercent,
      durationMin: z.durationMin,
      militaryContext: z.militaryContext,
      nexusSignalStrength: z.nexusSignalStrength,
      baselineTraffic: z.baselineTraffic,
      currentTraffic: z.currentTraffic,
    },
  };
}

export class AbsencePlugin implements WorldPlugin {
  id = "absence";
  name = "Absence Signals";
  description = "ADS-B voids, dark ships, social blackouts";
  icon = EyeOff;
  category = "custom" as const;
  version = "1.0.0";

  private context: PluginContext | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private currentZones: AbsenceZone[] = [...ABSENCE_DEMO];

  async initialize(ctx: PluginContext): Promise<void> {
    this.context = ctx;
  }

  destroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.context = null;
  }

  async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
    try {
      const [adsbRes] = await Promise.allSettled([
        fetch("/api/absence", { signal: AbortSignal.timeout(5000) }),
      ]);

      if (adsbRes.status === "fulfilled" && adsbRes.value.ok) {
        const data = await adsbRes.value.json();
        if (data.zones?.length) {
          this.currentZones = data.zones;
          return data.zones.map(absenceToEntity);
        }
      }
    } catch {}

    return this.currentZones.map(z => ({
      ...absenceToEntity(z),
      timestamp: new Date(),
    }));
  }

  getPollingInterval(): number {
    return 120000;
  }

  getLayerConfig(): LayerConfig {
    return {
      color: "#64748b",
      clusterEnabled: false,
      clusterDistance: 0,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const type = entity.properties.type as string;
    const drop = entity.properties.dropPercent as number;
    const military = entity.properties.militaryContext as boolean;

    const color = military
      ? drop > 85 ? "#dc2626" : "#f97316"
      : drop > 80 ? "#f59e0b" : "#64748b";

    return {
      type: "point",
      color,
      size: 10 + Math.min(8, drop / 10),
      outlineColor: color,
      outlineWidth: 2,
      labelText: entity.label || undefined,
      labelFont: "10px JetBrains Mono, monospace",
    };
  }

  getFilterDefinitions(): FilterDefinition[] {
    return [
      {
        id: "absence_type",
        label: "Signal Type",
        type: "select",
        propertyKey: "type",
        options: [
          { value: "ADS_B_VOID", label: "ADS-B Void" },
          { value: "AIS_DARK", label: "AIS Dark Ship" },
          { value: "SOCIAL_BLACKOUT", label: "Social Blackout" },
          { value: "INTERNET_SHUTDOWN", label: "Internet Shutdown" },
        ],
      },
      {
        id: "drop_percent",
        label: "Traffic Drop %",
        type: "range",
        propertyKey: "dropPercent",
        range: { min: 50, max: 100, step: 5 },
      },
    ];
  }
}
