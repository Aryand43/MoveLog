import type { NextConfig } from "next";

const config: NextConfig = {
  // The backend lives on Modal; nothing is built from it at compile time.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default config;
