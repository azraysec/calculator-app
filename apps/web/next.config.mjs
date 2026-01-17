/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@wig/shared-types',
    '@wig/core',
    '@wig/db',
    '@wig/adapters',
    '@wig/brokers',
    '@wig/agent-runtime'
  ],
  serverActions: {
    bodySizeLimit: '2mb'
  },
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp']
  }
};

export default nextConfig;
