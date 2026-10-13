import type { Metadata, Viewport } from "next";
import { asset } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mk-cybercode.github.io"),
  title: "Fiori Gelato — Investor information pack",
  description:
    "Fiori Gelato — investor information pack, Cape Town, July 2026. Establishing a premium gelato brand at reduced risk, before scaling.",
  icons: { icon: asset("/brand/mark/f-oval-deepblue.svg") },
  openGraph: {
    title: "Fiori Gelato — Investor information pack",
    description:
      "Gelato made in small batches. Fiori Gelato — investor information pack, Cape Town, July 2026.",
    images: [asset("/assets/salt-caramel.webp")],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#073c8c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Both faces are served from this site, so the wordmark's companions
            are never substituted while a third party is reached for. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href={asset("/brand/fonts/StackSansText.woff2")}
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href={asset("/brand/fonts/InstrumentSerif-Italic.woff2")}
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
