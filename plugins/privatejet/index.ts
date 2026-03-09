import { Plane } from "lucide-react";
import type {
  WorldPlugin, GeoEntity, TimeRange, PluginContext,
  LayerConfig, CesiumEntityOptions, FilterDefinition,
} from "@/core/plugins/PluginTypes";

interface PrivateJet {
  id: string;
  icao24: string;
  callsign: string;
  owner: string;
  ownerCategory: "OLIGARCH" | "ROYAL" | "MINISTER" | "CEO" | "ARMS_DEALER" | "UNKNOWN";
  nationality: string;
  aircraftType: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  origin?: string;
  destination?: string;
  isAnomalous: boolean;
  anomalyReason?: string;
  nexusRelevance: number;
  lastSeen: Date;
}

const PRIVATE_JETS_DEMO: PrivateJet[] = [
  {
    id: "pj-001", icao24: "AA0001", callsign: "RU-OL-01",
    owner: "Alisher Usmanov (attributed)", ownerCategory: "OLIGARCH",
    nationality: "RU", aircraftType: "Airbus A340",
    lat: 25.2, lng: 55.4, altitude: 11200, speed: 820, heading: 270,
    origin: "Moscow SVO", destination: "Dubai DXB",
    isAnomalous: true, anomalyReason: "Departure within 2h of new sanctions announcement",
    nexusRelevance: 0.82, lastSeen: new Date(Date.now() - 600000),
  },
  {
    id: "pj-002", icao24: "AA0002", callsign: "RU-OL-02",
    owner: "Igor Sechin (attributed)", ownerCategory: "OLIGARCH",
    nationality: "RU", aircraftType: "Gulfstream G650",
    lat: 59.8, lng: 30.3, altitude: 0, speed: 0, heading: 0,
    origin: "Saint Petersburg LED", destination: null as unknown as string,
    isAnomalous: true, anomalyReason: "Grounded 48h — unusual for this aircraft",
    nexusRelevance: 0.70, lastSeen: new Date(Date.now() - 3600000),
  },
  {
    id: "pj-003", icao24: "AE0003", callsign: "KSA-ROY-01",
    owner: "Saudi Royal Family", ownerCategory: "ROYAL",
    nationality: "SA", aircraftType: "Boeing 747-8",
    lat: 35.7, lng: 51.4, altitude: 9800, speed: 780, heading: 210,
    origin: "Riyadh RUH", destination: "Tehran IKA",
    isAnomalous: true, anomalyReason: "Tehran landing — rare, post-normalization monitoring",
    nexusRelevance: 0.88, lastSeen: new Date(Date.now() - 1200000),
  },
  {
    id: "pj-004", icao24: "AF0004", callsign: "UA-MIN-01",
    owner: "UAE Minister delegation", ownerCategory: "MINISTER",
    nationality: "AE", aircraftType: "Gulfstream G700",
    lat: 50.4, lng: 30.5, altitude: 0, speed: 0, heading: 0,
    origin: "Abu Dhabi AUH", destination: "Kyiv KBP",
    isAnomalous: true, anomalyReason: "Ministerial landing Kyiv — ceasefire talks?",
    nexusRelevance: 0.75, lastSeen: new Date(Date.now() - 900000),
  },
  {
    id: "pj-005", icao24: "AE0005", callsign: "CN-GOV-01",
    owner: "PRC State Council delegation", ownerCategory: "MINISTER",
    nationality: "CN", aircraftType: "Boeing 737-800 BBJ",
    lat: 39.9, lng: 116.4, altitude: 10500, speed: 850, heading: 275,
    origin: "Beijing PEK", destination: "Taipei TPE",
    isAnomalous: true, anomalyReason: "PRC government aircraft Taiwan approach — LEVEL 9 SIGNAL",
    nexusRelevance: 0.97, lastSeen: new Date(Date.now() - 300000),
  },
  {
    id: "pj-006", icao24: "AG0006", callsign: "ARMS-01",
    owner: "Victor Bout network (attributed)", ownerCategory: "ARMS_DEALER",
    nationality: "RU", aircraftType: "Ilyushin IL-76",
    lat: 15.6, lng: 32.5, altitude: 4500, speed: 650, heading: 180,
    origin: "Unknown", destination: "Sudan Khartoum KRT",
    isAnomalous: true, anomalyReason: "Arms delivery route Sudan — UN embargo violation suspected",
    nexusRelevance: 0.85, lastSeen: new Date(Date.now() - 420000),
  },
  {
    id: "pj-007", icao24: "AH0007", callsign: "ELON-01",
    owner: "Elon Musk", ownerCategory: "CEO",
    nationality: "US", aircraftType: "Gulfstream G650",
    lat: 32.8, lng: -96.8, altitude: 12200, speed: 870, heading: 90,
    origin: "Los Angeles LAX", destination: "Washington IAD",
    isAnomalous: false,
    nexusRelevance: 0.45, lastSeen: new Date(Date.now() - 1800000),
  },
  {
    id: "pj-008", icao24: "AI0008", callsign: "KIM-GOV-01",
    owner: "DPRK State Aircraft", ownerCategory: "MINISTER",
    nationality: "KP", aircraftType: "Ilyushin IL-62",
    lat: 39.0, lng: 125.7, altitude: 0, speed: 0, heading: 0,
    origin: "Pyongyang FNJ", destination: null as unknown as string,
    isAnomalous: true, anomalyReason: "DPRK state aircraft fueling — unusual activity Sunan airport",
    nexusRelevance: 0.80, lastSeen: new Date(Date.now() - 7200000),
  },
];

