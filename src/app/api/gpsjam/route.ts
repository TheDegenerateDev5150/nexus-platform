import { NextResponse } from "next/server";

/**
 * GPS Jamming Detection API
 * Source: GPSJam.org (https://gpsjam.org/)
 * Free API — returns daily jamming heatmaps
 * No API key required.
 *
 * How it works:
 *  GPSJam aggregates GPS accuracy reports from ADS-B receivers.
 *  Aircraft report navigation accuracy category (NAC).
 *  Low NAC = degraded GPS = interference present.
 */

export async function GET() {
  try {
    // Try GPSJam.org API
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`https://gpsjam.org/api/v1/interference/${today}`, {
      next: { revalidate: 1800 },
    } as RequestInit);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ zones: data.zones || [], source: "gpsjam.org" });
    }
  } catch (err) {
    console.log("[API/gpsjam] Live fetch failed, using demo data");
  }

  // Demo fallback
  const now = new Date();
  const zones = [
    { id: "jam-il-1",  lat: 33.0, lng: 35.5, radiusKm: 180, intensity: 0.92, affectedAircraft: 47, startTime: new Date(now.getTime() - 7200000).toISOString(), lastUpdate: new Date(now.getTime() - 300000).toISOString(), estimatedSource: "IDF Electronic Warfare", country: "IL" },
    { id: "jam-ru-1",  lat: 56.0, lng: 37.0, radiusKm: 120, intensity: 0.71, affectedAircraft: 23, startTime: new Date(now.getTime() - 21600000).toISOString(), lastUpdate: new Date(now.getTime() - 900000).toISOString(), estimatedSource: "Russian EW — Krasukha-4", country: "RU" },
    { id: "jam-ua-1",  lat: 48.5, lng: 33.0, radiusKm: 90,  intensity: 0.64, affectedAircraft: 12, startTime: new Date(now.getTime() - 14400000).toISOString(), lastUpdate: new Date(now.getTime() - 480000).toISOString(), estimatedSource: "Conflict zone — mixed", country: "UA" },
    { id: "jam-ir-1",  lat: 33.5, lng: 45.0, radiusKm: 220, intensity: 0.88, affectedAircraft: 61, startTime: new Date(now.getTime() - 3600000).toISOString(), lastUpdate: new Date(now.getTime() - 120000).toISOString(), estimatedSource: "Post-strike EW activity", country: "IQ" },
  ];

  return NextResponse.json({ zones, source: "demo" });
}
