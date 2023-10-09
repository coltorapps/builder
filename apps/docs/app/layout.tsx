import { type ReactNode } from "react";

import "./globals.css";

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-background font-sans antialiased">
        {props.children}
      </body>
    </html>
  );
}
