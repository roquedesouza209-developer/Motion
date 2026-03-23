import type { Metadata } from "next";
import type { CSSProperties } from "react";

import GlobalCallManager from "@/components/global-call-manager";

import SplashScreen from "./splash-screen";
import "./globals.css";

const fontVariables = {
  "--font-body": '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  "--font-heading": '"Trebuchet MS", "Avenir Next", "Segoe UI", sans-serif',
} as CSSProperties;

export const metadata: Metadata = {
  title: "Motion | Social WebApp",
  description:
    "Motion is a social media web app for photos, reels, stories, messaging, and personalized discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={fontVariables} className="antialiased">
        <SplashScreen>
          <GlobalCallManager />
          {children}
        </SplashScreen>
      </body>
    </html>
  );
}
