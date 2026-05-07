"use client";

import type { ReactNode } from "react";

type PageLayoutProps = {
  label?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function PageLayout({ label, title, subtitle, children }: PageLayoutProps) {
  return (
    <section className="page-layout">
      {label ? <p className="page-label">{label}</p> : null}
      <header>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
