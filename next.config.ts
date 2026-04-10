import type { NextConfig } from "next";

/** Sur Vercel, dérive l’URL publique pour les emails Supabase (reset password) si non définie à la main. */
const publicAppUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}` : "");

const nextConfig: NextConfig = {
  env: {
    ...(publicAppUrl ? { NEXT_PUBLIC_APP_URL: publicAppUrl } : {}),
  },
};

export default nextConfig;
