import { NextResponse } from "next/server";
/**
 * NEXUS Correlation API
 * Returns current engine events + source health.
 * The engine singleton runs server-side; in production use a
 * persistent process (Next.js edge runtime or dedicated Node.js server).
 */
export async function GET() {
  // Return current engine state (demo-quality for now)
  const events = [
    { id: "nexus-tel_aviv-militaire", level: 9, category: "MILITAIRE", lat: 32.08, lng: 34.78, radiusKm: 120, zone: "Tel Aviv", country: "IL", signalCount: 7, confidence: 0.94, explanation: "7 signaux corrélés. Spatial 92%, temporel 88%, NLP 95%. Similaire 7 Oct 2023 à 78%.", detectedAt: new Date(Date.now() - 300000), updatedAt: new Date(), status: "active" },
    { id: "nexus-taiwan-géopolitique", level: 7, category: "GÉOPOLITIQUE", lat: 23.69, lng: 120.96, radiusKm: 200, zone: "Détroit de Taiwan", country: "TW", signalCount: 5, confidence: 0.81, explanation: "5 signaux. Maritime + social + economic corrélés.", detectedAt: new Date(Date.now() - 840000), updatedAt: new Date(), status: "active" },
  ];
  return NextResponse.json({ events, timestamp: new Date(), engineStatus: "nominal" });
}
