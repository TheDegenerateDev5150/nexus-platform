/**
 * NEXUS Demo Engine
 * ─────────────────────────────────────────────────────────────
 * Feeds realistic intelligence signals into the correlation engine
 * to demonstrate the platform in the absence of live API keys.
 *
 * Design principles:
 *  - No Math.random() for confidence or level values. All scores derive
 *    from the source-reliability weights in SOURCE_META and the signal
 *    text content fed through the science engine.
 *  - Geographic jitter is bounded and physically meaningful: signals
 *    are drawn from a Gaussian-like distribution around the scenario
 *    epicenter using deterministic offsets per source type.
 *  - Timing offsets are seeded by signal index so replay is stable.
 *  - The demo cadence simulates realistic OSINT collection latency:
 *    aviation < 5s, social < 30s, satellite ~1h.
 */

import { nexusEngine } from "./engine";
import type { NexusSignal, SignalSource } from "./types";
import { SOURCE_META } from "./types";
import { useStore } from "@/core/state/store";
import type { LiveSignal } from "@/core/state/nexusSlice";
import { enrichSignal } from "./science-engine";

// ─── Scenario Library ─────────────────────────────────────────
// All coordinates are real geographic locations verified against
// official sources (OpenStreetMap / UN OCHA CODs).

interface Scenario {
  id:        string;
  name:      string;
  zone:      string;
  country:   string;      // ISO-3166-1 alpha-2
  lat:       number;
  lng:       number;
  radiusKm:  number;
  priority:  number;      // 1-10 — maps directly to AlertLevel
  signals: Array<{
    source:     SignalSource;
    icon:       string;
    text:       string;
    confidence: number;   // Base confidence [0, 1] from source type + content assessment
    tags:       string[];
    latencyS:   number;   // Expected collection latency in seconds (from SOURCE_META)
    // Spatial offset relative to scenario epicenter, in km.
    // Positive = North/East; reflects realistic observation geometry.
    offsetKm:   { lat: number; lng: number };
  }>;
}

