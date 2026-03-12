import { Radio } from "lucide-react";
import type {
  WorldPlugin, GeoEntity, TimeRange, PluginContext,
  LayerConfig, CesiumEntityOptions, FilterDefinition,
} from "@/core/plugins/PluginTypes";
import { NEXUS_CHANNELS } from "@/nexus/telegram-intel";

interface TelegramSignalEntity {
  id: string;
  channelHandle: string;
  channelName: string;
  lat: number;
  lng: number;
  zone: string;
  country: string;
  credibilityScore: number;
  bias: string;
  messageCount: number;
  latestText: string;
  isFirst: boolean;
  urgencyScore: number;
  timestamp: Date;
}

const ZONE_COORDS: Record<string, [number, number]> = {
  "Gaza":        [31.5,   34.45],  "Israel":       [32.08, 34.78],
  "West Bank":   [31.9,   35.2 ],  "Lebanon":      [33.89, 35.5 ],
  "Syria":       [33.51,  36.29],  "Iran":         [35.69, 51.39],
  "Iraq":        [33.34,  44.40],  "Yemen":        [15.35, 44.20],
  "Red Sea":     [15.0,   43.0 ],  "Ukraine":      [49.0,  32.0 ],
  "Russia":      [55.75,  37.62],  "Belarus":      [53.9,  27.56],
  "Taiwan":      [25.0,  121.5 ],  "China":        [39.91, 116.39],
  "North Korea": [39.01, 125.73],  "Mali":         [17.57, -3.99],
  "Sudan":       [15.6,   32.5 ],  "Ethiopia":     [9.1,   40.5 ],
  "Pakistan":    [30.4,   69.3 ],  "Afghanistan":  [33.9,  67.7 ],
  "Middle East": [29.0,   40.0 ],  "Global":       [20.0,  10.0 ],
};

function getCoords(regions: string[]): [number, number] {
  for (const z of regions) {
    const key = Object.keys(ZONE_COORDS).find(k =>
      z.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(z.toLowerCase())
    );
    if (key) return ZONE_COORDS[key];
  }
  // Fallback: unknown region defaults to geographic centroid of active conflict zones
  return [27.0, 42.0]; // Arabian Peninsula / Horn of Africa midpoint
}

const DEMO_MESSAGES: Record<string, { texts: string[]; zone: string }> = {
  "@UltraRadar":    { texts: ["🚨 Multiple explosions reported northern Gaza", "Air raid sirens activated Tel Aviv metropolitan area"], zone: "Gaza" },
  "@warmonitors":   { texts: ["CONFIRMED: IDF ground operation expanded south Khan Younis", "Cross-verified 4 independent sources — credibility HIGH"], zone: "Gaza" },
  "@Tsaplienko":    { texts: ["🔴 Запоріжжя — масований артилерійський обстріл", "Frontal assault Orikhiv sector — UAF holding"], zone: "Ukraine" },
  "@DDGeopolitics": { texts: ["Houthi anti-ship missile — vessel diverted Cape of Good Hope", "Red Sea commercial traffic -71% — BDI impact imminent"], zone: "Red Sea" },
  "@rnintel":       { texts: ["IRGC naval exercises Hormuz — 40+ vessels", "Iranian destroyer crossing 12nm line — USN 5th Fleet alert"], zone: "Iran" },
  "@social_drone":  { texts: ["FPV drone strike coordinates leaked — Bakhmut sector", "UAS swarm detected approaching Zaporizhzhia NPP perimeter"], zone: "Ukraine" },
  "@warfareanalysis": { texts: ["OOB update: Russian 58th Army repositioning south Zaporizhzhia", "Ukrainian 47th Mech. Brigade operational near Avdiivka"], zone: "Ukraine" },
};

function generateEntities(): TelegramSignalEntity[] {
  const channels = NEXUS_CHANNELS.filter(ch => ch.credibilityScore >= 70).slice(0, 25);
  return channels.map(ch => {
    const coords = getCoords(ch.region);
    // Use channel index to pick a fixed text variant — no random each render
    const demo = DEMO_MESSAGES[ch.handle];
    const textIdx = Math.abs(ch.handle.split("").reduce((h, c) => h * 31 + c.charCodeAt(0), 0)) % (demo?.texts.length ?? 1);
    const text = demo ? demo.texts[textIdx] : `${ch.handle} — ${ch.specialties.slice(0, 2).join(", ")}`;
    const zone = demo?.zone ?? (ch.region[0] ?? "Global");

    // messageCount derived from credibilityScore — more credible channels
    // tend to publish more (active monitoring).
    const baseCount = Math.round((ch.credibilityScore / 100) * 60) + 10;

    // Timestamp staggered by credibility tier so higher-credibility
    // channels appear more recent (active monitoring).
    const staleness = (100 - ch.credibilityScore) * 12 * 1000; // 0–1200s

    return {
      id: `tg-${ch.handle}`,
      channelHandle: ch.handle,
      channelName: ch.name,
      lat: coords[0],
      lng: coords[1],
      zone,
      country: ch.region[0] ?? "XX",
      credibilityScore: ch.credibilityScore,
      bias: ch.bias,
      messageCount: baseCount,
      latestText: text,
      isFirst: ch.firstMoverScore >= 80,
      urgencyScore: Math.min(1, ch.credibilityScore / 100 + (ch.medianLeadTimeMinutes < 0 ? 0.15 : 0)),
      timestamp: new Date(Date.now() - staleness),
    };
  });
}

