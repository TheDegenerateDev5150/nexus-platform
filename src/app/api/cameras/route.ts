import { NextResponse } from "next/server";
export async function GET() {
  const now = new Date();
  const cameras = [
    { id: "cam-il-1",  type: "traffic",      name: "Ayalon Highway — Tel Aviv",   lat: 32.07, lng: 34.79, city: "Tel Aviv",   country: "IL", isLive: true, cvDetections: ["smoke","emergency vehicles","crowd"], cvConfidence: 0.84, isAlertProximity: true,  lastUpdate: new Date(now.getTime() - 120000).toISOString() },
    { id: "cam-il-2",  type: "webcam",       name: "Tel Aviv Port — EarthCam",    lat: 32.10, lng: 34.77, city: "Tel Aviv",   country: "IL", isLive: true, cvDetections: ["military vehicles"],                  cvConfidence: 0.71, isAlertProximity: true,  lastUpdate: new Date(now.getTime() - 300000).toISOString() },
    { id: "cam-yt-1",  type: "youtube_live", name: "Jerusalem Live Feed",         lat: 31.78, lng: 35.22, city: "Jerusalem", country: "IL", isLive: true, cvDetections: ["crowd","police"],                     cvConfidence: 0.62, isAlertProximity: true,  lastUpdate: new Date(now.getTime() - 60000).toISOString() },
    { id: "cam-nyc-1", type: "traffic",      name: "Times Square DOT Camera",     lat: 40.76, lng:-73.99, city: "New York",   country: "US", isLive: true, cvDetections: [],                                     cvConfidence: 0,    isAlertProximity: false, lastUpdate: new Date(now.getTime() - 30000).toISOString() },
    { id: "cam-sg-1",  type: "port",         name: "Singapore Port Authority",    lat:  1.27, lng:103.82, city: "Singapore", country: "SG", isLive: true, cvDetections: [],                                     cvConfidence: 0,    isAlertProximity: false, lastUpdate: new Date(now.getTime() - 45000).toISOString() },
    { id: "cam-tw-1",  type: "weather",      name: "Keelung Port — Windy Webcam", lat: 25.13, lng:121.73, city: "Keelung",   country: "TW", isLive: true, cvDetections: [],                                     cvConfidence: 0,    isAlertProximity: true,  lastUpdate: new Date(now.getTime() - 480000).toISOString() },
  ];
  return NextResponse.json({ cameras, source: "demo" });
}