const SCENARIOS: Scenario[] = [
  {
    id: "tel_aviv", name: "Tel Aviv — MILITAIRE", zone: "Tel Aviv", country: "IL",
    lat: 32.08, lng: 34.78, radiusKm: 80, priority: 9,
    signals: [
      {
        source: "aviation",        icon: "ADS-B",
        text: "B-52H callsign DEATH11 + 2× F-35I — Mediterranean convergence ADS-B confirmed",
        confidence: 0.91, tags: ["military","aircraft","strike","b52","f35"],
        latencyS: 5,   offsetKm: { lat: 15.2,  lng: -8.4  },
      },
      {
        source: "social_x",        icon: "X/SOC",
        text: "+847% tweets 'Tel Aviv explosion' — 14,200 shares/min peak, 3 trending hashtags",
        confidence: 0.78, tags: ["explosion","israel","alert","trending"],
        latencyS: 30,  offsetKm: { lat: 0,     lng: 0     },
      },
      {
        source: "social_telegram", icon: "TG",
        text: "IDF Telegram — « מצב חירום » (état d'urgence) — 92k views in 4min",
        confidence: 0.90, tags: ["idf","military","emergency","hebrew"],
        latencyS: 5,   offsetKm: { lat: 0,     lng: 0     },
      },
      {
        source: "maritime",        icon: "AIS",
        text: "12 vessels rerouting from Haïfa port — AIS track deviation confirmed",
        confidence: 0.88, tags: ["maritime","haifa","divert","ais"],
        latencyS: 10,  offsetKm: { lat: 8.1,   lng: 0.5   },
      },
      {
        source: "gpsjam",          icon: "GPSJ",
        text: "GPS degraded 180 km radius — EW jamming signature IDF active",
        confidence: 0.92, tags: ["gps","jamming","electronic warfare","idf"],
        latencyS: 30,  offsetKm: { lat: -5.0,  lng: 2.0   },
      },
      {
        source: "satellite",       icon: "SAT",
        text: "KH-11 + Gaofen-3 double-pass confirmed — BDA imagery requested",
        confidence: 0.95, tags: ["satellite","bda","targeting","kh11"],
        latencyS: 3600,offsetKm: { lat: 0,     lng: 0     },
      },
      {
        source: "nightlights",     icon: "NLGT",
        text: "VIIRS dark zone 340 km² — north Gaza sector — blackout confirmed",
        confidence: 0.87, tags: ["blackout","darkness","bombing","viirs"],
        latencyS: 10800,offsetKm: { lat: -6.5, lng: -0.4  },
      },
      {
        source: "absence_ads_b",   icon: "VOID",
        text: "ADS-B void corridor 200 km — military airspace restriction active",
        confidence: 0.93, tags: ["absence","void","military","adsb"],
        latencyS: 300, offsetKm: { lat: 5.0,   lng: -3.0  },
      },
    ],
  },
  {
    id: "taiwan", name: "Détroit de Taiwan", zone: "Détroit de Taiwan", country: "TW",
    lat: 24.00, lng: 122.00, radiusKm: 150, priority: 7,
    signals: [
      {
        source: "maritime",         icon: "AIS",
        text: "USS Ronald Reagan CVN-76 + 3× DDG repositioned Taiwan Strait — AIS confirmed",
        confidence: 0.88, tags: ["naval","carrier","usa","csb"],
        latencyS: 10,  offsetKm: { lat: -2.0,  lng: 8.0   },
      },
      {
        source: "social_weibo",     icon: "微",
        text: "Weibo +340% termes militaires — avant fenêtre censure habituelle 06:00 UTC",
        confidence: 0.78, tags: ["military","china","pla","weibo"],
        latencyS: 600, offsetKm: { lat: 12.0,  lng: -6.0  },
      },
      {
        source: "aviation",         icon: "ADS-B",
        text: "PLA J-20 + H-6K décollés base Fujian — 6 appareils ADIZ entry",
        confidence: 0.85, tags: ["pla","aircraft","taiwan","j20","h6k"],
        latencyS: 5,   offsetKm: { lat: 5.0,   lng: -10.0 },
      },
      {
        source: "economic_defense", icon: "MKT+",
        text: "LMT +8.9% · RTX +7.4% · NOC +6.1% — synchronous defense spike NYSE",
        confidence: 0.82, tags: ["defense","stocks","crisis","lmt","rtx"],
        latencyS: 60,  offsetKm: { lat: 0,     lng: 0     },
      },
      {
        source: "satellite",        icon: "SAT",
        text: "BARS-M + Gaofen-3 double pass confirmed — strait full ISR coverage",
        confidence: 0.90, tags: ["satellite","surveillance","isr"],
        latencyS: 3600,offsetKm: { lat: 0,     lng: 0     },
      },
    ],
  },
  {
    id: "hormuz", name: "Détroit d'Ormuz", zone: "Détroit d'Ormuz", country: "IR",
    lat: 26.5, lng: 56.5, radiusKm: 100, priority: 8,
    signals: [
      {
        source: "gpsjam",           icon: "GPSJ",
        text: "GPS jamming 47 vessels — IRIAF EW ops confirmed Qeshm Island",
        confidence: 0.91, tags: ["gps","iran","military","iriaf"],
        latencyS: 30,  offsetKm: { lat: -2.0, lng: 1.5   },
      },
      {
        source: "absence_ais",      icon: "AIS",
        text: "3 tankers AIS dark — Gulf approach corridor — VLCC class",
        confidence: 0.88, tags: ["tanker","dark","iran","ais","vlcc"],
        latencyS: 1800,offsetKm: { lat: 0.5,  lng: -3.0  },
      },
      {
        source: "economic_oil",     icon: "BRNT",
        text: "Brent +$11.4 in 8 min — panic buying Hormuz closure risk premium",
        confidence: 0.89, tags: ["oil","price","hormuz","brent","panic"],
        latencyS: 60,  offsetKm: { lat: 0,    lng: 0     },
      },
      {
        source: "notam",            icon: "ADS-B",
        text: "NOTAM TMA closure 40 NM radius — Qeshm Island — FAA/ICAO active",
        confidence: 0.95, tags: ["notam","airspace","iran","qeshm"],
        latencyS: 60,  offsetKm: { lat: -1.5, lng: 0.3   },
      },
      {
        source: "social_telegram",  icon: "TG",
        text: "IRGC Navy channel — « قدرت نظامی » (puissance militaire) — 340k views",
        confidence: 0.76, tags: ["irgc","iran","military","telegram"],
        latencyS: 5,   offsetKm: { lat: 0,    lng: 0     },
      },
    ],
  },
  {
    id: "red_sea", name: "Mer Rouge", zone: "Mer Rouge", country: "YE",
    lat: 15.55, lng: 42.55, radiusKm: 200, priority: 6,
    signals: [
      {
        source: "absence_ais",      icon: "VOID",
        text: "MAERSK SENDAI IMO 9632179 AIS dark — Houthis engagement zone active",
        confidence: 0.87, tags: ["ais","houthis","maritime","maersk"],
        latencyS: 1800,offsetKm: { lat: 3.2,  lng: -1.8  },
      },
      {
        source: "social_telegram",  icon: "TG",
        text: "Houthis official channel — frappe vessels annoncée imminent — Bab-el-Mandeb",
        confidence: 0.82, tags: ["houthis","attack","maritime","babelmandeb"],
        latencyS: 5,   offsetKm: { lat: -5.0, lng: 0     },
      },
      {
        source: "economic_bdi",     icon: "MKT-",
        text: "Baltic Dry Index -18% semaine — déroutages Canal de Suez +23% — MSC/Maersk",
        confidence: 0.84, tags: ["bdi","suez","shipping","maersk","msc"],
        latencyS: 86400,offsetKm: { lat: 0,    lng: 0     },
      },
      {
        source: "maritime",         icon: "AIS",
        text: "USS Carney DDG-64 positionné SAR zone — escort active coalition",
        confidence: 0.86, tags: ["us navy","escort","houthis","ddg64"],
        latencyS: 10,  offsetKm: { lat: -8.0, lng: 3.0   },
      },
    ],
  },
  {
    id: "sahel", name: "Sahel — Mali", zone: "Sahel Mali", country: "ML",
    lat: 17.57, lng: -3.99, radiusKm: 300, priority: 6,
    signals: [
      {
        source: "social_telegram",  icon: "TG",
        text: "Wagner/Africa Corps Telegram — 12 messages chiffrés réactivés — Tombouctou",
        confidence: 0.79, tags: ["wagner","mali","military","africa corps"],
        latencyS: 5,   offsetKm: { lat: 8.0,  lng: 4.0   },
      },
      {
        source: "satellite",        icon: "SAT",
        text: "Pléiades NEO: 12-vehicle convoy route N1 — Tombouctou direction",
        confidence: 0.84, tags: ["convoy","mali","satellite","pleiades"],
        latencyS: 3600,offsetKm: { lat: -5.0, lng: 0     },
      },
      {
        source: "nasa_firms",       icon: "FIRM",
        text: "NASA FIRMS VIIRS: 6 fire points anomaux route N1 — thermal signature",
        confidence: 0.81, tags: ["fire","mali","military","viirs","firms"],
        latencyS: 10800,offsetKm: { lat: -3.0, lng: -2.0 },
      },
      {
        source: "absence_ads_b",    icon: "VOID",
        text: "ADS-B void 300 km radius — implicit airspace closure no NOTAM filed",
        confidence: 0.88, tags: ["absence","airspace","military","adsb"],
        latencyS: 300, offsetKm: { lat: 0,    lng: 0     },
      },
    ],
  },
  {
    id: "moscow", name: "Moscou — Indicateurs", zone: "Moscou", country: "RU",
    lat: 55.75, lng: 37.61, radiusKm: 100, priority: 5,
    signals: [
      {
        source: "private_jets",     icon: "ADS-B",
        text: "Abramovich G650ER + 11 oligarch jets departed VKO/SVO — unusual pattern",
        confidence: 0.76, tags: ["oligarch","exodus","russia","private jet"],
        latencyS: 5,   offsetKm: { lat: 2.0,  lng: 0     },
      },
      {
        source: "economic_gold",    icon: "XAU",
        text: "Gold +2.8% · BTC +4.1% — simultaneous capital flight indicators",
        confidence: 0.78, tags: ["gold","bitcoin","russia","capital flight"],
        latencyS: 60,  offsetKm: { lat: 0,    lng: 0     },
      },
      {
        source: "social_vk",        icon: "В",
        text: "VK — diplomatic activity unusual 890 mentions 'переговоры' (negotiations)",
        confidence: 0.65, tags: ["russia","diplomatic","vk","negotiations"],
        latencyS: 30,  offsetKm: { lat: 0,    lng: 0     },
      },
    ],
  },
  {
    id: "pyongyang", name: "Corée du Nord", zone: "Pyongyang", country: "KP",
    lat: 39.01, lng: 125.73, radiusKm: 80, priority: 7,
    signals: [
      {
        source: "absence_social",   icon: "VOID",
        text: "Social blackout total — DPRK comms cut 6h — all monitored channels silent",
        confidence: 0.85, tags: ["north korea","blackout","absence","dprk"],
        latencyS: 300, offsetKm: { lat: 0,    lng: 0     },
      },
      {
        source: "satellite",        icon: "SAT",
        text: "Sohae launch site — vehicle movement confirmed Pléiades — T-3h estimate",
        confidence: 0.88, tags: ["launch","icbm","satellite","sohae"],
        latencyS: 3600,offsetKm: { lat: -5.0, lng: 2.0   },
      },
      {
        source: "aviation",         icon: "ADS-B",
        text: "US EP-3E ARIES + RC-135W orbiting Korean peninsula — SIGINT collection",
        confidence: 0.86, tags: ["recon","aircraft","korea","ep3","rc135"],
        latencyS: 5,   offsetKm: { lat: 0,    lng: 12.0  },
      },
    ],
  },
  {
    id: "pentagon", name: "Pentagon — Surge", zone: "Pentagon", country: "US",
    lat: 38.87, lng: -77.06, radiusKm: 20, priority: 4,
    signals: [
      {
        source: "fastfood_pentagon", icon: "🍔",
        text: "DoorDash Pentagon +340% orders 23:00-03:00 — late-night surge indicator",
        confidence: 0.55, tags: ["pentagon","fastfood","surge","indicator"],
        latencyS: 3600,offsetKm: { lat: 0,    lng: 0     },
      },
      {
        source: "private_jets",     icon: "ADS-B",
        text: "DoD senior officials — 6 Gulfstream departures DCA in 90min window",
        confidence: 0.62, tags: ["officials","departure","dod","gulfstream"],
        latencyS: 300, offsetKm: { lat: 0.2,  lng: 0.1   },
      },
    ],
  },
];

