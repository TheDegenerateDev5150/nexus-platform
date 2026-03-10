/**
 * Social Intelligence Plugin
 * ─────────────────────────────────────────────────────────────
 * Monitors social media platforms for crisis signals.
 * Feeds NexusSignals to the correlation engine.
 *
 * Production wiring:
 *  - Twitter/X:  TWITTER_BEARER_TOKEN env var
 *  - Telegram:   TELEGRAM_API_ID + TELEGRAM_API_HASH + session (Telethon via Python sidecar)
 *  - TikTok:     Scraping + Computer Vision (CLIP/YOLO) sidecar
 *  - VK:         VK_ACCESS_TOKEN env var
 *  - Reddit:     REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET
 */

import type {
  WorldPlugin,
  GeoEntity,
  TimeRange,
  PluginContext,
  LayerConfig,
  CesiumEntityOptions,
  FilterDefinition,
} from "@/core/plugins/PluginTypes";
import { nexusEngine } from "@/nexus/engine";
import type { NexusSignal, SignalSource } from "@/nexus/types";
import { v4 as uuidv4 } from "uuid";

// ─── Demo post data (replace with real API calls) ─────────────

interface SocialPost {
  id: string;
  platform: SignalSource;
  lat: number;
  lng: number;
  text: string;
  author: string;
  verified: boolean;
  timestamp: Date;
  urgencyScore: number; // 0-1 — computed by NLP
  mediaCount: number;
  shareCount: number;
}

function generateDemoPosts(): SocialPost[] {
  const now = new Date();
  return [
    {
      id: "x-1", platform: "social_x",
      lat: 32.08, lng: 34.78,
      text: "BREAKING: Multiple explosions heard in Tel Aviv. Sirens active.",
      author: "@BreakingNews_IL", verified: true,
      timestamp: new Date(now.getTime() - 5 * 60000),
      urgencyScore: 0.92, mediaCount: 2, shareCount: 14200,
    },
    {
      id: "tg-1", platform: "social_telegram",
      lat: 32.08, lng: 34.78,
      text: "מספר פיצוצים בתל אביב. כוחות פועלים.",
      author: "@IDF_Channel", verified: true,
      timestamp: new Date(now.getTime() - 3 * 60000),
      urgencyScore: 0.95, mediaCount: 0, shareCount: 0,
    },
    {
      id: "tt-1", platform: "social_tiktok",
      lat: 31.5, lng: 34.45,
      text: "[Vision: smoke, military vehicles detected] — Gaza area",
      author: "@user_gaza", verified: false,
      timestamp: new Date(now.getTime() - 8 * 60000),
      urgencyScore: 0.78, mediaCount: 1, shareCount: 45000,
    },
    {
      id: "vk-1", platform: "social_vk",
      lat: 55.75, lng: 37.62,
      text: "Срочно: Военная активность на Ближнем Востоке усилилась",
      author: "mil_analytics_ru", verified: false,
      timestamp: new Date(now.getTime() - 12 * 60000),
      urgencyScore: 0.65, mediaCount: 0, shareCount: 2300,
    },
    {
      id: "r-1", platform: "social_reddit",
      lat: 24.0, lng: 122.0,
      text: "USNS vessels spotted near Taiwan Strait. Unusual movement.",
      author: "u/intel_watcher", verified: false,
      timestamp: new Date(now.getTime() - 20 * 60000),
      urgencyScore: 0.71, mediaCount: 3, shareCount: 8900,
    },
    {
      id: "wb-1", platform: "social_weibo",
      lat: 24.0, lng: 122.0,
      text: "台湾海峡军事活动异常增加 [before censorship window]",
      author: "military_watch_cn", verified: false,
      timestamp: new Date(now.getTime() - 15 * 60000),
      urgencyScore: 0.68, mediaCount: 1, shareCount: 0,
    },
    {
      id: "tg-2", platform: "social_telegram",
      lat: 17.57, lng: -3.99,
      text: "Wagner group reactivated in Northern Mali. Convoy movement confirmed.",
      author: "@AfricaIntelligence", verified: true,
      timestamp: new Date(now.getTime() - 40 * 60000),
      urgencyScore: 0.80, mediaCount: 0, shareCount: 0,
    },
    {
      id: "tg-3", platform: "social_telegram",
      lat: 15.55, lng: 42.55,
      text: "Houthis announce imminent operation. Commercial vessels warned.",
      author: "@HouthiMilitary", verified: false,
      timestamp: new Date(now.getTime() - 90 * 60000),
      urgencyScore: 0.74, mediaCount: 0, shareCount: 0,
    },
  ];
}

