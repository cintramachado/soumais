import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfmake'],
  async rewrites() {
    const internalUrl = process.env.SUPABASE_URL_INTERNAL?.replace(/\/$/, '');
    if (process.env.SUPABASE_PROXY_PATHS !== 'true' || !internalUrl) return [];
    return [
      { source: '/auth/v1/:path*', destination: `${internalUrl}/auth/v1/:path*` },
      { source: '/rest/v1/:path*', destination: `${internalUrl}/rest/v1/:path*` },
      { source: '/storage/v1/:path*', destination: `${internalUrl}/storage/v1/:path*` },
      { source: '/functions/v1/:path*', destination: `${internalUrl}/functions/v1/:path*` },
      { source: '/graphql/v1', destination: `${internalUrl}/graphql/v1` },
    ];
  },
  outputFileTracingIncludes: {
    '/api/reports/class': ['./node_modules/pdfmake/fonts/**/*'],
  },
};

export default nextConfig;
