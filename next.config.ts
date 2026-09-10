import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // no build/route overlay in front of a customer-facing page
  devIndicators: false,
};

export default nextConfig;