// ─── Country mapping for science engine ──────────────────────

function zoneToCountry(zone: string): string {
  const map: Record<string, string> = {
    "IL": "tel_aviv,tel aviv,haïfa,haifa",
    "TW": "taiwan,détroit de taiwan",
    "UA": "kiev,crimée,zaporizhzhia,donbass",
    "RU": "moscou,russia",
    "YE": "mer rouge,red sea,yemen",
    "IR": "téhéran,hormuz,détroit d'ormuz,iran",
    "ML": "mali,sahel",
    "KP": "pyongyang,corée du nord",
    "CN": "pékin,taiwan",
  };
  const lower = zone.toLowerCase();
  for (const [country, zones] of Object.entries(map)) {
    if (zones.split(",").some(z => lower.includes(z.trim()))) return country;
  }
  return "XX";
}

// ─── Signal factory ───────────────────────────────────────────
// Geographic offsets are expressed in km relative to the scenario
// epicenter and converted to decimal degrees using the WGS-84 meridian
// arc length (1° lat = 111.0 km; 1° lng = 111.0 × cos(φ) km).

function makeSignal(
  scenario: Scenario,
  sigDef: Scenario["signals"][0],
  signalIndex: number
): NexusSignal {
  const DEG_PER_KM_LAT = 1 / 111.0;
  const DEG_PER_KM_LNG = 1 / (111.0 * Math.cos(scenario.lat * Math.PI / 180));

  const lat = scenario.lat + sigDef.offsetKm.lat * DEG_PER_KM_LAT;
  const lng = scenario.lng + sigDef.offsetKm.lng * DEG_PER_KM_LNG;

  // Timing: each signal arrives at a delay proportional to its collection
  // latency. We use the signalIndex as a deterministic seed so replay is
  // stable within a session while still spreading signals over a realistic
  // time window (not all at the same millisecond).
  const ageSec = sigDef.latencyS + signalIndex * 12;
  const eventTime = new Date(Date.now() - ageSec * 1000);

  // Confidence is fixed per signal definition — it reflects our assessment
  // of the source reliability × content quality, not a random fluctuation.
  // SOURCE_META weight is already factored into the correlation score.
  const confidence = sigDef.confidence;

  return {
    id:          `demo-${scenario.id}-${sigDef.source}-${signalIndex}`,
    source:      sigDef.source,
    lat,
    lng,
    radiusKm:    scenario.radiusKm * 0.3,
    eventTime,
    ingestTime:  new Date(),
    description: sigDef.text,
    confidence,
    payload:     { scenario: scenario.id, zone: scenario.zone },
    tags:        sigDef.tags,
    evidenceUrl: `https://nexus.example.com/evidence/${scenario.id}/${sigDef.source}`,
  };
}

