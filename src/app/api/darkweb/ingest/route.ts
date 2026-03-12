import { NextResponse } from "next/server";

export interface DarkWebSignal {
  id: string;
  source: string;
  sourceName: string;
  category: "SOCIAL" | "CYBER" | "GROUND_TRUTH" | "ABSENCE";
  lat: number;
  lng: number;
  country: string;
  zone: string;
  confidence: number;
  title: string;
  body: string;
  tags: string[];
  timestamp: string;
  isAnomaly: boolean;
  onion: boolean;
  url: string;
  rawData?: unknown;
}

const signalBuffer: DarkWebSignal[] = [];
const MAX_BUFFER = 500;
const clients = new Set<ReadableStreamDefaultController>();
const seenIds = new Set<string>();

function broadcast(signal: DarkWebSignal) {
  if (seenIds.has(signal.id)) return;
  seenIds.add(signal.id);
  if (seenIds.size > 10000) {
    const iter = seenIds.values();
    for (let i = 0; i < 2000; i++) {
      const { value, done } = iter.next();
      if (done) break;
      seenIds.delete(value);
    }
  }

  signalBuffer.unshift(signal);
  if (signalBuffer.length > MAX_BUFFER) signalBuffer.pop();

  const msg = `data: ${JSON.stringify({ type: "darkweb_signal", data: signal })}\n\n`;
  clients.forEach(ctrl => {
    try { ctrl.enqueue(new TextEncoder().encode(msg)); } catch { clients.delete(ctrl); }
  });
}

