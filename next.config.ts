import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfmake'],
  outputFileTracingIncludes: {
    '/api/reports/class': ['./node_modules/pdfmake/fonts/**/*'],
  },
};

export default nextConfig;
