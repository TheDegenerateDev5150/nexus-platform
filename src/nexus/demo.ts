/**
 * NEXUS Demo Engine
 * ─────────────────────────────────────────────────────────────
 * Continuously fires realistic intelligence signals into the
 * correlation engine so the platform feels fully alive in demo.
 *
 * Scenarios rotate on a realistic cadence — escalation, de-escalation,
 * breaking news bursts, absence signals, economic shocks.
 */

import { nexusEngine } from "./engine";
import type { NexusSignal, SignalSource } from "./types";
import { useStore } from "@/core/state/store";
import type { LiveSignal } from "@/core/state/nexusSlice";
import { enrichSignal, scoreLDA, analyzeVelocity, predictViEWS, detectCIB } from "./science-engine";

// ─── Scenario Library ─────────────────────────────────────────

interface Scenario {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  radiusKm: number;
  priority: number; // 1-10
  signals: Array<{
    source: SignalSource;
    icon: string;
    text: string;
    confidence: number;
    tags: string[];
    weight?: number; // probability of firing (0-1)
  }>;
}

const SCENARIOS: Scenario[] = [
  {
    id: "tel_aviv",
    name: "Tel Aviv — MILITAIRE",
    zone: "Tel Aviv",
    lat: 32.08, lng: 34.78, radiusKm: 80,
    priority: 9,
    signals: [
      { source: "aviation",        icon: "✈️", text: "B-52H + F-35 convergence Mediterranean — ADS-B", confidence: 0.91, tags: ["military","aircraft","strike"], weight: 0.7 },
      { source: "social_x",        icon: "📢", text: "+847% tweets 'Tel Aviv explosion' — 14,200 shares/min", confidence: 0.85, tags: ["explosion","israel","alert"], weight: 0.8 },
      { source: "social_tiktok",   icon: "📹", text: "3 vidéos confirmées CV smoke+military — Tel Aviv", confidence: 0.82, tags: ["explosion","smoke","military"], weight: 0.6 },
      { source: "social_telegram", icon: "📡", text: "IDF Telegram — « מצב חירום » (état d'urgence)", confidence: 0.90, tags: ["idf","military","emergency"], weight: 0.75 },
      { source: "maritime",        icon: "🚢", text: "12 navires déroutent port de Haïfa — AIS", confidence: 0.88, tags: ["maritime","haifa","divert"], weight: 0.65 },
      { source: "gpsjam",          icon: "⚡", text: "GPS degraded 180km radius — EW jamming IDF", confidence: 0.92, tags: ["gps","jamming","electronic warfare"], weight: 0.8 },
      { source: "satellite",       icon: "🛰️", text: "KH-11 + Gaofen-3 double-pass — BDA probable", confidence: 0.95, tags: ["satellite","bda","targeting"], weight: 0.5 },
      { source: "nightlights",     icon: "🌑", text: "VIIRS dark zone 340km² — north Gaza sector", confidence: 0.87, tags: ["blackout","darkness","bombing"], weight: 0.55 },
      { source: "absence_ads_b",   icon: "🔇", text: "ADS-B void 200km — military corridor active", confidence: 0.93, tags: ["absence","void","military"], weight: 0.6 },
    ],
  },
  {
    id: "taiwan",
    name: "Détroit de Taiwan",
    zone: "Détroit de Taiwan",
    lat: 23.69, lng: 120.96, radiusKm: 150,
    priority: 7,
    signals: [
      { source: "maritime",        icon: "🚢", text: "USS Ronald Reagan + 3 DDG repositioned Taiwan Strait", confidence: 0.88, tags: ["naval","carrier","usa"], weight: 0.7 },
      { source: "social_weibo",    icon: "微", text: "Weibo +340% military terms — avant fenêtre censure", confidence: 0.78, tags: ["military","china","pla"], weight: 0.65 },
      { source: "aviation",        icon: "✈️", text: "PLA J-20 + H-6K décollés base Fujian", confidence: 0.85, tags: ["pla","aircraft","taiwan"], weight: 0.7 },
      { source: "economic_defense",icon: "📈", text: "LMT +8.9% · RTX +7.4% — synchronous spike", confidence: 0.82, tags: ["defense","stocks","crisis"], weight: 0.75 },
      { source: "satellite",       icon: "🛰️", text: "BARS-M + Gaofen double pass — strait coverage", confidence: 0.90, tags: ["satellite","surveillance"], weight: 0.5 },
    ],
  },
  {
    id: "hormuz",
    name: "Détroit d'Ormuz",
    zone: "Détroit d'Ormuz",
    lat: 26.5, lng: 56.5, radiusKm: 100,
    priority: 8,
    signals: [
      { source: "gpsjam",          icon: "⚡", text: "GPS jamming 47 vessels — IRIAF EW ops confirmed", confidence: 0.91, tags: ["gps","iran","military"], weight: 0.8 },
      { source: "absence_ais",     icon: "🚢", text: "3 tankers AIS dark — Gulf approach corridor", confidence: 0.88, tags: ["tanker","dark","iran"], weight: 0.7 },
      { source: "economic_oil",    icon: "🛢️", text: "Brent +$11.4 in 8min — panic buying Hormuz risk", confidence: 0.89, tags: ["oil","price","hormuz"], weight: 0.85 },
      { source: "aviation",        icon: "✈️", text: "NOTAM TMA closure 40nm radius — Qeshm island", confidence: 0.92, tags: ["notam","airspace","iran"], weight: 0.6 },
      { source: "social_telegram", icon: "📡", text: "IRGC Navy channel — « قدرت نظامی » (puissance militaire)", confidence: 0.76, tags: ["irgc","iran","military"], weight: 0.65 },
    ],
  },
  {
    id: "red_sea",
    name: "Mer Rouge",
    zone: "Mer Rouge",
    lat: 15.55, lng: 42.55, radiusKm: 200,
    priority: 6,
    signals: [
      { source: "absence_ais",     icon: "🔇", text: "MAERSK SENDAI AIS dark — Houthis zone active", confidence: 0.87, tags: ["ais","houthis","maritime"], weight: 0.75 },
      { source: "social_telegram", icon: "📡", text: "Houthis Telegram — annonce frappe vessels imminent", confidence: 0.82, tags: ["houthis","attack","maritime"], weight: 0.7 },
      { source: "economic_bdi",    icon: "📉", text: "BDI -18% semaine — déroutages Suez +23%", confidence: 0.84, tags: ["bdi","suez","shipping"], weight: 0.8 },
      { source: "maritime",        icon: "🚢", text: "USS Carney positionné SAR zone — escort active", confidence: 0.86, tags: ["us navy","escort","houthis"], weight: 0.6 },
    ],
  },
  {
    id: "sahel",
    name: "Sahel — Mali",
    zone: "Sahel — Mali",
    lat: 17.57, lng: -3.99, radiusKm: 300,
    priority: 6,
    signals: [
      { source: "social_telegram", icon: "📡", text: "Wagner Telegram — 12 messages chiffrés réactivés", confidence: 0.79, tags: ["wagner","mali","military"], weight: 0.75 },
      { source: "satellite",       icon: "🛰️", text: "Pleiades: 12-vehicle convoy route Tombouctou N1", confidence: 0.84, tags: ["convoy","mali","satellite"], weight: 0.65 },
      { source: "nasa_firms",      icon: "🔥", text: "NASA FIRMS 6 fire points anormaux route N1", confidence: 0.81, tags: ["fire","mali","military"], weight: 0.7 },
      { source: "absence_ads_b",   icon: "🔇", text: "ADS-B void 300km radius — implicit airspace closure", confidence: 0.88, tags: ["absence","airspace","military"], weight: 0.6 },
    ],
  },
  {
    id: "moscow",
    name: "Moscou — Politique",
    zone: "Moscou",
    lat: 55.75, lng: 37.61, radiusKm: 100,
    priority: 5,
    signals: [
      { source: "private_jets",    icon: "✈️", text: "Abramovich G650ER + 11 oligarch jets — unusual departures", confidence: 0.76, tags: ["oligarch","exodus","russia"], weight: 0.7 },
      { source: "economic_gold",   icon: "💰", text: "Gold +2.8% · BTC +4.1% — simultaneous capital flight", confidence: 0.78, tags: ["gold","bitcoin","russia"], weight: 0.75 },
      { source: "social_vk",       icon: "В", text: "VK — diplomatic activity unusual 890 mentions", confidence: 0.65, tags: ["russia","diplomatic","vk"], weight: 0.6 },
    ],
  },
  {
    id: "pyongyang",
    name: "Corée du Nord",
    zone: "Pyongyang",
    lat: 39.01, lng: 125.73, radiusKm: 80,
    priority: 7,
    signals: [
      { source: "absence_social",  icon: "🔇", text: "Social silence totale — DPRK comms blackout 6h", confidence: 0.85, tags: ["north korea","blackout","absence"], weight: 0.8 },
      { source: "satellite",       icon: "🛰️", text: "Sohae launch site — vehicle movement Pleiades", confidence: 0.88, tags: ["launch","icbm","satellite"], weight: 0.6 },
      { source: "aviation",        icon: "✈️", text: "US EP-3 recon + RC-135 orbiting Korean peninsula", confidence: 0.86, tags: ["recon","aircraft","korea"], weight: 0.65 },
    ],
  },
  {
    id: "pentagon",
    name: "Pentagon — Surge",
    zone: "Pentagon",
    lat: 38.87, lng: -77.06, radiusKm: 20,
    priority: 4,
    signals: [
      { source: "fastfood_pentagon",icon: "🍔", text: "DoorDash Pentagon +340% orders — late-night surge", confidence: 0.55, tags: ["pentagon","fastfood","surge"], weight: 0.5 },
      { source: "private_jets",    icon: "✈️", text: "DoD senior officials Gulfstream departures +6", confidence: 0.62, tags: ["officials","departure","dod"], weight: 0.45 },
    ],
  },
];

