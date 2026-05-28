import type { NextConfig } from "next";

/** Sur Vercel, dérive l’URL publique pour les emails Supabase (reset password) si non définie à la main. */
const publicAppUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}` : "");

/** Hostname Supabase Storage de production (NEXT_PUBLIC_SUPABASE_URL). */
const supabaseHostname = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  env: {
    ...(publicAppUrl ? { NEXT_PUBLIC_APP_URL: publicAppUrl } : {}),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Buckets publics Supabase Storage — autoriser /storage/v1/object/public/...
      ...(supabaseHostname
        ? ([
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ])
        : []),
      // Fallback large (au cas où NEXT_PUBLIC_SUPABASE_URL ne soit pas défini au build)
      {
        protocol: "https" as const,
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
  },
};

export default nextConfig;
