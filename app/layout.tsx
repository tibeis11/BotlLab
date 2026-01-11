import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { AchievementNotificationProvider } from "./context/AchievementNotificationContext";
import CookieBanner from "./components/CookieBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'BotlLab | Digital Brew Lab',
  description: 'Scanne den QR-Code auf meiner Flasche und entdecke das Geheimnis dieses Suds.',
  metadataBase: new URL('https://botllab.vercel.app'), // Hier deine echte Vercel-URL rein
  openGraph: {
    title: 'BotlLab – Handcrafted Beer',
    description: 'Entdecke KI-generierte Etiketten und Brau-Details in Echtzeit.',
    url: 'https://botllab.vercel.app',
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <AchievementNotificationProvider>
            {children}
            <CookieBanner />
          </AchievementNotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
