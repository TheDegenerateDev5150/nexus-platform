import type { StateCreator } from "zustand";
import type { AppStore } from "./store";
import type { NexusEvent, SourceHealth, AgentTask } from "@/nexus/types";

export type AlertLevel = 1|2|3|4|5|6|7|8|9|10;
export type AlertType = "MILITAIRE"|"GÉOPOLITIQUE"|"CONFLIT_ARMÉ"|"MARITIME"|"NATUREL"|"CYBER"|"ÉCONOMIQUE"|"ABSENCE_SIGNAL"|"TERRORISME"|"SURVEILLANCE";

export interface NexusSignalUI {
  icon: string;
  text: string;
  source: string;
}

export interface NexusAlert {
  id: string;
  level: AlertLevel;
  zone: string;
  country: string;
  lat: number;
  lng: number;
  type: AlertType;
  signals: NexusSignalUI[];
  confidence: number;
  similarEvent: string|null;
  timestamp: Date;
  acknowledged: boolean;
  swarmActive: boolean;
  reportId?: string;
  /** 6 correlation dimensions */
  correlation: {
    spatial: number; temporal: number; semantic: number;
    behavioral: number; historical: number; sourceDiv: number;
  };
  historicalMatches: Array<{ name: string; similarity: number; date: string; outcome: string }>;
  aiSummary: string;
}

export interface LiveSignal {
  id: string;
  source: string;
  icon: string;
  text: string;
  zone: string;
  confidence: number;
  timestamp: Date;
  level: AlertLevel;
}

export interface TelegramNotif {
  id: string;
  time: string;
  level: AlertLevel;
  zone: string;
  summary: string;
  alertId: string;
}

export interface SocialSource {
  platform: string;
  icon: string;
  volume: number;
  delta: string;
  hot: boolean;
  trend: number[];
}

export interface EconomicIndicator {
  id: string;
  name: string;
  symbol: string;
  value: number;
  changePercent: number;
  anomalyScore: number;
  signal: string;
  history: number[];
  geoZone: string;
}

export interface IntelReport {
  id: string;
  eventId: string;
  zone: string;
  level: AlertLevel;
  category: string;
  generatedAt: Date;
  summary: string;
  sections: Array<{ title: string; content: string }>;
  signalCount: number;
  confidence: number;
}

// ─── Mock data ────────────────────────────────────────────────

// Fixed epoch for mock data — keeps server and client renders identical (no hydration mismatch)
const BASE_EPOCH = 1741800000000; // 2025-03-12 12:00:00 UTC — immutable
const ago = (ms: number) => new Date(BASE_EPOCH - ms);

