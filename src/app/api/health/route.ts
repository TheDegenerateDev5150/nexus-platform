import { NextResponse } from "next/server";

const START_TIME = Date.now();

export async function GET() {
  return NextResponse.json({
    status: "OK",
    service: "NEXUS Intelligence Platform",
    version: "8.0",
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
    sources: {
      gdelt: "active",
      usgs: "active",
      wikipedia: "active",
      darkweb_demo: "active",
    },
  });
}
