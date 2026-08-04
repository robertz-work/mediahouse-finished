/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Defense-in-depth. React escapes output and there is no inline eval,
    // but Next.js requires 'unsafe-inline'/'unsafe-eval' for its runtime.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  // Wyłączone z powodu react-leaflet 4.x: w dev StrictMode dwukrotnie
  // wywołuje lazy-initializer MapContainer na tym samym kontenerze
  // ("Map container is already initialized"). Dotyczy tylko trybu dev.
  reactStrictMode: false,
  output: "standalone",
  // Next 16: przeniesione z experimental.serverComponentsExternalPackages
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