function jetToEntity(jet: PrivateJet): GeoEntity {
  return {
    id: jet.id,
    pluginId: "privatejet",
    latitude: jet.lat,
    longitude: jet.lng,
    altitude: jet.altitude,
    heading: jet.heading,
    speed: jet.speed,
    timestamp: jet.lastSeen,
    label: `${jet.callsign} — ${jet.owner.split(" ")[0]}`,
    properties: {
      icao24: jet.icao24,
      callsign: jet.callsign,
      owner: jet.owner,
      ownerCategory: jet.ownerCategory,
      nationality: jet.nationality,
      aircraftType: jet.aircraftType,
      origin: jet.origin || "Unknown",
      destination: jet.destination || "Unknown",
      isAnomalous: jet.isAnomalous,
      anomalyReason: jet.anomalyReason || "",
      nexusRelevance: jet.nexusRelevance,
    },
  };
}

const CATEGORY_COLORS: Record<PrivateJet["ownerCategory"], string> = {
  OLIGARCH:    "#ef4444",
  ROYAL:       "#f59e0b",
  MINISTER:    "#3b82f6",
  CEO:         "#22d3ee",
  ARMS_DEALER: "#dc2626",
  UNKNOWN:     "#64748b",
};

export class PrivateJetPlugin implements WorldPlugin {
  id = "privatejet";
  name = "Private Jets";
  description = "Oligarch, government & VIP aircraft anomaly tracking";
  icon = Plane;
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
      const res = await fetch("/api/aviation?filter=privatejet", {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.jets?.length) return data.jets.map(jetToEntity);
      }
    } catch {}

    return PRIVATE_JETS_DEMO.map(j => ({
      ...jetToEntity(j),
      latitude: j.lat + (Math.random() - 0.5) * 0.05,
      longitude: j.lng + (Math.random() - 0.5) * 0.05,
    }));
  }

  getPollingInterval(): number {
    return 60000;
  }

  getLayerConfig(): LayerConfig {
    return {
      color: "#f59e0b",
      clusterEnabled: false,
      clusterDistance: 0,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const cat = entity.properties.ownerCategory as PrivateJet["ownerCategory"];
    const anomalous = entity.properties.isAnomalous as boolean;
    const color = CATEGORY_COLORS[cat] || "#64748b";

    return {
      type: "billboard",
      color,
      size: anomalous ? 14 : 9,
      rotation: (entity.heading || 0),
      labelText: anomalous ? `⚠ ${entity.label}` : entity.label || undefined,
      labelFont: "10px JetBrains Mono, monospace",
    };
  }

  getFilterDefinitions(): FilterDefinition[] {
    return [
      {
        id: "owner_category",
        label: "Owner Category",
        type: "select",
        propertyKey: "ownerCategory",
        options: [
          { value: "OLIGARCH", label: "Oligarch" },
          { value: "ROYAL", label: "Royal Family" },
          { value: "MINISTER", label: "Government/Minister" },
          { value: "CEO", label: "Tech CEO" },
          { value: "ARMS_DEALER", label: "Arms Network" },
        ],
      },
      {
        id: "anomalous_only",
        label: "Anomalous Only",
        type: "select",
        propertyKey: "isAnomalous",
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
      },
    ];
  }
}
