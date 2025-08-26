import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import NextAuthSessionProvider from "@/components/providers/session-provider";
import { getServerAuthSession } from "@/lib/server-session";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IssueHub",
  description: "Track projects and issues with IssueHub",
  icons: {
    icon: "/icon.png",            // from src/app/icon.png
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cached per request; pages can call the same helper without duplicating work
  const session = await getServerAuthSession();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextAuthSessionProvider session={session}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