const MOCK_ALERTS: NexusAlert[] = [
  {
    id: "alert-1", level: 9, zone: "Tel Aviv", country: "IL",
    lat: 32.08, lng: 34.78, type: "MILITAIRE",
    signals: [
      { icon: "✈️", text: "12 avions militaires US B-52/F-35 → Méd. Est ADS-B", source: "aviation" },
      { icon: "📢", text: "+847% tweets Tel Aviv — alerte sirènes / 14,200 shares", source: "social_x" },
      { icon: "📹", text: "3 vidéos explosions TikTok CV-confirmées (smoke+crowd)", source: "social_tiktok" },
      { icon: "📡", text: "4 canaux Telegram IDF + sécurité actifs — 340 msgs/h", source: "social_telegram" },
      { icon: "🚢", text: "Navires déroutés port Haïfa — AIS position change ×12", source: "maritime" },
      { icon: "⚡", text: "GPS dégradé 180km rayon — brouillage EW IDF confirmé", source: "gpsjam" },
      { icon: "🛰️", text: "KH-11 USA-245 + Gaofen-3 stackent zone — BDA probable", source: "satellite" },
      { icon: "🌑", text: "NASA VIIRS — zones dark détectées secteur nord Gaza", source: "nightlights" },
    ],
    confidence: 94,
    similarEvent: "7 Oct 2023 — 78%",
    timestamp: ago(5*60000),
    acknowledged: false,
    swarmActive: true,
    correlation: { spatial: 0.92, temporal: 0.88, semantic: 0.95, behavioral: 0.87, historical: 0.82, sourceDiv: 0.97 },
    historicalMatches: [
      { name: "7 Octobre 2023", similarity: 0.78, date: "2023-10-07", outcome: "Attaque surprise — 1,200 victimes" },
      { name: "Opération Epic Fury", similarity: 0.71, date: "2026-02-28", outcome: "Frappes US-Israël sites nucléaires" },
    ],
    aiSummary: "Convergence exceptionnelle de 8 sources indépendantes sur Tel Aviv. Pattern identique à 7 Oct 2023 à 78%. GPS jamming + ADS-B militaire + réseaux sociaux saturés = frappe en cours ou imminente. Swarm déclenché — archivage automatique actif.",
  },
  {
    id: "alert-2", level: 7, zone: "Détroit de Taiwan", country: "TW",
    lat: 23.69, lng: 120.96, type: "GÉOPOLITIQUE",
    signals: [
      { icon: "🚢", text: "USS Ronald Reagan + 3 destroyers repositionnés détroit", source: "maritime" },
      { icon: "📢", text: "Weibo +340% termes militaires (avant fenêtre censure)", source: "social_weibo" },
      { icon: "✈️", text: "Avions PLA J-20 décollés base Fujian — cap Taiwan", source: "aviation" },
      { icon: "📈", text: "Pétrole +5.2% · actions défense +8.9% simultanés", source: "economic_defense" },
      { icon: "🛰️", text: "BARS-M + Gaofen-3 doubles passages détroit en 4h", source: "satellite" },
    ],
    confidence: 81,
    similarEvent: "Août 2022 — 71%",
    timestamp: ago(14*60000),
    acknowledged: false,
    swarmActive: false,
    correlation: { spatial: 0.84, temporal: 0.79, semantic: 0.88, behavioral: 0.75, historical: 0.71, sourceDiv: 0.83 },
    historicalMatches: [
      { name: "Taiwan Strait — Août 2022", similarity: 0.71, date: "2022-08-02", outcome: "Exercices PLA après visite Pelosi" },
    ],
    aiSummary: "5 sources indépendantes convergent sur le détroit. Exercices PLA ou escalade réelle. Marchés anticipent (pétrole +5.2% = marché price une perturbation Malacca). Pattern: Août 2022 à 71%.",
  },
  {
    id: "alert-3", level: 6, zone: "Sahel — Mali", country: "ML",
    lat: 17.57, lng: -3.99, type: "CONFLIT_ARMÉ",
    signals: [
      { icon: "📡", text: "Canaux Telegram Wagner réactivés — 12 messages chiffrés", source: "social_telegram" },
      { icon: "🛰️", text: "Convois 12 véhicules route Tombouctou — Pleiades", source: "satellite" },
      { icon: "🔥", text: "NASA FIRMS 6 points incendies anormaux route N1", source: "nasa_firms" },
      { icon: "✈️", text: "Absence ADS-B rayon 300km — espace aérien fermé implicite", source: "absence_ads_b" },
    ],
    confidence: 73,
    similarEvent: null,
    timestamp: ago(32*60000),
    acknowledged: false,
    swarmActive: false,
    correlation: { spatial: 0.76, temporal: 0.71, semantic: 0.69, behavioral: 0.62, historical: 0.55, sourceDiv: 0.72 },
    historicalMatches: [],
    aiSummary: "Réactivation Wagner corrélée avec mouvement satellite + incendies FIRMS. Absence ADS-B zone = opération en cours. Niveau 6 — surveillance renforcée recommandée.",
  },
  {
    id: "alert-4", level: 5, zone: "Moscou", country: "RU",
    lat: 55.75, lng: 37.61, type: "GÉOPOLITIQUE",
    signals: [
      { icon: "✈️", text: "Jets privés oligarques +12 décollages anormaux 6h", source: "private_jets" },
      { icon: "💱", text: "Or +2.8% · BTC +4.1% simultanés — fuite capitaux", source: "economic_gold" },
      { icon: "📢", text: "VK activité diplomatique inhabituelle — 890 mentions", source: "social_vk" },
    ],
    confidence: 68,
    similarEvent: "Fév 2022 — 64%",
    timestamp: ago(53*60000),
    acknowledged: true,
    swarmActive: false,
    correlation: { spatial: 0.70, temporal: 0.65, semantic: 0.60, behavioral: 0.58, historical: 0.64, sourceDiv: 0.60 },
    historicalMatches: [
      { name: "Invasion Ukraine — Fév 2022", similarity: 0.64, date: "2022-02-24", outcome: "Invasion russe à grande échelle" },
    ],
    aiSummary: "Fuite capitaux oligarques correlée avec or/crypto. Signal indirect fort. Pattern pré-crise fév 2022 à 64%. Niveau 5 — watch.",
  },
  {
    id: "alert-5", level: 4, zone: "Mer Rouge", country: "YE",
    lat: 15.55, lng: 42.55, type: "MARITIME",
    signals: [
      { icon: "🚢", text: "AIS dark — 3 cargo désactivent transpondeurs zone sud", source: "absence_ais" },
      { icon: "📡", text: "Telegram Houthis — annonce frappe imminente vessels", source: "social_telegram" },
      { icon: "📈", text: "BDI -18% semaine — déroutages Suez +23% confirmés", source: "economic_bdi" },
    ],
    confidence: 61,
    similarEvent: "Déc 2023 — 83%",
    timestamp: ago(77*60000),
    acknowledged: true,
    swarmActive: false,
    correlation: { spatial: 0.65, temporal: 0.60, semantic: 0.72, behavioral: 0.55, historical: 0.83, sourceDiv: 0.58 },
    historicalMatches: [
      { name: "Houthis Mer Rouge — Déc 2023", similarity: 0.83, date: "2023-12-15", outcome: "Déroutages cargo +23%" },
    ],
    aiSummary: "AIS dark corrélé avec annonce Houthis et chute BDI. Crise en cours documentée. Niveau 4 — contexte stable mais surveillance maritime active.",
  },
];