const PLATFORM_COLORS: Partial<Record<SignalSource, string>> = {
  social_x:        "#1DA1F2",
  social_telegram:  "#0088cc",
  social_tiktok:    "#ff2d55",
  social_vk:        "#4a76a8",
  social_reddit:    "#ff6314",
  social_weibo:     "#e6162d",
  social_discord:   "#7289da",
};

const PLATFORM_ICONS: Partial<Record<SignalSource, string>> = {
  social_x:        "𝕏",
  social_telegram:  "✈",
  social_tiktok:    "♪",
  social_vk:        "В",
  social_reddit:    "●",
  social_weibo:     "微",
  social_discord:   "◉",
};

export class SocialPlugin implements WorldPlugin {
  id = "social";
  name = "Social Intelligence";
  description = "Twitter/X, Telegram, TikTok, VK, Reddit — signaux de crise en temps réel";
  icon = "📢";
  category = "custom" as const;
  version = "1.0.0";

  private ctx: PluginContext | null = null;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
  }

  destroy(): void {
    this.ctx = null;
  }

  async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> {
    const res = await fetch("/api/social");
    const data = res.ok ? await res.json() : { posts: generateDemoPosts() };
    const posts: SocialPost[] = data.posts || generateDemoPosts();

    // Feed to NEXUS engine
    for (const post of posts) {
      const signal: NexusSignal = {
        id: `social-${post.id}`,
        source: post.platform,
        lat: post.lat,
        lng: post.lng,
        radiusKm: 50,
        eventTime: post.timestamp,
        ingestTime: new Date(),
        description: post.text,
        confidence: post.urgencyScore * (post.verified ? 1.0 : 0.75),
        payload: {
          author: post.author,
          verified: post.verified,
          shareCount: post.shareCount,
          mediaCount: post.mediaCount,
          platform: post.platform,
        },
      };
      nexusEngine.ingest(signal);
    }

    // Convert to GeoEntities for globe rendering
    return posts
      .filter((p) => p.urgencyScore > 0.6)
      .map((post) => ({
        id: `social-${post.id}`,
        pluginId: "social",
        latitude: post.lat,
        longitude: post.lng,
        timestamp: post.timestamp,
        label: `${PLATFORM_ICONS[post.platform] || "📢"} ${post.author}`,
        properties: {
          platform: post.platform,
          text: post.text.substring(0, 80) + (post.text.length > 80 ? "…" : ""),
          urgencyScore: post.urgencyScore,
          verified: post.verified,
          shareCount: post.shareCount,
        },
      }));
  }

  getPollingInterval(): number { return 30_000; } // 30s

  getLayerConfig(): LayerConfig {
    return {
      color: "#22d3ee",
      clusterEnabled: true,
      clusterDistance: 80,
      maxEntities: 500,
    };
  }

  renderEntity(entity: GeoEntity): CesiumEntityOptions {
    const platform = entity.properties.platform as SignalSource;
    const color = PLATFORM_COLORS[platform] || "#22d3ee";
    const urgency = entity.properties.urgencyScore as number;
    return {
      type: "point",
      color,
      size: 6 + urgency * 8,
      outlineColor: "#ffffff",
      outlineWidth: 1,
    };
  }

  getFilterDefinitions(): FilterDefinition[] {
    return [
      {
        id: "platform",
        label: "Plateforme",
        type: "select",
        propertyKey: "platform",
        options: [
          { value: "social_x",         label: "Twitter/X"  },
          { value: "social_telegram",  label: "Telegram"   },
          { value: "social_tiktok",    label: "TikTok"     },
          { value: "social_vk",        label: "VK"         },
          { value: "social_reddit",    label: "Reddit"     },
          { value: "social_weibo",     label: "Weibo"      },
        ],
      },
      {
        id: "urgency",
        label: "Score urgence",
        type: "range",
        propertyKey: "urgencyScore",
        range: { min: 0, max: 1, step: 0.05 },
      },
    ];
  }
}
