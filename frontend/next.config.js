/** @type {import('next').NextConfig} */
module.exports = {
  eslint: {
    // Reduce memory/time on constrained builders; rely on CI or local for lint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Reduce memory/time on constrained builders; rely on CI or local for type checks
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/:path*', 
      },
    ];
  },
};