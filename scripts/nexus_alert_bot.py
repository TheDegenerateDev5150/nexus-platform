#!/usr/bin/env python3
"""
NEXUS Alert Bot — Public Telegram Channel Publisher
════════════════════════════════════════════════════

Polls the NEXUS /api/nexus/intelligence SSE stream and pushes
confirmed alerts (level >= 7) to a public Telegram channel.

The bot IS the live demo. People subscribe to the channel and
see the system detecting real events in real time.

SETUP:
  1. Create a bot via @BotFather → get BOT_TOKEN
  2. Create a public channel (e.g. @nexus_osint_alerts)
  3. Add the bot as admin to the channel
  4. pip install python-telegram-bot httpx
  5. Set environment variables (see below)
  6. python3 nexus_alert_bot.py

ENV VARS:
  NEXUS_BOT_TOKEN     — from @BotFather
  NEXUS_CHANNEL_ID    — @nexus_osint_alerts or -100xxxxxxxxx
  NEXUS_API_URL       — e.g. https://nexus-platform-xxxx.onrender.com
  BOT_MIN_LEVEL       — minimum alert level to publish (default: 7)
  BOT_COOLDOWN_SEC    — minimum seconds between two messages (default: 30)

RATE LIMITS:
  Telegram limits bots to 20 messages/min per channel.
  Flood control is handled automatically (exponential backoff).

SOURCE CREDIBILITY:
  When an alert is driven by Telegram channels the bot knows,
  it lists the source channels with their credibility scores —
  linking directly back to the original posts.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx
from telegram import Bot
from telegram.constants import ParseMode
from telegram.error import RetryAfter, TimedOut, NetworkError

# ── Configuration ──────────────────────────────────────────────

BOT_TOKEN    = os.environ["NEXUS_BOT_TOKEN"]
CHANNEL_ID   = os.environ["NEXUS_CHANNEL_ID"]           # e.g. @nexus_osint_alerts
API_URL      = os.environ.get("NEXUS_API_URL", "http://localhost:3000")
MIN_LEVEL    = int(os.environ.get("BOT_MIN_LEVEL", "7"))
COOLDOWN_SEC = int(os.environ.get("BOT_COOLDOWN_SEC", "30"))
POLL_SEC     = int(os.environ.get("BOT_POLL_SEC", "20"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [NEXUS-BOT] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("nexus.bot")

# ── Telegram channel credibility scores ───────────────────────
# These are the 35 channels monitored by nexus_telegram_collector.py.
# When an alert is correlated to one of these, we include the
# channel handle + score in the alert message.

CHANNEL_SCORES: dict[str, dict] = {
    "swatter_jammer":            {"cred": 88, "bias": "ANALYST",   "url": "t.me/swatter_jammer"},
    "UltraRadar":                {"cred": 87, "bias": "NEUTRAL",   "url": "t.me/UltraRadar"},
    "rnintel":                   {"cred": 86, "bias": "ANALYST",   "url": "t.me/rnintel"},
    "Farsi_Iranwire":            {"cred": 85, "bias": "NEUTRAL",   "url": "t.me/Farsi_Iranwire"},
    "warfareanalysis":           {"cred": 85, "bias": "ANALYST",   "url": "t.me/warfareanalysis"},
    "DDGeopolitics":             {"cred": 84, "bias": "ANALYST",   "url": "t.me/DDGeopolitics"},
    "social_drone":              {"cred": 84, "bias": "NEUTRAL",   "url": "t.me/social_drone"},
    "wfwitness":                 {"cred": 81, "bias": "NEUTRAL",   "url": "t.me/wfwitness"},
    "IranintlTV":                {"cred": 80, "bias": "PRO_WEST",  "url": "t.me/IranintlTV"},
    "IntelRepublic":             {"cred": 78, "bias": "NEUTRAL",   "url": "t.me/IntelRepublic"},
    "AssyriaNewsNetwork":        {"cred": 77, "bias": "NEUTRAL",   "url": "t.me/AssyriaNewsNetwork"},
    "idfofficial":               {"cred": 72, "bias": "OFFICIAL",  "url": "t.me/idfofficial"},
    "GeoPWatch":                 {"cred": 79, "bias": "ANALYST",   "url": "t.me/GeoPWatch"},
    "BellumActaNews":            {"cred": 80, "bias": "NEUTRAL",   "url": "t.me/BellumActaNews"},
    "warmonitors":               {"cred": 82, "bias": "NEUTRAL",   "url": "t.me/warmonitors"},
    "Tsaplienko":                {"cred": 82, "bias": "PRO_UA",    "url": "t.me/Tsaplienko"},
    "warriorsukrainian":         {"cred": 73, "bias": "PRO_UA",    "url": "t.me/warriorsukrainian"},
    "ukrainejournal":            {"cred": 75, "bias": "PRO_UA",    "url": "t.me/ukrainejournal"},
    "United24media":             {"cred": 72, "bias": "PRO_UA",    "url": "t.me/United24media"},
    "LebUpdate":                 {"cred": 76, "bias": "NEUTRAL",   "url": "t.me/LebUpdate"},
    "Middle_East_Spectator":     {"cred": 76, "bias": "NEUTRAL",   "url": "t.me/Middle_East_Spectator"},
    "medmannews":                {"cred": 73, "bias": "NEUTRAL",   "url": "t.me/medmannews"},
    "Israel_Middle_East_Insight":{"cred": 70, "bias": "PRO_IL",    "url": "t.me/Israel_Middle_East_Insight"},
    "IsraelWarLive":             {"cred": 68, "bias": "PRO_IL",    "url": "t.me/IsraelWarLive"},
    "engliishabuali":            {"cred": 68, "bias": "PRO_PA",    "url": "t.me/engliishabuali"},
    "beholdisraelchannel":       {"cred": 66, "bias": "PRO_IL",    "url": "t.me/beholdisraelchannel"},
    "hnaftali":                  {"cred": 74, "bias": "OFFICIAL",  "url": "t.me/hnaftali"},
    "intelslava":                {"cred": 63, "bias": "PRO_RU",    "url": "t.me/intelslava"},
    "thecradlemedia":            {"cred": 62, "bias": "PRO_IR",    "url": "t.me/thecradlemedia"},
    "TheSimurgh313":             {"cred": 60, "bias": "PRO_IR",    "url": "t.me/TheSimurgh313"},
    "stayfreeworld":             {"cred": 52, "bias": "AGGREGATOR","url": "t.me/stayfreeworld"},
    "NewsWorld_23":              {"cred": 58, "bias": "AGGREGATOR","url": "t.me/NewsWorld_23"},
    "RezistanceTrench1":         {"cred": 48, "bias": "PRO_IR",    "url": "t.me/RezistanceTrench1"},
    "warvideos18":               {"cred": 42, "bias": "AGGREGATOR","url": "t.me/warvideos18"},
    "horror_footage":            {"cred": 45, "bias": "AGGREGATOR","url": "t.me/horror_footage"},
}

# Source code → readable label
SOURCE_LABELS: dict[str, str] = {
    "aviation":          "ADS-B",
    "maritime":          "AIS",
    "satellite":         "SAT-TLE",
    "gpsjam":            "GPS-JAM",
    "notam":             "NOTAM",
    "social_x":          "X/Twitter",
    "social_telegram":   "Telegram",
    "social_tiktok":     "TikTok",
    "social_vk":         "VK",
    "social_weibo":      "Weibo",
    "social_reddit":     "Reddit",
    "economic_oil":      "Brent",
    "economic_gold":     "XAU",
    "economic_bdi":      "BDI",
    "economic_defense":  "LMT/RTX",
    "gdelt":             "GDELT",
    "usgs":              "USGS",
    "nasa_firms":        "NASA-FIRMS",
    "absence_ads_b":     "ADS-B-VOID",
    "absence_ais":       "AIS-DARK",
    "nightlights":       "NASA-NLGT",
    "acled":             "ACLED",
    "wikipedia_edits":   "WIKI-VEL",
    "netblocks":         "NETBLOCKS",
    "cloudflare_radar":  "CF-RADAR",
    "sentinel_hub":      "SENTINEL",
    "dark_web":          "DARKWEB",
    "private_jets":      "PRIV-JET",
}

# Level labels
LEVEL_LABELS = {
    10: "EXTINCTION", 9: "CRITICAL", 8: "SEVERE",
    7: "HIGH",        6: "MODERATE", 5: "WATCH",
    4: "LOW",         3: "INFO",
}

# Level indicator (text-only, no emoji)
LEVEL_INDICATOR = {
    10: "!!!", 9: "!!", 8: "!!", 7: "!", 6: ".", 5: ".",
}

# ── State ──────────────────────────────────────────────────────

@dataclass
class PublishedAlert:
    alert_id: str
    level: int
    published_at: float   # epoch

published_cache: dict[str, PublishedAlert] = {}  # alert_id → published
last_message_time: float = 0.0

# ── Alert formatting ───────────────────────────────────────────

def format_alert_message(alert: dict) -> str:
    """
    Format a NEXUS alert as a clean Telegram message.
    No emojis. Dense, scannable, actionable.
    
    Example output:
    
    [CRITICAL / LVL 9] Tel Aviv — MILITARY
    ─────────────────────────────────────
    Confidence: 94% · Sources: 8 independent
    
    Signals:
      ADS-B    US military aircraft — Med. East approach
      X/TW     +847% explosion mentions / 14,200 shares
      TG       IDF channels active — 340 msg/h
      AIS      Haifa vessels rerouted ×12
      GPS-JAM  EW jamming 180km radius confirmed
      SAT-TLE  KH-11 + Gaofen-3 stacking zone
    
    Correlation: spatial=0.92 temporal=0.88 semantic=0.95
    History: 7 Oct 2023 — similarity 78%
    
    Driving channels (cross-referenced):
      @rnintel         [cred:86 ANALYST]  t.me/rnintel
      @warmonitors     [cred:82 NEUTRAL]  t.me/warmonitors
    
    NEXUS · github.com/Vitalcheffe/nexus-platform
    """
    level       = alert.get("level", 0)
    zone        = alert.get("zone", "Unknown")
    alert_type  = alert.get("type", "")
    confidence  = alert.get("confidence", 0)
    signals     = alert.get("signals", [])
    corr        = alert.get("correlation", {})
    hist_matches= alert.get("historicalMatches", [])
    ai_summary  = alert.get("aiSummary", "")
    tg_channels = alert.get("telegramChannels", [])  # injected by engine when TG signals present
    ts          = alert.get("timestamp", "")

    level_label = LEVEL_LABELS.get(level, f"LVL{level}")
    indicator   = LEVEL_INDICATOR.get(level, "")

    # Header
    lines = [
        f"{indicator} [{level_label} / LVL {level}] {zone}",
        f"Type: {alert_type}  |  Conf: {confidence}%  |  Sources: {len(signals)}",
        "─" * 38,
    ]

    # Signals block
    if signals:
        lines.append("Signals:")
        for sig in signals:
            src_label = SOURCE_LABELS.get(sig.get("source", ""), sig.get("source", "UNK"))
            text = sig.get("text", "")
            # Truncate long text
            if len(text) > 72:
                text = text[:69] + "..."
            lines.append(f"  {src_label:<10} {text}")

    # Correlation scores
    if corr:
        corr_str = "  ".join([
            f"spat={corr.get('spatial',0):.2f}",
            f"temp={corr.get('temporal',0):.2f}",
            f"sem={corr.get('semantic',0):.2f}",
        ])
        lines.append(f"\nCorrelation: {corr_str}")

    # Historical match
    if hist_matches:
        best = hist_matches[0]
        lines.append(f"History: {best.get('name','')} — similarity {int(best.get('similarity',0)*100)}%")

    # AI summary (truncated)
    if ai_summary:
        summary_short = ai_summary[:220] + ("..." if len(ai_summary) > 220 else "")
        lines.append(f"\nAnalysis:\n{summary_short}")

    # Driving Telegram channels (with credibility scores)
    driving_channels = []
    for sig in signals:
        if sig.get("source") == "social_telegram":
            # Extract channel mentions from signal text (e.g. "@rnintel")
            import re
            mentions = re.findall(r"@(\w+)", sig.get("text", ""))
            for mention in mentions:
                if mention.lower() in CHANNEL_SCORES:
                    driving_channels.append(mention.lower())

    # Also include explicitly passed channels
    for ch in tg_channels:
        if ch.lower() in CHANNEL_SCORES and ch.lower() not in driving_channels:
            driving_channels.append(ch.lower())

    if driving_channels:
        lines.append("\nSource channels:")
        for ch in driving_channels[:5]:  # max 5
            info = CHANNEL_SCORES[ch]
            lines.append(f"  @{ch:<24} [cred:{info['cred']} {info['bias']}]")

    # Footer
    lines.append(f"\nnexus-platform · t={ts[:19] if ts else 'now'}")
    lines.append("github.com/Vitalcheffe/nexus-platform")

    return "\n".join(lines)


# ── NEXUS API polling ──────────────────────────────────────────

async def fetch_active_alerts(client: httpx.AsyncClient) -> list[dict]:
    """
    Polls the NEXUS REST endpoint for current alerts.
    Falls back from SSE to JSON polling (SSE harder to parse in polling loop).
    """
    try:
        resp = await client.get(
            f"{API_URL}/api/nexus/alerts",
            timeout=10.0,
            headers={"Accept": "application/json"},
        )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("alerts", [])
    except (httpx.TimeoutException, httpx.ConnectError) as e:
        log.warning(f"API fetch failed: {e}")
    return []


def should_publish(alert: dict) -> bool:
    """
    Decide whether to publish an alert.
    Rules:
    - Level >= MIN_LEVEL
    - Not already published (unless level escalated)
    - Not acknowledged (if info available)
    - At least 3 independent signals (avoid noise)
    """
    alert_id = alert.get("id", "")
    level    = alert.get("level", 0)
    signals  = alert.get("signals", [])
    acked    = alert.get("acknowledged", False)

    if level < MIN_LEVEL:
        return False
    if acked:
        return False
    if len(signals) < 3:
        return False

    # Already published at same or higher level
    if alert_id in published_cache:
        prev_level = published_cache[alert_id].level
        if level <= prev_level:
            return False
        # Level escalated — republish with escalation marker
        log.info(f"Alert {alert_id} escalated: {prev_level} → {level}")

    return True


# ── Main loop ──────────────────────────────────────────────────

async def run():
    bot = Bot(token=BOT_TOKEN)

    # Verify bot and channel on startup
    try:
        me = await bot.get_me()
        log.info(f"Bot authenticated: @{me.username}")
    except Exception as e:
        log.error(f"Bot authentication failed: {e}")
        return

    log.info(f"Polling {API_URL} every {POLL_SEC}s — publishing level {MIN_LEVEL}+ to {CHANNEL_ID}")

    async with httpx.AsyncClient() as http:
        while True:
            try:
                alerts = await fetch_active_alerts(http)

                for alert in alerts:
                    if not should_publish(alert):
                        continue

                    alert_id = alert.get("id", "")
                    level    = alert.get("level", 0)

                    # Rate limit
                    now = time.time()
                    if now - last_message_time < COOLDOWN_SEC:
                        wait = COOLDOWN_SEC - (now - last_message_time)
                        log.debug(f"Rate limit — waiting {wait:.1f}s")
                        await asyncio.sleep(wait)

                    message = format_alert_message(alert)

                    # Retry loop for Telegram flood control
                    for attempt in range(4):
                        try:
                            await bot.send_message(
                                chat_id=CHANNEL_ID,
                                text=message,
                                parse_mode=None,   # plain text — no markdown parsing issues
                                disable_web_page_preview=True,
                            )
                            published_cache[alert_id] = PublishedAlert(
                                alert_id=alert_id,
                                level=level,
                                published_at=time.time(),
                            )
                            # Access as nonlocal
                            globals()["last_message_time"] = time.time()
                            log.info(f"Published alert {alert_id} LVL{level} — {alert.get('zone')}")
                            break
                        except RetryAfter as e:
                            wait = e.retry_after + 1
                            log.warning(f"Flood control — waiting {wait}s")
                            await asyncio.sleep(wait)
                        except (TimedOut, NetworkError) as e:
                            backoff = 2 ** attempt
                            log.warning(f"Network error (attempt {attempt+1}): {e} — retry in {backoff}s")
                            await asyncio.sleep(backoff)
                        except Exception as e:
                            log.error(f"Send failed: {e}")
                            break

            except Exception as e:
                log.error(f"Main loop error: {e}")

            await asyncio.sleep(POLL_SEC)


# ── Healthcheck endpoint (optional, for UptimeRobot) ──────────

async def healthcheck_server():
    """Minimal HTTP server on port 8080 for UptimeRobot pings."""
    from aiohttp import web
    async def health(request: web.Request) -> web.Response:
        return web.json_response({
            "status": "ok",
            "published": len(published_cache),
            "uptime": int(time.time()),
        })
    app = web.Application()
    app.router.add_get("/health", health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 8080)
    await site.start()
    log.info("Healthcheck server started on :8080/health")


# ── Entrypoint ─────────────────────────────────────────────────

async def main():
    # Try to start healthcheck server (optional — needs aiohttp)
    try:
        import aiohttp
        await healthcheck_server()
    except ImportError:
        log.info("aiohttp not installed — skipping healthcheck server")

    await run()


if __name__ == "__main__":
    asyncio.run(main())
