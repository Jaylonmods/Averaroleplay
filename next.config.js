/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: 'build',
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
}

module.exports = nextConfig
