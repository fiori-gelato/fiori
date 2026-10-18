import type { Metadata, Viewport } from "next";
import { asset } from "@/lib/site";

export const metadata: Metadata = {
  title: "Fiori OS",
  description: "Operating system for Fiori Gelato.",
  /* Private tool — keep it out of search results, and out of the link
     previews a messaging app builds. Without this it inherits the deck's
     card and announces an investor pack to whoever the link reaches. */
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  openGraph: { title: "Fiori OS", description: "", images: [] },
  twitter: { card: "summary", title: "Fiori OS", description: "" },
  manifest: asset("/app.webmanifest"),
  /* iOS ignores the manifest's icons and looks for this one. */
  appleWebApp: {
    capable: true,
    title: "Fiori OS",
    statusBarStyle: "default",
  },
  icons: {
    icon: asset("/assets/icon-192.png"),
    apple: asset("/assets/icon-apple-180.png"),
  },
  other: {
    /* Next emits only the modern spelling. Versions of iOS before 16.4 read
       the prefixed one, and without it they open in a browser tab. */
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* Let the page reach under the notch and home indicator; the shell pads
     itself back out with the safe-area insets. */
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2EFE7" },
    { media: "(prefers-color-scheme: dark)", color: "#171613" },
  ],
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
