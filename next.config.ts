import type { NextConfig } from "next";

/**
 * Static export.
 *
 * The one thing that changes with the address is the base path: empty when
 * the site is served from the root of its own domain, "/fiori" when it is
 * served from a folder on github.io. Everything else derives from it —
 * `asset()` in lib/site, relative URLs in the stylesheet, the manifest and
 * the survey, and the service worker, which reads its own location. Set it
 * once here and in lib/site.ts.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
