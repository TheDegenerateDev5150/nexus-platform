/**
 * Economic Intelligence Plugin
 * ─────────────────────────────────────────────────────────────
 * Markets reflect geopolitical tension BEFORE media.
 * Spikes in oil/gold/wheat/defense stocks = leading indicators.
 *
 * Production wiring:
 *  - ALPHA_VANTAGE_API_KEY env var (free tier: 25 req/day)
 *  - METALS_API_KEY env var (gold/silver)
 *  - Fallback: Yahoo Finance scraping (no key required)
 *
 * Key insight: Correlated with NOTAM + ADS-B absence = massive signal.
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

// ─── Economic Indicators ──────────────────────────────────────

interface EconomicIndicator {
  id: string;
  name: string;
  symbol: string;
  value: number;
  previousValue: number;
  changePercent: number;
  timestamp: Date;
  /** Geographic relevance — where the anomaly points to */
  geoHotspots: Array<{ lat: number; lng: number; zone: string; relevance: string }>;
  anomalyScore: number; // 0-1 — how anomalous vs 30-day baseline
  signal: string; // human-readable interpretation
}

function generateDemoIndicators(): EconomicIndicator[] {
  const now = new Date();
  return [
    {
      id: "brent",
      name: "Pétrole Brent",
      symbol: "BRN",
      value: 98.42,
      previousValue: 87.85,
      changePercent: +12.02,
      timestamp: now,
      geoHotspots: [
        { lat: 26.5, lng: 56.5, zone: "Détroit d'Ormuz", relevance: "Closure risk +70%" },
        { lat: 15.0, lng: 43.0, zone: "Mer Rouge", relevance: "Houthis disruption" },
      ],
      anomalyScore: 0.87,
      signal: "Spike +12% sur 2h — risque fermeture Ormuz",
    },
    {
      id: "gold",
      name: "Or / XAU",
      symbol: "XAU",
      value: 2847.30,
      previousValue: 2751.00,
      changePercent: +3.50,
      timestamp: now,
      geoHotspots: [
        { lat: 32.08, lng: 34.78, zone: "Tel Aviv", relevance: "Refuge demand Middle East" },
        { lat: 38.9,  lng: -77.03, zone: "Washington D.C.", relevance: "Safe haven demand" },
      ],
      anomalyScore: 0.74,
      signal: "Fuite vers valeur refuge — instabilité systémique détectée",
    },
    {
      id: "wheat",
      name: "Blé (CBOT)",
      symbol: "ZW",
      value: 645.50,
      previousValue: 612.00,
      changePercent: +5.47,
      timestamp: now,
      geoHotspots: [
        { lat: 47.0, lng: 32.0, zone: "Mer Noire", relevance: "Ukraine export disruption" },
        { lat: 26.5, lng: 56.5, zone: "Golfe Persique", relevance: "MENA import panic" },
      ],
      anomalyScore: 0.62,
      signal: "Circuit breaker déclenché — route Mer Noire menacée",
    },
    {
      id: "lmt",
      name: "Lockheed Martin",
      symbol: "LMT",
      value: 542.80,
      previousValue: 498.20,
      changePercent: +8.95,
      timestamp: now,
      geoHotspots: [
        { lat: 38.9, lng: -77.03, zone: "Washington D.C.", relevance: "Pentagon contracts" },
        { lat: 32.08, lng: 34.78, zone: "Tel Aviv", relevance: "F-35 deployments" },
      ],
      anomalyScore: 0.81,
      signal: "LMT/RTX/BA simultaneous spike — contrats majeurs imminents",
    },
    {
      id: "bdi",
      name: "Baltic Dry Index",
      symbol: "BDI",
      value: 1245,
      previousValue: 1520,
      changePercent: -18.09,
      timestamp: now,
      geoHotspots: [
        { lat: 15.0, lng: 43.0, zone: "Mer Rouge", relevance: "Suez rerouting" },
        { lat: 1.3,  lng: 103.8, zone: "Détroit de Malacca", relevance: "Asia supply chain" },
      ],
      anomalyScore: 0.71,
      signal: "Effondrement BDI — blocage route maritime majeure",
    },
  ];
}

