import type { Metadata, Viewport } from "next";
import { asset, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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

/**
 * The brand's faces and its f mark, declared here rather than in the
 * stylesheet.
 *
 * They are served from this site's own public folder, so their URLs carry the
 * base path — and the base path is only known to the build. Putting them in
 * the stylesheet would hand them to webpack's resolver, which looks for files
 * beside the sheet and would not find them.
 */
const brandFaces = `
@font-face {
  font-family: 'Stack Sans Text';
  src: url('${asset("/brand/fonts/StackSansText.woff2")}') format('woff2-variations');
  font-weight: 200 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Instrument Serif';
  src: url('${asset("/brand/fonts/InstrumentSerif-Regular.woff2")}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Instrument Serif';
  src: url('${asset("/brand/fonts/InstrumentSerif-Italic.woff2")}') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
:root { --mark-f: url('${asset("/brand/mark/f-deepblue.svg")}'); }
`;

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
        <style dangerouslySetInnerHTML={{ __html: brandFaces }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
