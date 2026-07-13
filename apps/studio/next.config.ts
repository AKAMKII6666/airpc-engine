import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@airpc/rpg-engine"],
  serverExternalPackages: [],
  sassOptions: {},
};

export default nextConfig;
