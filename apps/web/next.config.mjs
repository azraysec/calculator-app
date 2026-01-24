import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Get build-time information
const getGitCommit = () => {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
};

const getVersion = () => {
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
    return pkg.version;
  } catch {
    return '0.1.0';
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    '@wig/shared-types',
    '@wig/core',
    '@wig/db',
    '@wig/adapters',
    '@wig/brokers',
    '@wig/agent-runtime'
  ],
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp']
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: getVersion(),
    NEXT_PUBLIC_GIT_COMMIT: getGitCommit(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': [
        '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*',
        '../../packages/db/node_modules/.prisma/client/**/*',
      ],
    },
  },
};

export default nextConfig;
