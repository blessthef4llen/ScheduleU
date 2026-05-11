// Source file for Layout.
import type { ReactNode } from "react";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import "../globals.css";
import { ThemeScript } from "../components/theme-script";
import { AuthSessionManager } from "../components/AuthSessionManager";
import { ClerkSupabaseBridge } from "../components/ClerkSupabaseBridge";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <ThemeScript />
          <ClerkSupabaseBridge />
          <header className="clerk-auth-bar" aria-label="Authentication controls">
            <div className="clerk-auth-bar__inner">
              <p className="clerk-auth-bar__label">ScheduleU Access</p>
              <div className="clerk-auth-bar__actions">
                <Show when="signed-out">
                  <SignInButton>
                    <button type="button" className="clerk-auth-btn clerk-auth-btn--secondary">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button type="button" className="clerk-auth-btn clerk-auth-btn--primary">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="clerk-auth-user">
                    <span className="clerk-auth-user__text">Account</span>
                    <UserButton />
                  </div>
                </Show>
              </div>
            </div>
          </header>
          <AuthSessionManager />
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