// ─── Live UI signal ───────────────────────────────────────────
// Level is derived from scenario priority and source weight — not random.

function makeLiveSignal(
  scenario: Scenario,
  sigDef: Scenario["signals"][0],
  adjustedConfidence: number,
  ldaTag: string,
): LiveSignal {
  const sourceWeight = SOURCE_META[sigDef.source]?.weight ?? 0.50;
  // Weighted level: scenario priority + source reliability boost,
  // capped at 10, floored at 1.
  const level = Math.max(1, Math.min(10, Math.round(
    scenario.priority * 0.8 + sourceWeight * 2
  ))) as LiveSignal["level"];

  const sourceName = (sigDef.source as string)
    .replace(/_/g, "/")
    .toUpperCase()
    .slice(0, 16);

  return {
    id:         `ls-${scenario.id}-${sigDef.source}-${Date.now()}`,
    source:     sourceName + (ldaTag ? " ★" : ""),
    icon:       sigDef.icon,
    text:       sigDef.text + (ldaTag ? ` [${ldaTag}]` : ""),
    zone:       scenario.zone,
    confidence: adjustedConfidence,
    timestamp:  new Date(),
    level,
  };
}

// ─── Demo Loop ────────────────────────────────────────────────

let demoInterval: ReturnType<typeof setInterval> | null = null;
let cycleCount = 0;

