import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    // Exclude Supabase Edge Functions from webpack
    config.externals = config.externals || [];
    config.externals.push({
      'https://deno.land/std@0.168.0/http/server.ts': 'commonjs https://deno.land/std@0.168.0/http/server.ts',
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xldxituggwdlhzlwkjcf.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      }
    ],
  },
};

export default nextConfig;
