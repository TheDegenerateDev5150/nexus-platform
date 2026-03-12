import { NextResponse } from "next/server";
import { nexusEngine } from "@/nexus/engine";

/**
 * REST endpoint for the Telegram alert bot and external polling.
 * Returns current active alerts above a configurable threshold.
 *
 * GET /api/nexus/alerts?minLevel=7&limit=20
 *
 * Used by: scripts/nexus_alert_bot.py
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minLevel = parseInt(searchParams.get("minLevel") ?? "1");
  const limit    = parseInt(searchParams.get("limit")    ?? "50");

  // Get live events from the engine (includes real correlated alerts)
  const allEvents = nexusEngine.getEvents();

  const filtered = allEvents
    .filter(ev => ev.level >= minLevel && !ev.acknowledged)
    .sort((a, b) => b.level - a.level || b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  // Map NexusEvent → alert format for the bot
  const alerts = filtered.map(ev => ({
    id:          ev.id,
    level:       ev.level,
    zone:        ev.zone,
    type:        ev.type,
    lat:         ev.lat,
    lng:         ev.lng,
    confidence:  Math.round(ev.confidence * 100),
    signals:     ev.signals.map(s => ({
      source: s.source,
      text:   s.description,
    })),
    correlation: {
      spatial:   ev.correlation?.spatial   ?? 0,
      temporal:  ev.correlation?.temporal  ?? 0,
      semantic:  ev.correlation?.semantic  ?? 0,
      behavioral:ev.correlation?.behavioral ?? 0,
      historical:ev.correlation?.historical ?? 0,
      sourceDiv: ev.correlation?.sourceDiv  ?? 0,
    },
    historicalMatches: ev.historicalMatches ?? [],
    aiSummary:         ev.aiSummary ?? "",
    timestamp:         ev.timestamp.toISOString(),
    acknowledged:      ev.acknowledged,
    // Telegram channels that contributed (extracted from signal text by the bot)
    telegramChannels:  ev.signals
      .filter(s => s.source === "social_telegram")
      .flatMap(s => {
        const matches = s.description.match(/@(\w+)/g) ?? [];
        return matches.map(m => m.slice(1));
      }),
  }));

  return NextResponse.json({
    alerts,
    count:     alerts.length,
    total:     allEvents.length,
    minLevel,
    timestamp: new Date().toISOString(),
  });
}
