import './globals.css'
import NotificationBell from "@/components/NotificationBell"
import Link from "next/link"
import type { ReactNode } from "react"

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html>
      <body>
        <div className="app-shell">
          <header className="app-navbar">
            <div className="app-navbar__inner">
              <h2 className="brand-title">ScheduleU</h2>
              <nav className="app-nav-links">
                <Link href="/" className="app-nav-link">
                  Dashboard
                </Link>
                <Link href="/planner" className="app-nav-link">
                  Planner
                </Link>
                <Link href="/about" className="app-nav-link">
                  About Us
                </Link>
                <Link href="/login" className="app-nav-link">
                  Login/Signup
                </Link>
                <Link href="/account" className="app-nav-link">
                  My Account
                </Link>
                <NotificationBell />
              </nav>
            </div>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  )
}
