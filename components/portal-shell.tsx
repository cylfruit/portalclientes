import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  readCsrfTokenFromCookies,
  readSessionClaimsFromCookies,
} from "@/lib/auth";
import { isPortalAdminRole } from "@/lib/auth-session";
import { PortalMobileNav } from "./portal-mobile-nav";
import { ThemeToggle } from "./theme-toggle";

type PortalShellProps = {
  activePath: "/" | "/usuarios";
  heading: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
};

const shellCopy = {
  es: {
    brandTitle: "Portal de Clientes",
    brandKicker: "Portal cliente C&L",
    authenticatedClient: "Cliente autenticado",
    skipToContent: "Saltar al contenido principal",
    mainNavigation: "Navegacion principal",
    mobileNavigation: "Navegacion movil",
    openNavigation: "Abrir navegacion",
    closeNavigation: "Cerrar navegacion",
    users: "Usuarios",
    logout: "Salir",
    footerDescription:
      "Embarques, documentos y trazabilidad de fruta en una interfaz alineada visualmente con el portal principal de C&L.",
    chips: ["Embarques", "Documentos", "Accesos"],
    navigation: [
      {
        href: "/usuarios",
        label: "Usuarios",
        key: "usuarios",
        icon: <UsersIcon />,
      },
    ],
  },
  en: {
    brandTitle: "Client Portal",
    brandKicker: "C&L client portal",
    authenticatedClient: "Authenticated client",
    skipToContent: "Skip to main content",
    mainNavigation: "Main navigation",
    mobileNavigation: "Mobile navigation",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    users: "Users",
    logout: "Sign out",
    footerDescription:
      "Shipments, documents, and fruit traceability in an interface visually aligned with the main C&L portal.",
    chips: ["Shipments", "Documents", "Access"],
    navigation: [
      {
        href: "/usuarios",
        label: "Users",
        key: "usuarios",
        icon: <UsersIcon />,
      },
    ],
  },
} as const;

