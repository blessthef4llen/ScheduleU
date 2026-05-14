// Source file for Layout.
import type { ReactNode } from "react";
import "../globals.css";
import "./globals.css";
import { ThemeScript } from "../components/theme-script";
import { AuthSessionManager } from "../components/AuthSessionManager";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <AuthSessionManager />
        {children}
      </body>
    </html>
  )
}
