import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldWideView",
  description: "Real-time 3D geospatial intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
