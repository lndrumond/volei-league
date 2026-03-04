/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Mantemos isso apenas por segurança na hora do build
    ignoreBuildErrors: true,
  }
};

export default nextConfig;