/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  outputFileTracingIncludes: {
    '/**': ['./prisma/**', './public/**', './src/data/**'],
  },
};

export default nextConfig;
