/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite rodar um servidor de teste em outra pasta de build (NEXT_DIST_DIR), sem conflitar com o `npm run dev` do dono.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    // Mantemos isso apenas por segurança na hora do build
    ignoreBuildErrors: true,
  }
};

export default nextConfig;