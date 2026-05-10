"use client";

// Home page for ScheduleU.
import Link from 'next/link';
import HeaderMenu from "../components/HeaderMenu";
import { ThemeToggle } from "../components/theme-toggle";

export default function HomePage() {
  const menuItems = [
    { href: "/about", label: "About Us" },
    { href: "/dashboard", label: "Get Started" },
    { href: "/login", label: "Login / Sign-up" },
  ];

  return (
    <div className="min-h-screen font-sans text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-soft)] bg-[var(--bg-elevated)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            <Link href="/" className="text-2xl font-bold tracking-tight transition-opacity hover:opacity-80 sm:text-3xl text-[var(--text-strong)]">
              Schedule<span className="text-schu-teal">U</span>
            </Link>
            <div className="w-6 h-6 border-2 border-schu-teal grid grid-cols-2 gap-0.5 p-0.5">
              <div className="bg-schu-teal"></div>
              <div className="bg-schu-teal"></div>
              <div className="bg-schu-teal"></div>
              <div className="bg-schu-teal"></div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <HeaderMenu
              items={menuItems}
              title="Navigate"
              accentClassName="text-[var(--text-primary)] border-[var(--border-soft)] bg-[var(--bg-surface)]"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 py-12 sm:px-6 md:flex-row md:gap-12 md:px-8 md:py-20">
        <div className="flex-1 space-y-6 text-left md:space-y-8">
          <h2 className="text-4xl font-black leading-tight uppercase sm:text-5xl lg:text-6xl text-[var(--text-strong)]">
            Plan Smarter, <br /> Schedule Easier
          </h2>
          <p className="max-w-lg text-lg leading-relaxed sm:text-xl text-[var(--text-secondary)]">
            Welcome to ScheduleU, your all-in-one scheduling and planning platform designed
            exclusively for CSU Long Beach students.
          </p>
          <Link href="/login" className="inline-block schu-gradient text-white font-bold py-4 px-8 rounded-lg shadow-md hover:scale-105 transition-transform uppercase text-sm tracking-widest">
            Create your own schedule now!
          </Link>
        </div>

        <div className="flex flex-1 justify-center">
          {/* Fixed the src path to match your file in the public folder */}
          <img
            src="/hero-image.png" 
            alt="ScheduleU Graphic"
            className="w-full max-w-xl h-auto drop-shadow-xl transition-all duration-500"
            onError={(e) => {
              console.error("Image failed to load. Check public/hero-image.png exists.");
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </main>
    </div>
  );
}
