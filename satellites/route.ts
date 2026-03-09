import { NextResponse } from "next/server";
export async function GET() {
  const now = new Date();
  const satellites = [
    { id: "kh11-1",    name: "KH-11 KENNEN (USA-245)",    noradId: "41788", country: "US", type: "optical",   lat: 33.5, lng: 44.0, altitude: 300, velocity: 7.8, heading: 195, overZone: "Irak / Iran",    isOverHotspot: true,  timestamp: now },
    { id: "bars-m-1",  name: "BARS-M № 2",                noradId: "40995", country: "RU", type: "optical",   lat: 35.0, lng: 51.0, altitude: 490, velocity: 7.6, heading: 210, overZone: "Téhéran",         isOverHotspot: true,  timestamp: new Date(now.getTime() - 480000) },
    { id: "gaofen-3",  name: "GAOFEN-3 (CN Radar SAR)",   noradId: "41922", country: "CN", type: "radar-sar", lat: 32.5, lng: 34.8, altitude: 755, velocity: 7.5, heading: 180, overZone: "Tel Aviv",        isOverHotspot: true,  timestamp: new Date(now.getTime() - 180000) },
    { id: "pleiades-1",name: "PLEIADES NEO-1 (FR)",       noradId: "49789", country: "FR", type: "optical",   lat: 48.5, lng:  2.4, altitude: 620, velocity: 7.6, heading:  95, overZone: null,              isOverHotspot: false, timestamp: now },
    { id: "ofek-16",   name: "OFEK-16 (IL Spy Sat)",      noradId: "45806", country: "IL", type: "optical",   lat: 28.0, lng: 42.0, altitude: 390, velocity: 7.7, heading: 120, overZone: "Arabie Saoudite", isOverHotspot: false, timestamp: now },
    { id: "capella-7", name: "CAPELLA-7 (SAR Commercial)",noradId: "52730", country: "US", type: "radar-sar", lat: 33.8, lng: 36.2, altitude: 525, velocity: 7.6, heading: 155, overZone: "Syrie",           isOverHotspot: false, timestamp: new Date(now.getTime() - 720000) },
  ];
  return NextResponse.json({ satellites, source: "demo" });
}
