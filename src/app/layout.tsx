import type { Metadata } from "next";
import {
  Gayathri,
  Geist,
  Geist_Mono,
  Manjari,
  Noto_Sans_Malayalam,
  Noto_Serif_Malayalam,
} from "next/font/google";

import { AppProviders } from "@/shared/components/providers/app-providers";
import { APP_DESCRIPTION, APP_NAME } from "@/shared/config/constants";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansMalayalam = Noto_Sans_Malayalam({
  variable: "--font-noto-sans-malayalam",
  subsets: ["malayalam", "latin"],
  weight: ["400", "600", "700", "800"],
});

const notoSerifMalayalam = Noto_Serif_Malayalam({
  variable: "--font-noto-serif-malayalam",
  subsets: ["malayalam", "latin"],
  weight: ["400", "600", "700", "800"],
});

const manjari = Manjari({
  variable: "--font-manjari",
  subsets: ["malayalam", "latin"],
  weight: ["400", "700"],
});

const gayathri = Gayathri({
  variable: "--font-gayathri",
  subsets: ["malayalam", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansMalayalam.variable} ${notoSerifMalayalam.variable} ${manjari.variable} ${gayathri.variable} min-h-svh font-sans antialiased`}
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
