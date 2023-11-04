import { type Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/app/providers";
import { Layout } from "@/components/Layout";
import clsx from "clsx";

import "@/styles/tailwind.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Use local version of Lexend so that we can use OpenType features
const lexend = localFont({
  src: "../fonts/lexend.woff2",
  display: "swap",
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: {
    template: "%s - Docs",
    default: "CacheAdvance - Never miss the cache again.",
  },
  description:
    "Cache every single thing your app could ever do ahead of time, so your code never even has to run at all.",
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
      </body>
    </html>
  );
}
