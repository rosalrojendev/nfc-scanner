import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self), nfc=(self)",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https://*.utfs.io https://*.ufs.sh",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      // `blob:` lets the PDF / plate generators spawn the in-page worker
      // that @react-pdf/renderer creates from a Blob URL during production
      // builds. Without it the worker is silently blocked and the
      // pdf().toBlob() promise never resolves on the deployed site.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "connect-src 'self' https://*.ingest.uploadthing.com https://uploadthing.com https://*.ufs.sh https://*.utfs.io",
      "font-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @react-pdf/renderer pulls in the Node-only `canvas` package as a
  // fallback even though the browser provides `window.HTMLCanvasElement`
  // natively. Aliasing `canvas: false` tells webpack to drop the package
  // from the production bundle; without this, the deployed build silently
  // includes the Node canvas binding which fails to load at runtime and
  // breaks every pdf().toBlob() call (plate PDFs + report PDFs).
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false>),
      canvas: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
