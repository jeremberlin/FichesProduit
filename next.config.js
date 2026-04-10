/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['docx', 'xlsx'],
  },
}

module.exports = nextConfig
