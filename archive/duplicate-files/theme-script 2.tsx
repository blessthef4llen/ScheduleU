"use client";

import Script from "next/script";

const themeInitScript = `
  (() => {
    const storageKey = "scheduleu-theme";
    const root = document.documentElement;
    const saved = localStorage.getItem(storageKey);
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved === "light" || saved === "dark" ? saved : (systemDark ? "dark" : "light");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  })();
`;

export function ThemeScript() {
  return <Script id="theme-init" strategy="beforeInteractive">{themeInitScript}</Script>;
}
