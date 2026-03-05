/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['gibs.earthdata.nasa.gov', 'server.arcgisonline.com'],
  },
}

module.exports = nextConfig
