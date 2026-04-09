import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AppProviders from "../components/AppProviders";
import SonnerToaster from "../components/SonnerToaster";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Service Communication IDENA",
    template: "%s | Service Communication IDENA",
  },
  description:
    "Outil interne du service Communication IDENA — gestion de projet, événements, réseaux sociaux et stock.",
  applicationName: "Service Communication IDENA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${plusJakarta.variable} antialiased`}>
        <AppProviders>
          <SonnerToaster />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
