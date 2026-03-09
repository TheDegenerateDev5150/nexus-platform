/**
 * GPS Jamming Detection Plugin
 * ─────────────────────────────────────────────────────────────
 * KEY INSIGHT (Bilawal Sidhu):
 * "Every commercial aircraft broadcasts its GPS confidence level.
 *  When you aggregate enough of those signals, you can map where
 *  active GPS interference is happening — without any classified
 *  sensors at all. You're mining the global fleet of commercial
 *  aircraft as a distributed sensor network for electronic warfare."
 *
 * Production source: GPSJam.org API (free, aggregated daily)
 * https://gpsjam.org/
 *
 * A jamming zone = military operation signal.
 * Correlate with ADS-B absence + Telegram → VERY high confidence.
 */

import type {
  WorldPlugin,
  GeoEntity,
  TimeRange,
  PluginContext,
  LayerConfig,
  CesiumEntityOptions,
} from "@/core/plugins/PluginTypes";
import { nexusEngine } from "@/nexus/engine";
import type { NexusSignal } from "@/nexus/types";

interface JammingZone {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  intensity: number; // 0-1
  affectedAircraft: number;
  startTime: Date;
  lastUpdate: Date;
  estimatedSource: string;
  country: string;
}

function generateDemoJammingZones(): JammingZone[] {
  const now = new Date();
  return [
    {
      id: "jam-il-1",
      lat: 33.0, lng: 35.5,
      radiusKm: 180,
      intensity: 0.92,
      affectedAircraft: 47,
      startTime: new Date(now.getTime() - 2 * 3600000),
      lastUpdate: new Date(now.getTime() - 5 * 60000),
      estimatedSource: "IDF Electronic Warfare Unit",
      country: "IL",
    },
    {
      id: "jam-ru-1",
      lat: 56.0, lng: 37.0,
      radiusKm: 120,
      intensity: 0.71,
      affectedAircraft: 23,
      startTime: new Date(now.getTime() - 6 * 3600000),
      lastUpdate: new Date(now.getTime() - 15 * 60000),
      estimatedSource: "Russian EW — Krasukha-4",
      country: "RU",
    },
    {
      id: "jam-ua-1",
      lat: 48.5, lng: 33.0,
      radiusKm: 90,
      intensity: 0.64,
      affectedAircraft: 12,
      startTime: new Date(now.getTime() - 4 * 3600000),
      lastUpdate: new Date(now.getTime() - 8 * 60000),
      estimatedSource: "Conflict zone — mixed origin",
      country: "UA",
    },
    {
      id: "jam-ir-1",
      lat: 33.5, lng: 45.0,
      radiusKm: 220,
      intensity: 0.88,
      affectedAircraft: 61,
      startTime: new Date(now.getTime() - 1 * 3600000),
      lastUpdate: new Date(now.getTime() - 2 * 60000),
      estimatedSource: "Operation Epic Fury area — unknown EW",
      country: "IQ",
    },
  ];
}

function intensityToColor(intensity: number): string {
  if (intensity > 0.85) return "#ef4444"; // red — severe
  if (intensity > 0.65) return "#f59e0b"; // amber — moderate
  if (intensity > 0.40) return "#eab308"; // yellow — mild
  return "#4ade80"; // green — light
}

export class GpsJamPlugin implements WorldPlugin {
  id = "gpsjam";
  name = "GPS Jamming";
  description = "Détection brouillage GPS via flotte ADS-B — signal Guerre Électronique";
  icon = "📡";
  category = "aviation" as const;
  version = "1.0.0";

  private ctx: PluginContext | null = null;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
  }

  destroy(): void { this.ctx = null; }

  async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
    const res = await fetch("/api/gpsjam");
    const data = res.ok ? await res.json() : { zones: generateDemoJammingZones() };
    const zones: JammingZone[] = data.zones || generateDemoJammingZones();

    for (const zone of zones) {
      const signal: NexusSignal = {
        id: `gpsjam-${zone.id}`,
        source: "gpsjam",
        lat: zone.lat,
        lng: zone.lng,
        radiusKm: zone.radiusKm,
        eventTime: zone.startTime,
        ingestTime: new Date(),
        description: `Brouillage GPS ${zone.country} — intensité ${Math.round(zone.intensity * 100)}% — ${zone.affectedAircraft} aéronefs affectés. Source probable: ${zone.estimatedSource}`,
        confidence: zone.intensity,
        payload: {
          affectedAircraft: zone.affectedAircraft,
          radiusKm: zone.radiusKm,
          estimatedSource: zone.estimatedSource,
          country: zone.country,
        },
      };
      nexusEngine.ingest(signal);
    }

    return zones.map((zone) => ({
      id: `gpsjam-${zone.id}`,
      pluginId: "gpsjam",
      latitude: zone.lat,
      longitude: zone.lng,
      timestamp: zone.lastUpdate,
      label: `⚡ GPS JAM ${zone.country} — ${Math.round(zone.intensity * 100)}%`,
      properties: {
        intensity: zone.intensity,
        affectedAircraft: zone.affectedAircraft,
        radiusKm: zone.radiusKm,
        estimatedSource: zone.estimatedSource,
        country: zone.country,
        startTime: zone.startTime.toISOString(),
      },
    }));
  }

  getPollingInterval(): number { return 1_800_000; } // 30 minutes (GPSJam updates ~daily but check often)

  getLayerConfig(): LayerConfig {
    return {
      color: "#ef4444",
      clusterEnabled: false,
      clusterDistance: 0,
      maxEntities: 50,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const intensity = entity.properties.intensity as number;
    return {
      type: "point",
      color: intensityToColor(intensity),
      size: 12 + intensity * 16,
      outlineColor: "#000000",
      outlineWidth: 2,
    };
  }
}