const MOCK_LIVE_SIGNALS: LiveSignal[] = [
  { id: "ls-1", source: "ADS-B", icon: "✈️", text: "B-52H — Dyess AFB décollage non planifié", zone: "Texas", confidence: 0.91, timestamp: ago(90000), level: 7 },
  { id: "ls-2", source: "Telegram", icon: "📡", text: "Canal @IDF_Updates: « מצב חירום »", zone: "Tel Aviv", confidence: 0.88, timestamp: ago(95000), level: 8 },
  { id: "ls-3", source: "GPS Jam", icon: "⚡", text: "NAC dégradé 47 aéronefs — Gaza-Liban rayon 180km", zone: "Liban", confidence: 0.92, timestamp: ago(110000), level: 7 },
  { id: "ls-4", source: "Twitter/X", icon: "📢", text: "+847% mentions 'explosion' Tel Aviv en 4min", zone: "Tel Aviv", confidence: 0.85, timestamp: ago(125000), level: 8 },
  { id: "ls-5", source: "NORAD TLE", icon: "🛰️", text: "KH-11 USA-245 survol zone frappe +2 passages", zone: "Irak/Iran", confidence: 0.95, timestamp: ago(140000), level: 6 },
  { id: "ls-6", source: "NASA VIIRS", icon: "🌑", text: "Zone dark 340km² — secteur nord Gaza", zone: "Gaza", confidence: 0.87, timestamp: ago(160000), level: 7 },
  { id: "ls-7", source: "AIS", icon: "🚢", text: "MAERSK SENDAI AIS dark — Mer Rouge zone Houthis", zone: "Mer Rouge", confidence: 0.88, timestamp: ago(200000), level: 5 },
  { id: "ls-8", source: "GDELT", icon: "📰", text: "GDELT surge: 'strike' 'Israel' 4200 articles/15min", zone: "Global", confidence: 0.75, timestamp: ago(240000), level: 6 },
  { id: "ls-9", source: "ADS-B Absence", icon: "🔇", text: "Void ADS-B 340km³ — Gulf approach corridor", zone: "Golfe Persique", confidence: 0.94, timestamp: ago(270000), level: 8 },
  { id: "ls-10", source: "Brent", icon: "🛢️", text: "Brent spike +$11.4 en 8min — achat panique", zone: "Marchés", confidence: 0.88, timestamp: ago(310000), level: 7 },
  { id: "ls-11", source: "TikTok CV", icon: "📹", text: "CV smoke+military detected — 3 vidéos géolocalisées", zone: "Tel Aviv", confidence: 0.84, timestamp: ago(350000), level: 7 },
  { id: "ls-12", source: "Jets Privés", icon: "✈️", text: "Abramovich G650ER Dubai → Dubaï → Inconnu", zone: "Moscou", confidence: 0.71, timestamp: ago(420000), level: 4 },
];

const MOCK_AGENTS: AgentTask[] = [
  { id: "task-alert-1-collect",  eventId: "alert-1", type: "collect",   status: "done",    startTime: ago(180000), endTime: ago(50000),  result: "347 signaux archivés — caches ADS-B/AIS/social capturés" },
  { id: "task-alert-1-archive",  eventId: "alert-1", type: "archive",   status: "done",    startTime: ago(175000), endTime: ago(45000),  result: "Archive immuable créée — SHA256 vérifié, 12.4 MB" },
  { id: "task-alert-1-translate",eventId: "alert-1", type: "translate", status: "running", startTime: ago(60000),  result: undefined },
  { id: "task-alert-1-geolocate",eventId: "alert-1", type: "geolocate", status: "running", startTime: ago(45000),  result: undefined },
  { id: "task-alert-1-report",   eventId: "alert-1", type: "report",    status: "pending", startTime: ago(10000),  result: undefined },
];

