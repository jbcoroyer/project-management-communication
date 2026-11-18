import type { Metadata, Viewport } from "next";
import Script from "next/script";
import {
  DM_Sans,
  Fraunces,
  IBM_Plex_Sans,
  Inter,
  Inter_Tight,
  Nunito,
  Schibsted_Grotesk,
  Sora,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import "@/components/brand/tuesday-brand.css";
import AppProviders from "../components/AppProviders";
import SonnerToaster from "../components/SonnerToaster";
import { UI_THEME_BOOTSTRAP_SCRIPT } from "../lib/uiThemes";

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

const encreSans = IBM_Plex_Sans({
  variable: "--font-encre-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const encreDisplay = Source_Serif_4({
  variable: "--font-encre-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const phareDisplay = Sora({
  variable: "--font-phare-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const prairieSans = Nunito({
  variable: "--font-prairie-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const prairieDisplay = Fraunces({
  variable: "--font-prairie-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const railDisplay = Space_Grotesk({
  variable: "--font-rail-display",
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
  encreSans.variable,
  encreDisplay.variable,
  dmSans.variable,
  phareDisplay.variable,
  prairieSans.variable,
  prairieDisplay.variable,
  railDisplay.variable,
  tueDisplay.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="atelier" className={fontVariables} suppressHydrationWarning>
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
