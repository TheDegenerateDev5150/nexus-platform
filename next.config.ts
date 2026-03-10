import type { NextConfig } from "next";
import path from "path";
import webpack from "webpack";

const nextConfig: NextConfig = {
  env: {
    CESIUM_BASE_URL: "/cesium",
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins?.push(
        new webpack.DefinePlugin({
          CESIUM_BASE_URL: JSON.stringify("/cesium"),
        })
      );

      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
      };
    }

    return config;
  },
};

export default nextConfig;