const MOCK_ECONOMIC: EconomicIndicator[] = [
  { id: "brent",  name: "Pétrole Brent", symbol: "BRN", value: 98.42, changePercent: +12.02, anomalyScore: 0.87, signal: "Spike Ormuz +12%", history: [82,83,85,84,86,88,87,90,92,98], geoZone: "Détroit d'Ormuz" },
  { id: "gold",   name: "Or / XAU",      symbol: "XAU", value: 2847,  changePercent:  +3.50, anomalyScore: 0.74, signal: "Refuge demand",    history: [2710,2720,2715,2730,2740,2738,2751,2760,2800,2847], geoZone: "Global" },
  { id: "lmt",    name: "Lockheed",      symbol: "LMT", value: 542.8, changePercent:  +8.95, anomalyScore: 0.81, signal: "Contrats imm.",    history: [498,499,501,503,500,505,510,520,530,542], geoZone: "Pentagon" },
  { id: "bdi",    name: "Baltic Dry",    symbol: "BDI", value: 1245,  changePercent: -18.09, anomalyScore: 0.71, signal: "Effondrement",     history: [1520,1510,1500,1490,1480,1460,1440,1400,1350,1245], geoZone: "Mer Rouge" },
  { id: "wheat",  name: "Blé CBOT",      symbol: "ZW",  value: 645,   changePercent:  +5.47, anomalyScore: 0.62, signal: "Mer Noire",        history: [600,605,608,610,614,618,620,625,635,645], geoZone: "Mer Noire" },
  { id: "btc",    name: "Bitcoin",        symbol: "BTC", value: 71240, changePercent:  +4.10, anomalyScore: 0.52, signal: "Fuite capitaux",   history: [68000,68500,69000,68800,69500,70000,70200,70800,71000,71240], geoZone: "Moscou" },
];

const MOCK_SOCIAL = [
  { platform: "Twitter/X",  icon: "𝕏", volume: 8420, delta: "+847%", hot: true,  trend: [100,200,400,800,1500,2800,4200,6100,7200,8420] },
  { platform: "Telegram",   icon: "✈", volume: 1240, delta: "+340%", hot: true,  trend: [100,150,200,300,450,600,750,900,1100,1240] },
  { platform: "TikTok",     icon: "♪", volume: 3670, delta: "+220%", hot: false, trend: [200,400,700,1100,1600,2100,2600,3000,3400,3670] },
  { platform: "VK",         icon: "В", volume:  890, delta: "+180%", hot: false, trend: [80,100,150,200,300,450,550,650,780,890] },
  { platform: "Reddit",     icon: "●", volume:  456, delta: "+95%",  hot: false, trend: [50,70,100,150,200,260,320,380,420,456] },
  { platform: "Weibo",      icon: "微", volume:  312, delta: "+67%",  hot: false, trend: [40,60,80,100,140,180,220,260,290,312] },
];

const MOCK_TELEGRAM: TelegramNotif[] = [
  { id: "t1", time: "14:55", level: 9, zone: "Tel Aviv",  summary: "8 signaux convergent. GPS jam + ADS-B + social saturé. Swarm déclenché. Alerte 94%.",    alertId: "alert-1" },
  { id: "t2", time: "14:51", level: 7, zone: "Taiwan",    summary: "Carrier group repositionné. PLA J-20 + marchés +8.9%. 5 signaux cross-sourcés.",          alertId: "alert-2" },
  { id: "t3", time: "14:43", level: 6, zone: "Sahel",     summary: "Wagner Telegram + convois satellite + NASA FIRMS. Absence ADS-B 300km.",                   alertId: "alert-3" },
  { id: "t4", time: "14:22", level: 5, zone: "Moscou",    summary: "12 jets privés oligarques. Or +2.8% + BTC +4.1%. Fuite capitaux détectée.",                alertId: "alert-4" },
  { id: "t5", time: "13:58", level: 4, zone: "Mer Rouge", summary: "AIS dark 3 cargo Houthis zones. BDI -18%. Pattern Déc 2023 à 83%.",                        alertId: "alert-5" },
];

// ─── Slice ────────────────────────────────────────────────────

