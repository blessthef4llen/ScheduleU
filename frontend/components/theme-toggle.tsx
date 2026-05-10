"use client";
// Reusable Theme Toggle component for ScheduleU.

import { useEffect, useState } from "react";

const STORAGE_KEY = "scheduleu-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const rootTheme = document.documentElement.dataset.theme;
    if (rootTheme === "dark" || rootTheme === "light") {
      setTheme(rootTheme);
    }
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={ready ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle color mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`.trim()}
      style={{
        borderColor: "var(--border-soft)",
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
      }}
    >
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
    </button>
  );
}