// ─── Live Signal Feed Injection ───────────────────────────────

function makeSignal(scenario: Scenario, sigDef: Scenario["signals"][0]): NexusSignal {
  const jitterKm = (Math.random() - 0.5) * scenario.radiusKm * 0.4;
  return {
    id: `demo-${scenario.id}-${sigDef.source}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    source: sigDef.source,
    lat: scenario.lat + (jitterKm / 111),
    lng: scenario.lng + (jitterKm / (111 * Math.cos(scenario.lat * Math.PI / 180))),
    radiusKm: scenario.radiusKm * 0.3,
    eventTime: new Date(Date.now() - Math.random() * 8 * 60 * 1000),
    ingestTime: new Date(),
    description: sigDef.text,
    confidence: sigDef.confidence * (0.9 + Math.random() * 0.1),
    payload: { scenario: scenario.id, zone: scenario.zone },
    tags: sigDef.tags,
    evidenceUrl: `https://nexus.example.com/evidence/${scenario.id}/${sigDef.source}`,
  };
}

function makeLiveSignalUI(scenario: Scenario, sigDef: Scenario["signals"][0]): LiveSignal {
  return {
    id: `ls-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    source: (sigDef.source as string).replace("_", "/").toUpperCase().slice(0, 16),
    icon: sigDef.icon,
    text: sigDef.text,
    zone: scenario.zone,
    confidence: sigDef.confidence,
    timestamp: new Date(),
    level: Math.min(10, Math.max(3, scenario.priority + Math.floor(Math.random() * 2 - 1))) as LiveSignal["level"],
  };
}

// ─── Demo Loop ────────────────────────────────────────────────

let demoInterval: ReturnType<typeof setInterval> | null = null;
let cycleCount = 0;

function fireBurst(scenario: Scenario, count: number) {
  const eligible = scenario.signals.filter(s => Math.random() < (s.weight ?? 0.65));
  const toFire = eligible.slice(0, count);

  toFire.forEach((sigDef, i) => {
    setTimeout(() => {
      // ── Science enrichment (MIT/Harvard/PRIO/Cambridge) ──────
      const enr = enrichSignal(
        sigDef.text,
        sigDef.tags,
        // Derive country from zone name
        scenario.zone.includes("Gaza") || scenario.zone.includes("Tel Aviv") ? "IL" :
        scenario.zone.includes("Taiwan") ? "TW" :
        scenario.zone.includes("Ukraine") || scenario.zone.includes("Kiev") ? "UA" :
        scenario.zone.includes("Moscou") || scenario.zone.includes("Russia") ? "RU" :
        scenario.zone.includes("Mer Rouge") || scenario.zone.includes("Yemen") ? "YE" :
        scenario.zone.includes("Téhéran") || scenario.zone.includes("Iran") ? "IR" :
        scenario.zone.includes("Mali") || scenario.zone.includes("Sahel") ? "ML" : "XX",
        eligible.length,
        sigDef.confidence,
        undefined,
        Math.floor(Math.random() * 50), // spreadRate
      );

      const signal = makeSignal(scenario, sigDef);
      // Apply adjusted confidence from science engine
      signal.confidence = Math.max(0.1, enr.adjustedConfidence);
      nexusEngine.ingest(signal);

      // Also push to live UI feed with science metadata
      const liveSignal: LiveSignal = {
        id: `ls-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        source: (sigDef.source as string).replace("_", "/").toUpperCase().slice(0, 16) +
          (enr.ldaConflictScore > 0.8 ? " ★" : ""),
        icon: sigDef.icon,
        text: sigDef.text + (enr.ldaTopics[0] ? ` [LDA:${enr.ldaTopics[0].topicName.slice(0,12)}]` : ""),
        zone: scenario.zone,
        confidence: enr.adjustedConfidence,
        timestamp: new Date(),
        level: Math.min(10, Math.max(3, scenario.priority + Math.floor(Math.random() * 2 - 1))) as LiveSignal["level"],
      };
      const state = useStore.getState();
      const currentSignals = state.nexusLiveSignals;
      const MAX_LIVE = 20;
      useStore.setState({
        nexusLiveSignals: [liveSignal, ...currentSignals].slice(0, MAX_LIVE),
        nexusSignalCount: state.nexusSignalCount + 1,
      });

      // Auto-trigger RAG at level 7+ (fire-and-forget)
      if (scenario.priority >= 7 && i === 0) {
        triggerRAGAnalysis(scenario).catch(() => {});
      }
    }, i * 600 + Math.random() * 400);
  });
}

