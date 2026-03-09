import dynamic from "next/dynamic";

const GlobeView = dynamic(() => import("@/core/globe/GlobeView"), {
  ssr: false,
  loading: () => (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "sans-serif" }}>
      Loading globe...
    </div>
  ),
});

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <GlobeView />
    </main>
  );
}