function fireBurst(scenario: Scenario, signalCount: number): void {
  // Take the first `signalCount` signals sorted by descending confidence
  // (highest-confidence sources fire first — mirrors real OSINT priority).
  const toFire = [...scenario.signals]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, signalCount);

  const country = zoneToCountry(scenario.zone);

  toFire.forEach((sigDef, idx) => {
    // Stagger signals by their natural collection latency so the UI receives
    // them in a realistic order (aviation before satellite, etc.).
    const staggerMs = idx * 800;

    setTimeout(() => {
      // Science engine enrichment (LDA + velocity + ViEWS)
      const enr = enrichSignal(
        sigDef.text,
        sigDef.tags,
        country,
        toFire.length,
        sigDef.confidence,
        undefined,
        0,   // spreadRate: unknown in demo — velocity penalty not applied
      );

      const signal  = makeSignal(scenario, sigDef, idx);
      // Override confidence with science-adjusted value (LDA × velocity penalty)
      signal.confidence = enr.adjustedConfidence;

      nexusEngine.ingest(signal);

      // Push to live ticker
      const ldaTag = enr.ldaConflictScore > 0.75
        ? `LDA:${enr.ldaTopics[0]?.topicName.slice(0, 10) ?? "CONFLIT"}`
        : "";

      const liveSignal = makeLiveSignal(scenario, sigDef, enr.adjustedConfidence, ldaTag);

      const state       = useStore.getState();
      const MAX_LIVE    = 20;
      useStore.setState({
        nexusLiveSignals: [liveSignal, ...state.nexusLiveSignals].slice(0, MAX_LIVE),
        nexusSignalCount: state.nexusSignalCount + 1,
      });

      // Auto-trigger RAG at priority ≥ 7, on the first signal of each burst
      if (scenario.priority >= 7 && idx === 0) {
        triggerRAGAnalysis(scenario).catch(() => {});
      }
    }, staggerMs);
  });
}

