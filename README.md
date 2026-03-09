# NEXUS

I spend a lot of time on Telegram. Not for memes. I follow around 90 channels — conflict zones, OSINT analysts, journalists embedded in places nobody else covers, military bloggers, AIS trackers. Over time it became a habit, then a system, then a problem.

The problem is that following all of that manually is genuinely exhausting. You're jumping between channels, cross-referencing timestamps, trying to figure out if three posts about the same explosion are three independent sources or just one rumor bouncing around. You get it wrong half the time and you don't even know when you got it wrong.

Then I found [WorldWideView](https://github.com/silvertakana/worldwideview) on GitHub — a 3D globe built with CesiumJS and Next.js. Clean architecture, proper plugin system. I looked at it for a while and thought: what if instead of me going to find the information, the information came to me, geolocated, already filtered, plotted in real time.

That was it. I started building.

---

## What it does

It pulls from a lot of open-source feeds at once — satellite fire data, seismic sensors, aviation transponders, ship tracking, GPS jamming maps, GDELT's news archive, Wikipedia edit velocity (Wikipedia gets edited fast when something happens, it's actually a decent early warning signal), internet shutdown detection, economic anomaly detection. All of that streams in and gets correlated before anything shows up on screen.

The core idea is simple: one signal is noise, two is a coincidence, three independent sources confirming the same event in the same place at roughly the same time is probably real. The engine doesn't surface an alert until that threshold is crossed. The scoring accounts for how spatially close the signals are, how tight the time window is, whether the sources are actually independent or just citing each other, and a few other things.

The text analysis uses algorithms from published research — LDA topic modelling, a velocity penalty borrowed from MIT's misinformation lab work, conflict escalation predictions calibrated against PRIO's ViEWS model. Not because I needed academic credibility, but because those models are genuinely better than anything I would've written from scratch.

The 92 Telegram channels each get a credibility score based on how often they're first to report something that gets confirmed later, how often they post verifiable coordinates, and their track record on fabrication. Everything from a state propaganda outlet gets down-weighted. A channel with a long history of accurate early reporting gets taken more seriously.

There's also a layer that monitors clearnet and Tor sources — 4chan's /pol/ and /k/ boards (genuinely one of the fastest places on the internet for conflict reporting, messy but real), OSINT subreddits, Bellingcat, investigative outlets through their .onion mirrors, and ransomware leak sites watched for threat intel. A separate Python script handles all of that through a Tor SOCKS5 proxy and feeds it into the same stream.

The interface is a 3D globe with a panel that has about 12 tabs — alerts, live signal feed, sources status, markets, AI agents, report generation, Telegram intel, timeline, a zone/source heatmap, and the dark web feed. Built with Next.js, TypeScript, Zustand, Server-Sent Events for the real-time streaming, and Python for the collection scripts.

---

## Running it

```bash
git clone https://github.com/Vitalcheffe/nexus-platform
cd nexus-platform
npm install
npm run dev
```

Most sources work with no API key at all — GDELT, USGS earthquakes, Wikipedia, ADSB.fi flight data, GPSJam, UN ReliefWeb. You get real live data immediately. For the rest there are free registrations: ACLED for conflict data, NASA FIRMS for fires, Cloudflare Radar for internet shutdowns, AISstream for maritime. All documented in `.env.local`.

For Telegram:
```bash
pip install telethon httpx beautifulsoup4
export TELEGRAM_API_ID=...
export TELEGRAM_API_HASH=...
python3 scripts/nexus_telegram_collector.py
```

For the dark web collector, you need Tor running on port 9050 first, then `python3 scripts/nexus_darkweb_collector.py`. There's also a lighter version (`nexus_replit_collector.py`) that skips Tor entirely and works on any free hosting.

Deployment is on Render.com free tier with a `render.yaml` already in the repo. UptimeRobot pings `/api/health` every 5 minutes to keep it awake. The Python collectors run on Replit. Total cost: zero.

---

## Context

I'm 16. I built this because I was frustrated with a real problem I had, not because it seemed like an impressive thing to build. The stack choices were driven by what actually worked — CesiumJS because nothing else does real-time 3D globe rendering at this scale in a browser, SSE because WebSockets were overkill for this data pattern, Python for the collection scripts because the Telethon library for Telegram is Python and there's no good alternative.

Some parts are still rough. There are TypeScript warnings I haven't gotten to. Some of the demo signals are synthetic. The science layer works but could be tuned more carefully against ground truth data. It's a real project, not a portfolio piece — which means it's unfinished in the way real projects always are.

If you're working on something in this space, open an issue or reach out.

---

Built on top of [WorldWideView](https://github.com/silvertakana/worldwideview) by silvertakana. License: MPL-2.0.
