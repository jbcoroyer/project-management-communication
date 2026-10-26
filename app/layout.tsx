import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import "@/components/brand/tuesday-brand.css";
import AppProviders from "../components/AppProviders";
import SonnerToaster from "../components/SonnerToaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={tueDisplay.variable}>
      <body className={`${inter.variable} ${schibsted.variable} antialiased`}>
        <AppProviders>
          <SonnerToaster />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