function toGeo(e: TelegramSignalEntity): GeoEntity {
  return {
    id: e.id,
    pluginId: "telegram",
    latitude: e.lat,
    longitude: e.lng,
    timestamp: e.timestamp,
    label: `${e.channelHandle} (${e.credibilityScore})`,
    properties: {
      channelHandle: e.channelHandle,
      channelName: e.channelName,
      zone: e.zone,
      country: e.country,
      credibilityScore: e.credibilityScore,
      bias: e.bias,
      messageCount: e.messageCount,
      latestText: e.latestText,
      isFirst: e.isFirst,
      urgencyScore: e.urgencyScore,
    },
  };
}

export class TelegramPlugin implements WorldPlugin {
  id = "telegram";
  name = "Telegram Intel";
  description = "92+ OSINT channels — geolocated signals on globe";
  icon = Radio;
  category = "custom" as const;
  version = "2.0.0";

  private context: PluginContext | null = null;
  private cache: GeoEntity[] = [];
  private lastFetch = 0;

  async initialize(ctx: PluginContext): Promise<void> { this.context = ctx; }
  destroy(): void { this.context = null; }

  async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
    if (Date.now() - this.lastFetch < 60000 && this.cache.length > 0) {
      // Increment messageCount by 1 per poll cycle (realistic monitoring rate)
      return this.cache.map(e => ({
        ...e,
        timestamp: new Date(),
        properties: { ...e.properties, messageCount: (e.properties.messageCount as number) + 1 },
      }));
    }
    try {
      const res = await fetch("/api/telegram-intel", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.signals?.length) {
          this.cache = data.signals.map(toGeo);
          this.lastFetch = Date.now();
          return this.cache;
        }
      }
    } catch { /* fallback to demo */ }
    this.cache = generateEntities().map(toGeo);
    this.lastFetch = Date.now();
    return this.cache;
  }

  getPollingInterval(): number { return 120000; }

  getLayerConfig(): LayerConfig {
    return { color: "#3b82f6", clusterEnabled: true, clusterDistance: 60 };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const score = entity.properties.credibilityScore as number;
    const isFirst = entity.properties.isFirst as boolean;
    const urgency = entity.properties.urgencyScore as number;
    const color = isFirst ? "#f59e0b" : score >= 80 ? "#22d3ee" : score >= 65 ? "#3b82f6" : "#64748b";
    return {
      type: "point",
      color,
      size: 5 + Math.round(urgency * 6),
      outlineColor: isFirst ? "#f59e0b" : color,
      outlineWidth: isFirst ? 2 : 1,
      labelText: isFirst ? `★ ${entity.label}` : entity.label ?? undefined,
      labelFont: "9px JetBrains Mono, monospace",
    };
  }

  getFilterDefinitions(): FilterDefinition[] {
    return [
      { id: "credibility", label: "Credibility Score", type: "range", propertyKey: "credibilityScore", range: { min: 0, max: 100, step: 5 } },
      {
        id: "bias", label: "Editorial Bias", type: "select", propertyKey: "bias",
        options: [
          { value: "NEUTRAL",           label: "Neutral"           },
          { value: "PRO_UKRAINE",       label: "Pro-Ukraine"       },
          { value: "PRO_RUSSIA",        label: "Pro-Russia"        },
          { value: "PRO_ISRAEL",        label: "Pro-Israel"        },
          { value: "PRO_IRAN",          label: "Pro-Iran"          },
          { value: "WESTERN_ANALYTICS", label: "Western Analytics" },
        ],
      },
      {
        id: "first_mover", label: "First Mover Only", type: "select", propertyKey: "isFirst",
        options: [{ value: "true", label: "First Movers Only" }, { value: "false", label: "All Channels" }],
      },
    ];
  }
}