export interface NexusSlice {
  // Panel
  nexusPanelOpen: boolean;
  nexusActiveTab: "alerts"|"signals"|"sources"|"markets"|"swarm"|"report"|"telegram"|"intel"|"live"|"timeline"|"matrix"|"darkweb";
  nexusSelectedAlertId: string|null;
  // Data
  nexusAlerts: NexusAlert[];
  nexusLiveSignals: LiveSignal[];
  nexusTelegramNotifs: TelegramNotif[];
  nexusSocialSources: typeof MOCK_SOCIAL;
  nexusEconomicIndicators: EconomicIndicator[];
  nexusAgentTasks: AgentTask[];
  nexusLiveEvents: NexusEvent[];
  nexusSourceHealth: SourceHealth[];
  nexusSignalCount: number;
  nexusLastUpdate: Date|null;
  nexusReports: IntelReport[];
  nexusTickerPaused: boolean;
  // Actions
  toggleNexusPanel: () => void;
  setNexusActiveTab: (tab: NexusSlice["nexusActiveTab"]) => void;
  setNexusSelectedAlert: (id: string|null) => void;
  acknowledgeAlert: (id: string) => void;
  toggleTicker: () => void;
  generateReport: (alertId: string) => void;
}

export const createNexusSlice: StateCreator<AppStore, [], [], NexusSlice> = (set, get) => ({
  nexusPanelOpen: true,
  nexusActiveTab: "alerts",
  nexusSelectedAlertId: "alert-1",
  nexusAlerts: MOCK_ALERTS,
  nexusLiveSignals: MOCK_LIVE_SIGNALS,
  nexusTelegramNotifs: MOCK_TELEGRAM,
  nexusSocialSources: MOCK_SOCIAL,
  nexusEconomicIndicators: MOCK_ECONOMIC,
  nexusAgentTasks: MOCK_AGENTS,
  nexusLiveEvents: [],
  nexusSourceHealth: [],
  nexusSignalCount: MOCK_LIVE_SIGNALS.length,
  nexusLastUpdate: new Date(BASE_EPOCH),
  nexusReports: [],
  nexusTickerPaused: false,
  toggleNexusPanel: () => set(s => ({ nexusPanelOpen: !s.nexusPanelOpen })),
  setNexusActiveTab: (tab) => set({ nexusActiveTab: tab }),
  setNexusSelectedAlert: (id) => set({ nexusSelectedAlertId: id }),
  acknowledgeAlert: (id) => set(s => ({
    nexusAlerts: s.nexusAlerts.map(a => a.id===id ? {...a, acknowledged: true} : a),
  })),
  toggleTicker: () => set(s => ({ nexusTickerPaused: !s.nexusTickerPaused })),
  generateReport: (alertId) => {
    const alert = get().nexusAlerts.find(a => a.id === alertId);
    if (!alert) return;
    const report: IntelReport = {
      id: `rpt-${alertId}-${Date.now()}`,
      eventId: alertId,
      zone: alert.zone,
      level: alert.level,
      category: alert.type,
      generatedAt: new Date(),
      summary: alert.aiSummary,
      signalCount: alert.signals.length,
      confidence: alert.confidence,
      sections: [
        { title: "Résumé exécutif", content: alert.aiSummary },
        { title: "Signaux corrélés", content: alert.signals.map((s,i) => `${i+1}. [${s.source.toUpperCase()}] ${s.text}`).join("\n") },
        { title: "Analyse de corrélation", content: `Spatial: ${Math.round(alert.correlation.spatial*100)}% · Temporel: ${Math.round(alert.correlation.temporal*100)}% · NLP: ${Math.round(alert.correlation.semantic*100)}% · Diversité sources: ${Math.round(alert.correlation.sourceDiv*100)}%` },
        { title: "Matches historiques", content: alert.historicalMatches.length ? alert.historicalMatches.map(m => `• ${m.name} (${m.date}) — similarité ${Math.round(m.similarity*100)}%: ${m.outcome}`).join("\n") : "Aucun match significatif." },
        { title: "Recommandations", content: alert.level >= 8 ? "ACTION IMMÉDIATE — Escalade vers niveau supérieur requis." : alert.level >= 6 ? "Surveillance renforcée — briefing toutes les 30min." : "Monitoring standard — alerte si escalade." },
      ],
    };
    set(s => ({
      nexusReports: [report, ...s.nexusReports],
      nexusAlerts: s.nexusAlerts.map(a => a.id===alertId ? {...a, reportId: report.id} : a),
    }));
  },
});
