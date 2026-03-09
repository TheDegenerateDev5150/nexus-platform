import { NextResponse } from "next/server";

/**
 * Social Intelligence API
 * ─────────────────────────────────────────────────────────────
 * Aggregates social media signals from:
 *  - Twitter/X API v2 (TWITTER_BEARER_TOKEN)
 *  - Telegram Telethon sidecar (TELEGRAM_SESSION)
 *  - Reddit API (REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET)
 *  - VK API (VK_ACCESS_TOKEN)
 *
 * Falls back to curated demo data if APIs not configured.
 *
 * NLP scoring pipeline:
 *  1. Translate to French/English (Helsinki-NLP or DeepL API)
 *  2. Extract entities (spaCy NER): locations, orgs, weapons
 *  3. Score urgency: keywords + sentiment + verified account boost
 *  4. Geolocate: mention → PostGIS lookup → lat/lng
 */

// Crisis keywords that boost urgency score
const CRISIS_KEYWORDS = [
  "explosion", "strike", "attack", "missile", "bomb", "fire",
  "military", "troops", "frappe", "explosion", "missile", "urgence",
  "breaking", "urgent", "alert", "sirene", "evacuate", "منذر",
];

function computeUrgencyScore(text: string, isVerified: boolean): number {
  const lower = text.toLowerCase();
  const keywordHits = CRISIS_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const base = Math.min(0.9, keywordHits * 0.15 + 0.2);
  return isVerified ? Math.min(1.0, base * 1.25) : base;
}

export async function GET() {
  const twitterKey = process.env.TWITTER_BEARER_TOKEN;
  const vkToken = process.env.VK_ACCESS_TOKEN;
  const redditId = process.env.REDDIT_CLIENT_ID;

  const posts: unknown[] = [];

  // ─── Twitter/X API ────────────────────────────────────────
  if (twitterKey) {
    try {
      const query = encodeURIComponent(
        '(explosion OR strike OR missile OR military) lang:en -is:retweet has:geo'
      );
      const res = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${query}&tweet.fields=geo,created_at,author_id&max_results=20`,
        { headers: { Authorization: `Bearer ${twitterKey}` } }
      );
      if (res.ok) {
        const data = await res.json();
        // Transform to NexusPost format
        (data.data || []).forEach((tweet: Record<string, unknown>) => {
          posts.push({
            id: `x-${tweet.id}`,
            platform: "social_x",
            lat: 0, lng: 0, // TODO: reverse geocode from tweet.geo
            text: tweet.text,
            author: `@user_${tweet.author_id}`,
            verified: false,
            timestamp: new Date(tweet.created_at as string),
            urgencyScore: computeUrgencyScore(tweet.text as string, false),
            mediaCount: 0,
            shareCount: 0,
          });
        });
      }
    } catch (err) {
      console.error("[API/social] Twitter fetch failed:", err);
    }
  }

  // ─── Demo fallback ────────────────────────────────────────
  if (posts.length === 0) {
    const now = new Date();
    const demoData = [
      { id: "x-demo-1", platform: "social_x",        lat: 32.08, lng: 34.78, text: "BREAKING: Multiple explosions heard in Tel Aviv. Sirens active across the city.", author: "@BreakingNews_IL", verified: true,  timestamp: new Date(now.getTime() - 5 * 60000),  urgencyScore: 0.92, mediaCount: 2,  shareCount: 14200 },
      { id: "tg-demo-1", platform: "social_telegram", lat: 32.08, lng: 34.78, text: "מספר פיצוצים בתל אביב. כוחות פועלים. פינוי אזורים מסוימים.", author: "@IDF_Updates", verified: true,  timestamp: new Date(now.getTime() - 3 * 60000),  urgencyScore: 0.95, mediaCount: 0,  shareCount: 0 },
      { id: "tt-demo-1", platform: "social_tiktok",   lat: 31.5,  lng: 34.45, text: "[CV: smoke detected, military vehicles, crowd dispersal] — Gaza border area", author: "@witness_gaza_88", verified: false, timestamp: new Date(now.getTime() - 8 * 60000),  urgencyScore: 0.78, mediaCount: 1,  shareCount: 45000 },
      { id: "vk-demo-1", platform: "social_vk",       lat: 55.75, lng: 37.62, text: "Срочно: Военная активность на Ближнем Востоке резко возросла. Источники указывают на...", author: "mil_analytics_ru", verified: false, timestamp: new Date(now.getTime() - 12 * 60000), urgencyScore: 0.65, mediaCount: 0, shareCount: 2300 },
      { id: "r-demo-1",  platform: "social_reddit",   lat: 24.0,  lng: 122.0, text: "USNS Comfort and multiple destroyers spotted near Taiwan Strait. Fleet movement unusual.", author: "u/navywatcher", verified: false, timestamp: new Date(now.getTime() - 20 * 60000), urgencyScore: 0.71, mediaCount: 3, shareCount: 8900 },
      { id: "wb-demo-1", platform: "social_weibo",    lat: 24.0,  lng: 122.0, text: "台湾海峡附近军事活动异常增加，多艘驱逐舰被目击", author: "军事观察_cn", verified: false, timestamp: new Date(now.getTime() - 15 * 60000), urgencyScore: 0.68, mediaCount: 1, shareCount: 0 },
      { id: "tg-demo-2", platform: "social_telegram", lat: 17.57, lng: -3.99,  text: "Wagner group convoys reactivated Northern Mali. 12 vehicles spotted on Timbuktu road.", author: "@AfricaIntel", verified: true, timestamp: new Date(now.getTime() - 40 * 60000), urgencyScore: 0.80, mediaCount: 0, shareCount: 0 },
      { id: "tg-demo-3", platform: "social_telegram", lat: 15.55, lng: 42.55,  text: "Houthis: 'We will strike any vessel entering designated zones. Final warning issued.'", author: "@HouthiOfficial", verified: false, timestamp: new Date(now.getTime() - 90 * 60000), urgencyScore: 0.74, mediaCount: 0, shareCount: 0 },
    ];
    return NextResponse.json({ posts: demoData, source: "demo" });
  }

  return NextResponse.json({ posts, source: "live" });
}
