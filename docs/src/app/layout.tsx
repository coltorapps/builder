import { type Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/app/providers";
import { Layout } from "@/components/layout";
import { GoogleAnalytics } from "@next/third-parties/google";
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
    template: "React Form Builder | %s - Docs",
    default: "React Form Builder | Drag and drop form builder with JSON schema form.",
  },
  description:
    "React Form Builder. React Native Form Builder. Develop your own Drag and Drop form builder, websites builder, dashboards builder and more. Generate JSON schema form, and seamless integration with React and Next.js",
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
      <GoogleAnalytics gaId="G-4DTPJ6V5QP" />
    </html>
  );
}