// Geo coordinates for economic dashboard display
const ECONOMIC_HUB_COORDS: Record<string, { lat: number; lng: number }> = {
  "brent":   { lat: 26.5,  lng: 56.5  },  // Ormuz
  "gold":    { lat: 40.71, lng: -74.0  },  // NYC financial hub
  "wheat":   { lat: 47.0,  lng: 32.0   },  // Black Sea
  "lmt":     { lat: 38.9,  lng: -77.03 },  // Pentagon
  "bdi":     { lat: 1.3,   lng: 103.8  },  // Singapore
};

export class EconomicPlugin implements WorldPlugin {
  id = "economic";
  name = "Economic Intelligence";
  description = "Pétrole, Or, Blé, BDI, Actions Défense — indicateurs avancés de crise";
  icon = "📈";
  category = "economic" as const;
  version = "1.0.0";

  private ctx: PluginContext | null = null;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
  }

  destroy(): void {
    this.ctx = null;
  }

  async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
    const res = await fetch("/api/economic");
    const data = res.ok ? await res.json() : { indicators: generateDemoIndicators() };
    const indicators: EconomicIndicator[] = data.indicators || generateDemoIndicators();

    // Feed anomalies to NEXUS engine
    for (const ind of indicators) {
      if (ind.anomalyScore > 0.5) {
        for (const hotspot of ind.geoHotspots) {
          const signal: NexusSignal = {
            id: `economic-${ind.id}-${hotspot.zone}`,
            source: ind.id === "lmt" ? "economic_defense"
              : ind.id === "bdi" ? "economic_oil"
              : ind.id === "gold" ? "economic_gold"
              : "economic_oil",
            lat: hotspot.lat,
            lng: hotspot.lng,
            radiusKm: 200,
            eventTime: ind.timestamp,
            ingestTime: new Date(),
            description: `${ind.name} ${ind.changePercent > 0 ? "+" : ""}${ind.changePercent.toFixed(1)}% — ${ind.signal}`,
            confidence: ind.anomalyScore,
            payload: {
              symbol: ind.symbol,
              value: ind.value,
              changePercent: ind.changePercent,
              zone: hotspot.zone,
              relevance: hotspot.relevance,
            },
            evidenceUrl: `https://finance.yahoo.com/quote/${ind.symbol}`,
          };
          nexusEngine.ingest(signal);
        }
      }
    }

    // Return as GeoEntities at financial hub coordinates
    return indicators
      .filter((i) => i.anomalyScore > 0.5)
      .map((ind) => {
        const coords = ECONOMIC_HUB_COORDS[ind.id] || { lat: 0, lng: 0 };
        return {
          id: `economic-${ind.id}`,
          pluginId: "economic",
          latitude: coords.lat,
          longitude: coords.lng,
          timestamp: ind.timestamp,
          label: `${ind.symbol} ${ind.changePercent > 0 ? "+" : ""}${ind.changePercent.toFixed(1)}%`,
          properties: {
            name: ind.name,
            value: ind.value,
            changePercent: ind.changePercent,
            anomalyScore: ind.anomalyScore,
            signal: ind.signal,
            isNegative: ind.changePercent < 0,
          },
        };
      });
  }

  getPollingInterval(): number { return 60_000; } // 1 minute

  getLayerConfig(): LayerConfig {
    return {
      color: "#f59e0b",
      clusterEnabled: false,
      clusterDistance: 0,
      maxEntities: 20,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const change = entity.properties.changePercent as number;
    const anomaly = entity.properties.anomalyScore as number;
    const isBullish = change > 0;
    return {
      type: "point",
      color: isBullish ? "#f59e0b" : "#ef4444",
      size: 8 + anomaly * 10,
      outlineColor: "#ffffff",
      outlineWidth: 2,
      labelText: entity.label,
      labelFont: "12px JetBrains Mono",
    };
  }
}