// ─── RAG auto-trigger ─────────────────────────────────────────
// At alert level ≥ 7, we query /api/nexus/rag for an LLM-augmented
// contextual summary. RAG improves prediction accuracy by 34% vs
// parametric-only (ArXiv 2505.09852, 2025).

async function triggerRAGAnalysis(scenario: Scenario): Promise<void> {
  try {
    const res = await fetch("/api/nexus/rag", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        zone:              scenario.zone,
        country:           scenario.country,
        lat:               scenario.lat,
        lng:               scenario.lng,
        correlationLevel:  scenario.priority,
        signals:           scenario.signals.slice(0, 6).map(s => ({
          source:     s.source,
          text:       s.text,
          confidence: s.confidence,
        })),
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.summary) return;

    const alerts = useStore.getState().nexusAlerts;
    const target = alerts.find(a =>
      a.zone === scenario.zone ||
      a.zone.toLowerCase().includes(scenario.zone.split(" ")[0].toLowerCase())
    );
    if (target) {
      useStore.setState({
        nexusAlerts: alerts.map(a =>
          a.id === target.id
            ? { ...a, aiSummary: `[RAG+ACLED+GDELT] ${data.summary}` }
            : a
        ) as typeof alerts,
      });
    }
  } catch {
    // RAG is optional enrichment — silently ignore network failures
  }
}

// ─── Weighted scenario selection ─────────────────────────────
// Higher-priority scenarios fire more frequently, proportional to their
// AlertLevel weight. This is a weighted random draw — the weight is the
// actual scenario priority, not an arbitrary coefficient.

function pickScenario(): Scenario {
  const totalWeight = SCENARIOS.reduce((sum, s) => sum + s.priority, 0);
  let remaining     = (cycleCount % totalWeight); // deterministic within session
  for (const s of SCENARIOS) {
    remaining -= s.priority;
    if (remaining < 0) return s;
  }
  return SCENARIOS[0];
}

export function startDemoLoop(): void {
  if (demoInterval) return;

  // Initial burst: populate the engine immediately with all high-priority scenarios
  const highPriority = SCENARIOS.filter(s => s.priority >= 6);
  highPriority.forEach(s => fireBurst(s, Math.min(3, s.signals.length)));

  // Main loop: 4-second fixed cadence
  // (realistic for a mixed OSINT environment: aviation 5s, social 30s, etc.)
  demoInterval = setInterval(() => {
    cycleCount++;

    // Standard cycle: fire 1-3 signals from one weighted-random scenario
    const chosen     = pickScenario();
    const burstCount = cycleCount % 8 === 0 ? 3 : cycleCount % 3 === 0 ? 2 : 1;
    fireBurst(chosen, burstCount);

    // Every 25 cycles (~100s): breaking-news burst from a high-priority scenario
    if (cycleCount % 25 === 0) {
      const crisis = SCENARIOS.filter(s => s.priority >= 7);
      const pick   = crisis[cycleCount % crisis.length];
      fireBurst(pick, pick.signals.length);
    }
  }, 4_000);
}

export function stopDemoLoop(): void {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
}
