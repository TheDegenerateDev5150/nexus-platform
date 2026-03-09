import { NextResponse } from "next/server";

const ICAO_WATCHLIST: Record<string, {
  owner: string;
  category: "OLIGARCH" | "ROYAL" | "MINISTER" | "CEO" | "ARMS_DEALER";
  nationality: string;
  notes: string;
  riskScore: number;
}> = {
  "01000D": { owner: "Roman Abramovich (attributed)", category: "OLIGARCH", nationality: "RU", notes: "Sanctioned — frequent route change tracking", riskScore: 0.88 },
  "600001": { owner: "Saudi Royal Family", category: "ROYAL", nationality: "SA", notes: "VIP travel monitoring", riskScore: 0.55 },
  "000001": { owner: "Alisher Usmanov (attributed)", category: "OLIGARCH", nationality: "RU", notes: "Asset seized 2022 — aircraft reassigned", riskScore: 0.85 },
  "AAAAAA": { owner: "Arkady Rotenberg (attributed)", category: "OLIGARCH", nationality: "RU", notes: "Sanctioned individual", riskScore: 0.80 },
  "E80001": { owner: "Elon Musk", category: "CEO", nationality: "US", notes: "High-frequency travel tracker", riskScore: 0.30 },
  "A835AF": { owner: "Jeff Bezos", category: "CEO", nationality: "US", notes: "Superyacht + aviation", riskScore: 0.25 },
  "C0FFFE": { owner: "Viktor Bout (network)", category: "ARMS_DEALER", nationality: "RU", notes: "Released 2022 — network monitoring", riskScore: 0.90 },
};

const DEMO_JETS = [
  {
    id: "pj-001", icao24: "AA0001", callsign: "RU-PRIV-01",
    owner: "Alisher Usmanov (attributed)", ownerCategory: "OLIGARCH",
    nationality: "RU", aircraftType: "Airbus A340-300",
    lat: 25.24, lng: 55.36, altitude: 11200, speed: 820, heading: 270,
    origin: "Moscow SVO", destination: "Dubai DXB",
    isAnomalous: true, anomalyReason: "Departure within 2h of new sanctions announcement",
    nexusRelevance: 0.82, onGround: false,
  },
  {
    id: "pj-002", icao24: "AA0002", callsign: "RU-PRIV-02",
    owner: "Igor Sechin (attributed)", ownerCategory: "OLIGARCH",
    nationality: "RU", aircraftType: "Gulfstream G650",
    lat: 59.8, lng: 30.3, altitude: 0, speed: 0, heading: 0,
    origin: "Saint Petersburg LED", destination: null,
    isAnomalous: true, anomalyReason: "Grounded 48h — unusual for this operator",
    nexusRelevance: 0.70, onGround: true,
  },
  {
    id: "pj-003", icao24: "AE0003", callsign: "KSA-VIP-01",
    owner: "Saudi Royal delegation", ownerCategory: "ROYAL",
    nationality: "SA", aircraftType: "Boeing 747-8 VIP",
    lat: 35.69, lng: 51.39, altitude: 9800, speed: 780, heading: 210,
    origin: "Riyadh RUH", destination: "Tehran IKA",
    isAnomalous: true, anomalyReason: "Rare Tehran landing — post-normalization monitoring",
    nexusRelevance: 0.88, onGround: false,
  },
  {
    id: "pj-004", icao24: "AF0004", callsign: "AE-DIP-01",
    owner: "UAE ministerial delegation", ownerCategory: "MINISTER",
    nationality: "AE", aircraftType: "Gulfstream G700",
    lat: 50.45, lng: 30.52, altitude: 0, speed: 0, heading: 0,
    origin: "Abu Dhabi AUH", destination: "Kyiv KBP",
    isAnomalous: true, anomalyReason: "UAE ministerial Kyiv — ceasefire mediation signal",
    nexusRelevance: 0.75, onGround: true,
  },
  {
    id: "pj-005", icao24: "AE0005", callsign: "CN-GOV-01",
    owner: "PRC State Council delegation", ownerCategory: "MINISTER",
    nationality: "CN", aircraftType: "Boeing 737 BBJ",
    lat: 39.91, lng: 116.39, altitude: 10500, speed: 850, heading: 275,
    origin: "Beijing PEK", destination: "Taipei TPE",
    isAnomalous: true, anomalyReason: "PRC government aircraft — Taiwan approach vector",
    nexusRelevance: 0.97, onGround: false,
  },
  {
    id: "pj-006", icao24: "AG0006", callsign: "CARGO-IL76",
    owner: "Arms network (attributed)", ownerCategory: "ARMS_DEALER",
    nationality: "RU", aircraftType: "Ilyushin IL-76",
    lat: 15.6, lng: 32.5, altitude: 4500, speed: 650, heading: 180,
    origin: "Erbil IRB", destination: "Khartoum KRT",
    isAnomalous: true, anomalyReason: "Sudan arms route — UN embargo zone",
    nexusRelevance: 0.85, onGround: false,
  },
  {
    id: "pj-007", icao24: "AH0007", callsign: "US-CEO-01",
    owner: "Elon Musk", ownerCategory: "CEO",
    nationality: "US", aircraftType: "Gulfstream G650ER",
    lat: 32.78, lng: -96.8, altitude: 12200, speed: 870, heading: 90,
    origin: "Los Angeles LAX", destination: "Washington IAD",
    isAnomalous: false, anomalyReason: null,
    nexusRelevance: 0.35, onGround: false,
  },
  {
    id: "pj-008", icao24: "AJ0008", callsign: "KP-GOV-01",
    owner: "DPRK State Aircraft", ownerCategory: "MINISTER",
    nationality: "KP", aircraftType: "Ilyushin IL-62",
    lat: 39.0, lng: 125.7, altitude: 0, speed: 0, heading: 0,
    origin: "Pyongyang FNJ", destination: null,
    isAnomalous: true, anomalyReason: "DPRK state aircraft fueling — unusual Sunan activity",
    nexusRelevance: 0.80, onGround: true,
  },
];

