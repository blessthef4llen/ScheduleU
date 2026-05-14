"use client";
// Reusable Pagelayout component for ScheduleU.

import Link from "next/link";
import type { ReactNode } from "react";
import HeaderMenu from "../HeaderMenu";
import styles from "./PageLayout.module.css";

type PageLayoutProps = {
  label?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function PageLayout({ label, title, subtitle, children }: PageLayoutProps) {
  const menuItems = [
    { href: "/courses", label: "Courses" },
    { href: "/schedule-builder", label: "Builder" },
    { href: "/planner", label: "Planner" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/notifications", label: "Notifications" },
    { href: "/registration-countdown", label: "Registration" },
    { href: "/daily-tips", label: "Daily Tips" },
    { href: "/ai-workload-scorer", label: "AI Workload" },
    { href: "/travelalerts", label: "Travel Alerts" },
    { href: "/transcript-import", label: "Progress" },
    { href: "/user-profile", label: "Profile" },
    { href: "/profile", label: "Settings" },
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          <Link href="/dashboard" className={styles.brand}>
            ScheduleU
          </Link>
          <HeaderMenu items={menuItems} title={title} />
        </div>
      </header>
      <main className={styles.main}>
        <section className="page-layout">
          {label ? <p className="page-label">{label}</p> : null}
          <header>
            <h1 className="page-title">{title}</h1>
            {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
          </header>
          {children}
        </section>
      </main>
    </div>
  );
}
