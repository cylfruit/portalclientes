"use client";

import { useSyncExternalStore } from "react";

type ThemeMode = "dark" | "light";

type ThemeToggleProps = {
  locale?: "es" | "en";
  className?: string;
};

const themeCopy = {
  es: {
    light: "Cambiar a modo claro",
    dark: "Cambiar a modo oscuro",
    currentLight: "Modo claro activo",
    currentDark: "Modo oscuro activo",
  },
  en: {
    light: "Switch to light mode",
    dark: "Switch to dark mode",
    currentLight: "Light mode active",
    currentDark: "Dark mode active",
  },
} as const;

function readTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(nextTheme: ThemeMode) {
  if (nextTheme === "light") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("cyl-theme", "light");
    window.dispatchEvent(new Event("cyl-theme-change"));
    return;
  }

  document.documentElement.dataset.theme = "dark";
  localStorage.removeItem("cyl-theme");
  window.dispatchEvent(new Event("cyl-theme-change"));
}

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("cyl-theme-change", onStoreChange);

  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("cyl-theme-change", onStoreChange);
  };
}

function getServerTheme(): ThemeMode {
  return "dark";
}

export function ThemeToggle({ locale = "es", className = "" }: ThemeToggleProps) {
  const copy = themeCopy[locale];
  const theme = useSyncExternalStore(subscribeTheme, readTheme, getServerTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? copy.light : copy.dark}
      title={isDark ? copy.currentDark : copy.currentLight}
      onClick={() => {
        const nextTheme = isDark ? "light" : "dark";
        applyTheme(nextTheme);
      }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white shadow-sm transition hover:border-cyl-gold/45 hover:bg-white/14 ${className}`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span className="sr-only">{isDark ? copy.light : copy.dark}</span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M20.2 14.4A7.8 7.8 0 0 1 9.6 3.8a8.4 8.4 0 1 0 10.6 10.6Z" />
    </svg>
  );
}
