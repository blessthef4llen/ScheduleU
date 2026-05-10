// Source file for Layout.
import type { ReactNode } from "react";
import "../globals.css";
import { ThemeScript } from "../components/theme-script";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeScript />
        {children}
      </body>
    </html>
  )
}
