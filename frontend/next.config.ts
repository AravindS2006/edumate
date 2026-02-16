import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://127.0.0.1:8000/api/:path*' // Proxy to Backend
          : 'http://127.0.0.1:8000/api/:path*', // Update this for production too if needed, or rely on Vercel rewrites if backend is separate
      },
    ];
  },
};

export default nextConfig;
