import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import SafeDOMPatch from "./components/SafeDOMPatch";
import AnalyticsPingClient from './components/AnalyticsPingClient';
import { AchievementNotificationProvider } from "./context/AchievementNotificationContext";
import { UserNotificationProvider } from "./context/UserNotificationContext";
import CookieBanner from "./components/CookieBanner";
import AutoLogoutHandler from "./components/AutoLogoutHandler";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";

export const metadata = {
  title: 'BotlLab | Digital Brew Lab',
  description: 'Scanne den QR-Code auf meiner Flasche und entdecke das Geheimnis dieses Rezepts.',
  metadataBase: new URL('https://botllab.de'), // Hier deine echte Vercel-URL rein
  openGraph: {
    title: 'BotlLab – Handcrafted Beer',
    description: 'Entdecke KI-generierte Etiketten und Brau-Details in Echtzeit.',
    url: 'https://botllab.de',
    siteName: 'BotlLab',
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BotlLab | Digital Brew Lab',
    description: 'Dein Bier, deine Daten, dein Lab.',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <UserNotificationProvider>
            <AchievementNotificationProvider>
              <AnalyticsPingClient />
              <AutoLogoutHandler />
              <SafeDOMPatch />
              <Toaster richColors theme="dark" position="top-center" closeButton />
              {children}
              <CookieBanner />
              <SpeedInsights />
            </AchievementNotificationProvider>
          </UserNotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