// ─── RAG auto-trigger at level 7+ ─────────────────────────────
// ArXiv 2025: RAG améliore prédiction de +34% vs paramétrique

async function triggerRAGAnalysis(scenario: Scenario) {
  try {
    const country =
      scenario.zone.includes("Gaza") || scenario.zone.includes("Tel Aviv") ? "IL" :
      scenario.zone.includes("Taiwan") ? "TW" :
      scenario.zone.includes("Ukraine") || scenario.zone.includes("Kiev") ? "UA" :
      scenario.zone.includes("Moscou") ? "RU" :
      scenario.zone.includes("Mer Rouge") ? "YE" :
      scenario.zone.includes("Iran") || scenario.zone.includes("Téhéran") ? "IR" :
      scenario.zone.includes("Mali") || scenario.zone.includes("Sahel") ? "ML" : "XX";

    const res = await fetch("/api/nexus/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone: scenario.zone,
        country,
        lat: scenario.lat,
        lng: scenario.lng,
        correlationLevel: scenario.priority,
        signals: scenario.signals.slice(0, 6).map(s => ({ source: s.source, text: s.text })),
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.summary) {
      const alerts = useStore.getState().nexusAlerts;
      const matchingAlert = alerts.find(a => a.zone === scenario.zone || a.zone.includes(scenario.zone.split(" ")[0]));
      if (matchingAlert) {
        useStore.setState({
          nexusAlerts: alerts.map(a =>
            a.id === matchingAlert.id
              ? { ...a, aiSummary: `[RAG+ACLED+GDELT] ${data.summary}` }
              : a
          ) as typeof alerts,
        });
      }
    }
  } catch {}
}

export function startDemoLoop() {
  if (demoInterval) return;

  // Fire an initial burst to populate the engine
  const priority = SCENARIOS.filter(s => s.priority >= 6);
  priority.forEach(s => fireBurst(s, 3));

  demoInterval = setInterval(() => {
    cycleCount++;

    // Every cycle: pick 1-2 scenarios weighted by priority
    const weights = SCENARIOS.map(s => s.priority);
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    let chosen: Scenario | null = null;
    for (let i = 0; i < SCENARIOS.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosen = SCENARIOS[i]; break; }
    }
    if (!chosen) chosen = SCENARIOS[0];

    // Fire 1-4 signals from this scenario
    const count = cycleCount % 10 === 0 ? 4 : Math.floor(Math.random() * 3) + 1;
    fireBurst(chosen, count);

    // Every 30 cycles (~90s): escalate a random scenario
    if (cycleCount % 30 === 0) {
      const esc = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
      fireBurst(esc, esc.signals.length); // full burst = "breaking news"
    }

  }, 3000 + Math.random() * 2000); // 3-5s cadence
}

export function stopDemoLoop() {
  if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
}