// Demo signals — active tant que le collecteur Python n'est pas lancé
const DEMO_SIGNALS: DarkWebSignal[] = [
  {
    id: "demo_ddo_001",
    source: "ddosecrets",
    sourceName: "DDoSecrets",
    category: "GROUND_TRUTH",
    lat: 32.08, lng: 34.78,
    country: "IL", zone: "Israel",
    confidence: 0.84,
    title: "DDoSecrets: New dataset — IDF internal communications 2024",
    body: "New dataset published — 48GB IDF internal communications archive 2024",
    tags: ["leak", "IDF", "Israel", "government", "onion"],
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    isAnomaly: true, onion: true,
    url: "http://ddosecretspqkfxmehd4im63v7oihkx4ezrfdt4fnb3auh5t2ejxu2sqd.onion/",
  },
  {
    id: "demo_4chan_001",
    source: "4chan_pol",
    sourceName: "4chan /pol/",
    category: "SOCIAL",
    lat: 35.69, lng: 51.39,
    country: "IR", zone: "Iran",
    confidence: 0.41,
    title: "Anons reporting explosions near Isfahan — multiple sources confirming",
    body: "Thread: Loud booms reported Isfahan province. ADS-B suddenly offline. Anons triangulating.",
    tags: ["Iran", "Isfahan", "explosion", "military", "IRGC"],
    timestamp: new Date(Date.now() - 600000).toISOString(),
    isAnomaly: true, onion: false,
    url: "https://boards.4chan.org/pol/",
  },
  {
    id: "demo_ransomware_001",
    source: "lockbit3_leak",
    sourceName: "LockBit 3.0 Leaks (monitor)",
    category: "CYBER",
    lat: 49.0, lng: 32.0,
    country: "UA", zone: "Ukraine",
    confidence: 0.88,
    title: "[RANSOMWARE] Ukrainian Ministry of Defense contractor — 240GB",
    body: "New victim listed — Ukrainian MoD contractor. 240GB data. Deadline: 72h",
    tags: ["ransomware", "cyber", "Ukraine", "military", "contractor", "threat_intel"],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isAnomaly: true, onion: true,
    url: "http://lockbit7z2jwcskxpbokpemdxmltipntwlkmidcll2qirbu7ykg46eyd.onion/",
  },
  {
    id: "demo_reddit_001",
    source: "reddit_CombatFootage",
    sourceName: "Reddit r/CombatFootage",
    category: "SOCIAL",
    lat: 31.5, lng: 34.45,
    country: "PS", zone: "Gaza",
    confidence: 0.52,
    title: "Confirmed drone footage — northern Gaza Jabalia camp strike",
    body: "Cross-verified drone footage from 3 sources. Jabalia camp. Time stamp matches IDF announcement.",
    tags: ["Gaza", "IDF", "drone", "airstrike", "OSINT", "cross_verified"],
    timestamp: new Date(Date.now() - 900000).toISOString(),
    isAnomaly: false, onion: false,
    url: "https://reddit.com/r/CombatFootage/",
  },
  {
    id: "demo_propublica_001",
    source: "propublica",
    sourceName: "ProPublica",
    category: "GROUND_TRUTH",
    lat: 39.91, lng: 116.39,
    country: "CN", zone: "China",
    confidence: 0.79,
    title: "Investigation: Chinese state companies supplying Russian military — documents",
    body: "ProPublica investigation reveals 47 Chinese companies supplying dual-use components to Russian defense contractors despite sanctions",
    tags: ["China", "Russia", "sanctions", "weapons", "investigation", "leak"],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isAnomaly: false, onion: false,
    url: "https://www.propub3r6espa33w.onion/",
  },
  {
    id: "demo_hn_001",
    source: "hackernews",
    sourceName: "Hacker News",
    category: "CYBER",
    lat: 0, lng: 0,
    country: "XX", zone: "Global",
    confidence: 0.48,
    title: "Critical 0-day in industrial SCADA systems — active exploitation in energy sector",
    body: "Unpatched SCADA 0-day being actively exploited. Energy sector targets. PoC circulating on underground forums.",
    tags: ["cyber", "SCADA", "0day", "energy_sector", "critical_infrastructure"],
    timestamp: new Date(Date.now() - 2700000).toISOString(),
    isAnomaly: true, onion: false,
    url: "https://news.ycombinator.com/",
  },
  {
    id: "demo_rferl_001",
    source: "rferl_onion",
    sourceName: "RFE/RL Onion",
    category: "GROUND_TRUTH",
    lat: 55.75, lng: 37.62,
    country: "RU", zone: "Russia",
    confidence: 0.74,
    title: "RFE/RL: Anti-mobilization protests spreading — 12 cities Russia",
    body: "Independent reports: protests against new mobilization wave in 12 Russian cities. Telegram channels reporting mass arrests.",
    tags: ["Russia", "protest", "mobilization", "opposition", "Moscow"],
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    isAnomaly: false, onion: true,
    url: "http://rferlo2zxoqbdz5vfjesowhptdovrqhfxivdqxndbnkwddqtkqahvhyd.onion/",
  },
];

let demoInjected = false;

function injectDemoSignals() {
  if (demoInjected) return;
  demoInjected = true;
  for (const s of DEMO_SIGNALS) {
    signalBuffer.push(s);
    seenIds.add(s.id);
  }
}

export async function GET() {
  injectDemoSignals();

  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      const recent = signalBuffer.slice(0, 80);
      for (const s of [...recent].reverse()) {
        try {
          controller.enqueue(new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "darkweb_signal", data: s })}\n\n`
          ));
        } catch {}
      }

      const hb = setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(": hb\n\n")); }
        catch { clearInterval(hb); clients.delete(controller); }
      }, 20000);
    },
    cancel(controller) {
      clients.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as DarkWebSignal;
    if (!body.source || !body.title) {
      return NextResponse.json({ error: "Missing source or title" }, { status: 400 });
    }

    const signal: DarkWebSignal = {
      ...body,
      id: body.id || `ingest_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: body.timestamp || new Date().toISOString(),
    };

    broadcast(signal);

    return NextResponse.json({
      ok: true,
      id: signal.id,
      buffered: signalBuffer.length,
      clients: clients.size,
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE() {
  signalBuffer.length = 0;
  seenIds.clear();
  demoInjected = false;
  return NextResponse.json({ ok: true, message: "Buffer cleared" });
}
