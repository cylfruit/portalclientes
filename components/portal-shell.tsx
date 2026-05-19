import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type PortalShellProps = {
  activePath: "/" | "/usuarios";
  heading: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
};

const navigation = [
  { href: "/", label: "Inicio", key: "inicio", icon: <HomeIcon /> },
  {
    href: "/#embarques",
    label: "Embarques",
    key: "embarques",
    icon: <ShipIcon />,
  },
  {
    href: "/#tracking",
    label: "Tracking",
    key: "tracking",
    icon: <PinIcon />,
  },
  {
    href: "/#documentos",
    label: "Documentos",
    key: "documentos",
    icon: <DocumentIcon />,
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    key: "usuarios",
    icon: <UsersIcon />,
  },
];

export function PortalShell({
  activePath,
  heading,
  description,
  aside,
  children,
}: PortalShellProps) {
  const activeKey = activePath === "/usuarios" ? "usuarios" : "embarques";

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-cyl-paper">
      <header className="sticky top-0 z-40 border-b border-cyl-gold/70 bg-black/88 backdrop-blur-xl">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/brand/bg_intranet.jpg"
              alt=""
              fill
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
                  Portal de Clientes
                </p>
                <p className="mt-1 text-sm text-white/68">C&amp;L Fruit</p>
              </div>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
              {navigation.map((item) => {
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

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyl-gold/16 text-cyl-gold">
                  <UserIcon />
                </span>
                cliente demo
              </div>
              <Link
                href="/usuarios"
                className="rounded-full border border-white/20 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Perfil
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Salir
              </Link>
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
              Portal cliente C&amp;L
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

      <main className="relative mx-auto max-w-screen-2xl space-y-8 px-4 py-8 lg:px-8 lg:py-10">
        {children}
      </main>

      <footer className="relative overflow-hidden border-t border-cyl-gold/20 bg-black">
        <div className="absolute inset-0">
          <Image
            src="/brand/bg_intranet.jpg"
            alt=""
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
                Portal de Clientes
              </p>
              <p className="max-w-2xl leading-6 text-white/68">
                Embarques, documentos y trazabilidad de fruta en una interfaz
                alineada visualmente con el portal principal de C&amp;L.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
            <span className="rounded-full border border-white/10 px-3 py-2">
              Embarques
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              Pallets
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              Documentos
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              Accesos
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
    >
      <path d="m3 9 7-6 7 6" />
      <path d="M5 8.5V17h10V8.5" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
    >
      <path d="M4 13h12l-1.7 3H5.7L4 13Z" />
      <path d="M7 13V7h6v6" />
      <path d="M10 4v3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
    >
      <path d="M10 17s4-4.4 4-8a4 4 0 1 0-8 0c0 3.6 4 8 4 8Z" />
      <circle cx="10" cy="9" r="1.7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
    >
      <path d="M6 3h5l3 3v11H6z" />
      <path d="M11 3v3h3" />
      <path d="M8 10h4" />
      <path d="M8 13h4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
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
