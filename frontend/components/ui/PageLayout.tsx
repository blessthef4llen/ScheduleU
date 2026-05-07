"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./PageLayout.module.css";

type PageLayoutProps = {
  label?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function PageLayout({ label, title, subtitle, children }: PageLayoutProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          <Link href="/dashboard" className={styles.brand}>
            ScheduleU
          </Link>
          <nav className={styles.links} aria-label="ScheduleU feature navigation">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/planner">Planner</Link>
            <Link href="/notifications">Notifications</Link>
            <Link href="/registration-countdown">Registration</Link>
            <Link href="/ai-workload-scorer">AI Workload</Link>
            <Link href="/travelalerts">Travel Alerts</Link>
          </nav>
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