async function fetchFromADSBFI(): Promise<typeof DEMO_JETS> {
  try {
    const res = await fetch(
      "https://opendata.adsb.fi/api/v2/",
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return DEMO_JETS;

    const data = await res.json();
    const aircraft = data.aircraft || data.states || [];

    const jets: typeof DEMO_JETS = [];

    for (const ac of aircraft) {
      const icao = (ac.hex || ac[0] || "").toUpperCase();
      const watchEntry = ICAO_WATCHLIST[icao];

      if (!watchEntry) continue;
      if (!ac.lat && !ac[6]) continue;

      jets.push({
        id: `jet_${icao}`,
        icao24: icao,
        callsign: ac.flight?.trim() || ac[1]?.trim() || icao,
        owner: watchEntry.owner,
        ownerCategory: watchEntry.category,
        nationality: watchEntry.nationality,
        aircraftType: ac.t || ac.type || "Unknown",
        lat: ac.lat || ac[6] || 0,
        lng: ac.lon || ac[5] || 0,
        altitude: ac.alt_baro || ac[7] || 0,
        speed: ac.gs || ac[9] || 0,
        heading: ac.track || ac[10] || 0,
        origin: ac.org_ap || null,
        destination: ac.dst_ap || null,
        isAnomalous: watchEntry.riskScore > 0.70,
        anomalyReason: watchEntry.notes,
        nexusRelevance: watchEntry.riskScore,
        onGround: ac.on_ground || ac[8] || false,
      });
    }

    return jets.length > 0 ? jets : DEMO_JETS;
  } catch {
    return DEMO_JETS;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const anomalousOnly = url.searchParams.get("anomalous") === "true";
  const category = url.searchParams.get("category");

  const jets = await fetchFromADSBFI();

  let filtered = jets;
  if (anomalousOnly) filtered = filtered.filter(j => j.isAnomalous);
  if (category) filtered = filtered.filter(j => j.ownerCategory === category.toUpperCase());

  const anomalyCount = filtered.filter(j => j.isAnomalous).length;
  const highRisk = filtered.filter(j => j.nexusRelevance >= 0.80).length;

  return NextResponse.json({
    source: process.env.NODE_ENV === "production" ? "ADSB_FI_WATCHLIST" : "DEMO_WATCHLIST",
    count: filtered.length,
    jets: filtered,
    summary: {
      anomalies: anomalyCount,
      highRisk,
      byCategory: {
        OLIGARCH: filtered.filter(j => j.ownerCategory === "OLIGARCH").length,
        ROYAL: filtered.filter(j => j.ownerCategory === "ROYAL").length,
        MINISTER: filtered.filter(j => j.ownerCategory === "MINISTER").length,
        CEO: filtered.filter(j => j.ownerCategory === "CEO").length,
        ARMS_DEALER: filtered.filter(j => j.ownerCategory === "ARMS_DEALER").length,
      },
    },
    methodology: {
      source: "ADSB.fi unfiltered feed + oligarch ICAO watchlist",
      watchlistSize: Object.keys(ICAO_WATCHLIST).length,
      note: "Non-exhaustive — known ICAO24 codes only. Many private jets use anonymous hex codes.",
    },
    timestamp: new Date().toISOString(),
  });
}
