import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Inter_Tight, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import "@/components/brand/tuesday-brand.css";
import AppProviders from "../components/AppProviders";
import SonnerToaster from "../components/SonnerToaster";
import { UI_THEME_BOOTSTRAP_SCRIPT } from "../lib/uiThemes";

/** Atelier (défaut) — next/font uniquement pour le thème de base (stable au build). */
const atelierSans = Inter({
  variable: "--font-atelier-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const atelierDisplay = Schibsted_Grotesk({
  variable: "--font-atelier-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const tueDisplay = Inter_Tight({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-tue-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tuesday",
    template: "%s | Tuesday",
  },
  description:
    "Tuesday — outil interne du service Communication IDENA : gestion de projet, événements, réseaux sociaux et stock.",
  applicationName: "Tuesday",
};

export const viewport: Viewport = {
  themeColor: "#F6F1EA",
};

const fontVariables = [
  atelierSans.variable,
  atelierDisplay.variable,
  tueDisplay.variable,
].join(" ");

/** Polices des thèmes Encre / Phare / Prairie / Rail — CSS Google (évite le bug next/font multi-loader). */
const THEME_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=IBM+Plex+Sans:wght@400;600",
    "family=Source+Serif+4:wght@600;700",
    "family=DM+Sans:wght@400;600",
    "family=Sora:wght@600;700",
    "family=Nunito:wght@400;700",
    "family=Fraunces:wght@600;700",
    "family=Space+Grotesk:wght@600;700",
  ].join("&") +
  "&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="atelier" className={fontVariables} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={THEME_FONTS_HREF} />
      </head>
      <body className="antialiased">
        <Script id="tuesday-ui-theme-boot" strategy="beforeInteractive">
          {UI_THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <AppProviders>
          <SonnerToaster />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
