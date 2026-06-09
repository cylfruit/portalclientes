"use client";

import { useEffect } from "react";

export function PortalMobileNav() {
  useEffect(() => {
    const toggle = document.getElementById("portal-nav-toggle");
    const overlay = document.getElementById("portal-nav-overlay");
    const backdrop = document.getElementById("portal-nav-backdrop");
    const closeBtn = document.getElementById("portal-nav-close");

    if (!toggle || !overlay) return;

    const open = () => {
      overlay.classList.remove("hidden");
      overlay.querySelector("div:last-child")?.classList.remove("translate-x-full");
      document.body.style.overflow = "hidden";
    };

    const close = () => {
      overlay.querySelector("div:last-child")?.classList.add("translate-x-full");
      setTimeout(() => {
        overlay.classList.add("hidden");
      }, 300);
      document.body.style.overflow = "";
    };

    toggle.addEventListener("click", open);
    backdrop?.addEventListener("click", close);
    closeBtn?.addEventListener("click", close);

    overlay.querySelector("div:last-child")?.classList.add("translate-x-full");

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    return () => {
      toggle.removeEventListener("click", open);
      backdrop?.removeEventListener("click", close);
      closeBtn?.removeEventListener("click", close);
    };
  }, []);

  return null;
}
