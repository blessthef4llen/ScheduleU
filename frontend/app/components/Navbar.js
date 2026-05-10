"use client";
// Reusable Navbar component for ScheduleU.

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link href="/" className="logo">
        ScheduleU
      </Link>

      <div className="nav-links">
        <Link href="/about">
          <button>About Us</button>
        </Link>

        <Link href="/notifications">
          <button>Notification Center</button>
        </Link>

        <Link href="/travel-alerts">
          <button>Travel Alerts</button>
        </Link>

        <Link href="/login">
          <button>Login / Sign Up</button>
        </Link>

        <Link href="/account">
          <button>My Account</button>
        </Link>
      </div>
    </nav>
  );
}