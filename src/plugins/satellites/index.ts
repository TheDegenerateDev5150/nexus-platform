/**
 * Satellite Orbital Tracking Plugin
 * ─────────────────────────────────────────────────────────────
 * KEY INSIGHT (Bilawal Sidhu):
 * "Is that a Russian reconnaissance satellite passing directly
 *  over the strike zone right before zero hour? Everyone wanted
 *  to see what just happened. This is BDA (Battle Damage Assessment)."
 *
 * Tracks reconnaissance & spy satellites whose orbital data is
 * publicly available via NORAD TLE (Space-Track.org / CelesTrak).
 *
 * When multiple spy satellites "stack" over the same area = targeting.
 *
 * Production:
 *  - Space-Track.org free account → SPACETRACK_USER + SPACETRACK_PASS
 *  - CelesTrak: https://celestrak.org/SOCRATES/ (no key needed)
 *  - Propagation: satellite.js library (npm i satellite.js)
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

interface SatellitePass {
  id: string;
  name: string;
  noradId: string;
  country: "US" | "RU" | "CN" | "FR" | "IL" | "INT";
  type: "reconnaissance" | "radar-sar" | "sigint" | "optical" | "dual-use";
  lat: number;
  lng: number;
  altitude: number; // km
  velocity: number; // km/s
  heading: number;
  /** Zone it's currently over */
  overZone: string | null;
  isOverHotspot: boolean;
  timestamp: Date;
}

// Demo satellites with real names (TLE data would give real positions)
function generateDemoSatellites(): SatellitePass[] {
  const now = new Date();
  return [
    {
      id: "kh11-1",
      name: "KH-11 KENNEN (USA-245)",
      noradId: "41788",
      country: "US",
      type: "optical",
      lat: 33.5, lng: 44.0,
      altitude: 300,
      velocity: 7.8,
      heading: 195,
      overZone: "Irak / Iran",
      isOverHotspot: true,
      timestamp: now,
    },
    {
      id: "bars-m-1",
      name: "BARS-M № 2",
      noradId: "40995",
      country: "RU",
      type: "optical",
      lat: 35.0, lng: 51.0,
      altitude: 490,
      velocity: 7.6,
      heading: 210,
      overZone: "Téhéran",
      isOverHotspot: true,
      timestamp: new Date(now.getTime() - 8 * 60000),
    },
    {
      id: "gaofen-3",
      name: "GAOFEN-3 (CN Radar SAR)",
      noradId: "41788",
      country: "CN",
      type: "radar-sar",
      lat: 32.5, lng: 34.8,
      altitude: 755,
      velocity: 7.5,
      heading: 180,
      overZone: "Tel Aviv",
      isOverHotspot: true,
      timestamp: new Date(now.getTime() - 3 * 60000),
    },
    {
      id: "pleiades-neo-1",
      name: "PLEIADES NEO-1",
      noradId: "49789",
      country: "FR",
      type: "optical",
      lat: 48.5, lng: 2.35,
      altitude: 620,
      velocity: 7.6,
      heading: 95,
      overZone: null,
      isOverHotspot: false,
      timestamp: now,
    },
    {
      id: "ofek-16",
      name: "OFEK-16 (IL Spy Sat)",
      noradId: "45806",
      country: "IL",
      type: "optical",
      lat: 28.0, lng: 42.0,
      altitude: 390,
      velocity: 7.7,
      heading: 120,
      overZone: "Arabie Saoudite",
      isOverHotspot: false,
      timestamp: now,
    },
    {
      id: "capella-7",
      name: "CAPELLA-7 (SAR Commercial)",
      noradId: "52730",
      country: "US",
      type: "radar-sar",
      lat: 33.8, lng: 36.2,
      altitude: 525,
      velocity: 7.6,
      heading: 155,
      overZone: "Syrie",
      isOverHotspot: false,
      timestamp: new Date(now.getTime() - 12 * 60000),
    },
  ];
}

const SAT_COUNTRY_COLORS: Record<string, string> = {
  US:  "#3b82f6",  // blue
  RU:  "#ef4444",  // red
  CN:  "#f59e0b",  // amber
  FR:  "#22d3ee",  // cyan
  IL:  "#4ade80",  // green
  INT: "#a78bfa",  // purple
};

export class SatellitePlugin implements WorldPlugin {
  id = "satellites";
  name = "Satellites Reconnaissance";
  description = "NORAD TLE — KH-11, BARS-M, Gaofen, Pleiades. Stacking = ciblage ou BDA";
  icon = "🛰️";
  category = "aviation" as const;
  version = "1.0.0";

  private ctx: PluginContext | null = null;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
  }

  destroy(): void { this.ctx = null; }

  async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
    const res = await fetch("/api/satellites");
    const data = res.ok ? await res.json() : { satellites: generateDemoSatellites() };
    const sats: SatellitePass[] = data.satellites || generateDemoSatellites();

    // Detect stacking: multiple sats over same hotspot
    const hotspotSats = sats.filter((s) => s.isOverHotspot);
    if (hotspotSats.length >= 2) {
      // Group by proximity
      const groupedZones: Record<string, SatellitePass[]> = {};
      for (const sat of hotspotSats) {
        const key = sat.overZone || "unknown";
        if (!groupedZones[key]) groupedZones[key] = [];
        groupedZones[key].push(sat);
      }

      for (const [zone, group] of Object.entries(groupedZones)) {
        if (group.length >= 2) {
          const avgLat = group.reduce((s, x) => s + x.lat, 0) / group.length;
          const avgLng = group.reduce((s, x) => s + x.lng, 0) / group.length;
          const nations = [...new Set(group.map((s) => s.country))].join(", ");

          const signal: NexusSignal = {
            id: `sat-stack-${zone.replace(/\s/g, "_")}`,
            source: "satellite",
            lat: avgLat,
            lng: avgLng,
            radiusKm: 100,
            eventTime: new Date(),
            ingestTime: new Date(),
            description: `${group.length} satellites de reconnaissance (${nations}) stackent sur ${zone} — possible ciblage pré-frappe ou BDA post-frappe`,
            confidence: Math.min(0.95, 0.60 + group.length * 0.10),
            payload: {
              satellites: group.map((s) => s.name),
              nations,
              zone,
              type: "stacking",
            },
          };
          nexusEngine.ingest(signal);
        }
      }
    }

    return sats.map((sat) => ({
      id: `sat-${sat.id}`,
      pluginId: "satellites",
      latitude: sat.lat,
      longitude: sat.lng,
      altitude: sat.altitude * 1000, // to meters for Cesium
      heading: sat.heading,
      speed: sat.velocity * 1000,
      timestamp: sat.timestamp,
      label: sat.name,
      properties: {
        country: sat.country,
        type: sat.type,
        altitude: sat.altitude,
        overZone: sat.overZone,
        isOverHotspot: sat.isOverHotspot,
        noradId: sat.noradId,
      },
    }));
  }

  getPollingInterval(): number { return 120_000; } // 2 minutes

  getLayerConfig(): LayerConfig {
    return {
      color: "#a78bfa",
      clusterEnabled: false,
      clusterDistance: 0,
      maxEntities: 100,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const country = entity.properties.country as string;
    const isHot = entity.properties.isOverHotspot as boolean;
    return {
      type: "point",
      color: SAT_COUNTRY_COLORS[country] || "#a78bfa",
      size: isHot ? 10 : 6,
      outlineColor: isHot ? "#ff0000" : "#ffffff",
      outlineWidth: isHot ? 2 : 1,
    };
  }
}
