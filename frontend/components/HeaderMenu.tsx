"use client";
// Reusable Headermenu component for ScheduleU.

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type MenuItem = {
  href: string;
  label: string;
};

type HeaderMenuProps = {
  items: MenuItem[];
  title?: string;
  accentClassName?: string;
  children?: ReactNode;
};

export default function HeaderMenu({
  items,
  title = "Menu",
  accentClassName = "text-white",
  children,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 ${accentClassName}`}
      >
        <span className="h-0.5 w-5 rounded-full bg-current" />
        <span className="h-0.5 w-5 rounded-full bg-current" />
        <span className="h-0.5 w-5 rounded-full bg-current" />
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[999]">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(22rem,85vw)] flex-col gap-5 border-l border-[var(--border-soft)] bg-[var(--bg-surface)] px-5 py-6 text-[var(--text-primary)] shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {title}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)]"
              >
                Close
              </button>
            </div>

            <nav className="flex flex-col gap-2" aria-label={`${title} navigation`}>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:border-schu-teal/40 hover:bg-[var(--bg-soft)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {children ? <div className="border-t border-[var(--border-soft)] pt-4">{children}</div> : null}
          </aside>
        </div>
      , document.body) : null}
    </>
  );
}
