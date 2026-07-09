"use client";

import { useEffect } from "react";

export function PortalMobileNav() {
  useEffect(() => {
    const toggle = document.getElementById("portal-nav-toggle");
    const overlay = document.getElementById("portal-nav-overlay");
    const backdrop = document.getElementById("portal-nav-backdrop");
    const closeBtn = document.getElementById("portal-nav-close");
    const drawer = document.getElementById("portal-nav-drawer");

    if (!toggle || !overlay || !drawer) return;

    let closeTimer: number | null = null;

    const open = () => {
      if (closeTimer !== null) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }

      overlay.classList.remove("hidden");
      overlay.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      drawer.classList.remove("translate-x-full");
      document.body.style.overflow = "hidden";
      closeBtn?.focus();
    };

    const close = () => {
      drawer.classList.add("translate-x-full");
      overlay.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      closeTimer = window.setTimeout(() => {
        overlay.classList.add("hidden");
        closeTimer = null;
      }, 300);
      document.body.style.overflow = "";
      toggle.focus();
    };

    const handleDocumentKeydown = (event: KeyboardEvent) => {
      if (overlay.classList.contains("hidden")) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const navLinks = drawer.querySelectorAll<HTMLAnchorElement>("a[href]");

    toggle.addEventListener("click", open);
    backdrop?.addEventListener("click", close);
    closeBtn?.addEventListener("click", close);
    navLinks.forEach((link) => link.addEventListener("click", close));
    document.addEventListener("keydown", handleDocumentKeydown);

    drawer.classList.add("translate-x-full");

    return () => {
      if (closeTimer !== null) {
        window.clearTimeout(closeTimer);
      }

      toggle.removeEventListener("click", open);
      backdrop?.removeEventListener("click", close);
      closeBtn?.removeEventListener("click", close);
      navLinks.forEach((link) => link.removeEventListener("click", close));
      document.removeEventListener("keydown", handleDocumentKeydown);
      document.body.style.overflow = "";
    };
  }, []);

  return null;
}
