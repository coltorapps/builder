import { type Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/app/providers";
import { Layout } from "@/components/Layout";
import { Analytics } from "@vercel/analytics/react";
import clsx from "clsx";

import "@/styles/global.css";

import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const lexend = localFont({
  src: "../fonts/lexend.woff2",
  display: "swap",
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://builder.coltorapps.com"),
  title: {
    template: "%s - Docs",
    default: "Builder",
  },
  description:
    "Powerful library for crafting your own form builders and beyond.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={clsx("h-full antialiased", inter.variable, lexend.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-full bg-white dark:bg-neutral-950">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