export async function PortalShell({
  activePath,
  heading,
  description,
  aside,
  children,
}: PortalShellProps) {
  const sessionClaims = await readSessionClaimsFromCookies();
  const csrfToken = await readCsrfTokenFromCookies();
  const locale = sessionClaims?.preferredLocale === "en" ? "en" : "es";
  const copy = shellCopy[locale];
  const displayUserName = (
    sessionClaims?.fullName ?? copy.authenticatedClient
  ).toLocaleUpperCase(locale === "es" ? "es-CL" : "en-US");
  const canManageUsers = sessionClaims
    ? isPortalAdminRole(sessionClaims.roleKey)
    : false;
  const visibleNavigation = canManageUsers
    ? copy.navigation
    : copy.navigation.filter((item) => item.key !== "usuarios");
  const activeKey = activePath === "/usuarios" ? "usuarios" : null;

  return (
    <div className="portal-shell-root min-h-screen text-cyl-ink">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[120] rounded-full bg-cyl-gold px-5 py-3 text-sm font-bold text-cyl-black shadow-xl focus:not-sr-only"
      >
        {copy.skipToContent}
      </a>

      <header className="sticky top-0 z-40 border-b border-cyl-gold/70 bg-black/88 shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/brand/bg_intranet.jpg"
              alt=""
              fill
              loading="eager"
              sizes="100vw"
              className="object-cover opacity-16"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.92),rgba(0,0,0,0.8))]" />
          </div>

          <div className="relative mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-4 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <Image
                src="/brand/logocyl.png"
                alt="C&L Fruit"
                width={72}
                height={72}
                className="h-14 w-14 object-contain"
              />
              <div className="min-w-0">
                <p className="text-xl font-black leading-none text-white sm:text-2xl">
                  {copy.brandTitle}
                </p>
                <p className="mt-1 text-sm text-white/68">C&amp;L Fruit</p>
              </div>
            </Link>

            {visibleNavigation.length > 0 ? (
              <>
                <button
                  id="portal-nav-toggle"
                  type="button"
                  className="ml-auto inline-flex items-center justify-center rounded-2xl border border-white/14 bg-white/8 p-2.5 text-white transition hover:bg-white/14 lg:hidden"
                  aria-controls="portal-nav-overlay"
                  aria-expanded="false"
                  aria-label={copy.openNavigation}
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                <nav
                  aria-label={copy.mainNavigation}
                  className="hidden flex-1 items-center justify-center gap-1 lg:flex"
                >
                  {visibleNavigation.map((item) => {
                    const isActive = item.key === activeKey;

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                            : "text-white/74 hover:bg-white/6 hover:text-white"
                        }`}
                      >
                        <span
                          className={`${isActive ? "text-cyl-gold" : "text-white/55"}`}
                        >
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </>
            ) : null}

            <div
              className={`flex items-center gap-2 sm:gap-3 ${visibleNavigation.length > 0 ? "" : "ml-auto"}`}
            >
              <ThemeToggle locale={locale} />
              <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyl-gold/16 text-cyl-gold">
                  <UserIcon />
                </span>
                {displayUserName}
              </div>
              {canManageUsers ? (
                <Link
                  href="/usuarios"
                  className="rounded-full border border-white/20 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {copy.users}
                </Link>
              ) : null}
              <form action="/api/auth/logout" method="post">
                <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
                <button
                  type="submit"
                  className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {copy.logout}
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-cyl-gold/20 bg-[#202020]">
        <div className="absolute inset-0">
          <Image
            src="/brand/bg_login.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-16"
          />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(0,0,0,0.86),rgba(18,18,18,0.8),rgba(18,18,18,0.74))]" />
        </div>

        <div
          className={`relative mx-auto max-w-screen-2xl px-4 lg:px-8 ${
            aside
              ? "grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end"
              : "py-10"
          }`}
        >
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyl-gold-soft/78">
              {copy.brandKicker}
            </p>
            <h1
              className={`portal-display max-w-4xl leading-none text-white ${aside ? "text-5xl sm:text-6xl lg:text-7xl" : "text-[3.4rem] sm:text-[4.3rem]"}`}
            >
              {heading}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/76 sm:text-lg">
              {description}
            </p>
          </div>

          {aside ? <div className="self-end">{aside}</div> : null}
        </div>
      </section>

      <main
        id="main-content"
        tabIndex={-1}
        className="portal-main relative mx-auto max-w-screen-2xl space-y-8 px-4 py-8 lg:px-8 lg:py-10"
      >
        {children}
      </main>

      {/* Mobile nav overlay (root level to avoid z-index stacking issues) */}
      <div
        id="portal-nav-overlay"
        className="fixed inset-0 z-100 hidden"
        role="dialog"
        aria-modal="true"
        aria-hidden="true"
        aria-labelledby="portal-nav-title"
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          id="portal-nav-backdrop"
        ></div>
        <div
          id="portal-nav-drawer"
          className="absolute right-0 top-0 h-full w-72 bg-[#1d1d1d] border-l border-white/10 shadow-2xl p-6 translate-x-full transition-transform duration-300"
        >
          <div className="flex items-center justify-between mb-8">
            <span
              id="portal-nav-title"
              className="text-sm font-semibold text-white/70"
            >
              {copy.mobileNavigation}
            </span>
            <button
              id="portal-nav-close"
              type="button"
              className="rounded-full border border-white/14 bg-white/8 p-2 text-white hover:bg-white/14"
              aria-label={copy.closeNavigation}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <nav aria-label={copy.mobileNavigation} className="flex flex-col gap-2">
            {visibleNavigation.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
                      : "text-white/74 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <span
                    className={isActive ? "text-cyl-gold" : "text-white/55"}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <PortalMobileNav />

      <footer className="relative overflow-hidden border-t border-cyl-gold/20 bg-black">
        <div className="absolute inset-0">
          <Image
            src="/brand/bg_intranet.jpg"
            alt=""
            loading="eager"
            fill
            sizes="100vw"
            className="object-cover opacity-22"
          />
          <div className="absolute inset-0 bg-black/82" />
        </div>

        <div className="relative mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-8 text-sm text-white/75 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/logocyl.png"
              alt="C&L Fruit"
              width={56}
              height={56}
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-lg font-semibold text-white sm:text-xl">
                {copy.brandTitle}
              </p>
              <p className="max-w-2xl leading-6 text-white/68">
                {copy.footerDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            {copy.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 px-3 py-2"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
    >
      <circle cx="7" cy="8" r="2.5" />
      <path d="M3.5 15a3.5 3.5 0 0 1 7 0" />
      <circle cx="14.5" cy="8.5" r="2" />
      <path d="M12.5 15a2.7 2.7 0 0 1 4 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
    >
      <circle cx="10" cy="7" r="3" />
      <path d="M4.5 16a5.5 5.5 0 0 1 11 0" />
    </svg>
  );
}
