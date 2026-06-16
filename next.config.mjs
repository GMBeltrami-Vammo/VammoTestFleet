/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Block this internal dashboard from being framed (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Don't let browsers MIME-sniff responses.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak full URLs (which can carry filters) to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // This app needs none of these device APIs.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Enforce HTTPS for two years, including subdomains.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['vm-*.vusercontent.net'],

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
