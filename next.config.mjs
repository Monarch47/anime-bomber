/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  eslint: {
    // The game is verified via `npm run typecheck`; skip lint during builds.
    ignoreDuringBuilds: true,
  },
};

export default config;
