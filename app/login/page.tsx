import Image from "next/image";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCurrentAuthenticatedPortalUser,
  readCsrfTokenFromCookies,
} from "@/lib/auth";
import { sanitizeNextPath } from "@/lib/auth-session";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acceso al portal",
  description:
    "Ingresa al portal privado de C&L Fruit para revisar embarques, tracking maritimo y documentos de exportacion.",
  alternates: {
    canonical: "/login",
  },
};

type LoginLocale = "es" | "en";

const errorMessages: Record<LoginLocale, Record<string, string>> = {
  es: {
    "invalid-credentials": "Usuario o contrasena incorrectos.",
    pending: "Tu usuario aun esta pendiente de activacion.",
    blocked: "Tu usuario esta bloqueado. Contacta a administracion.",
    csrf: "La sesion del formulario expiro. Intenta ingresar nuevamente.",
    "session-expired": "Debes volver a iniciar sesion para continuar.",
    "admin-required":
      "Necesitas privilegios de administracion para acceder a esa ruta.",
  },
  en: {
    "invalid-credentials": "Incorrect username or password.",
    pending: "Your user is still pending activation.",
    blocked: "Your user is blocked. Contact administration.",
    csrf: "The form session expired. Please sign in again.",
    "session-expired": "You need to sign in again to continue.",
    "admin-required": "Administrator privileges are required for that route.",
  },
};

const loginCopy: Record<
  LoginLocale,
  {
    brandKicker: string;
    heroTitle: string;
    heroDescription: string;
    heroTags: [string, string, string];
    formKicker: string;
    formTitle: string;
    formDescription: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submitLabel: string;
    logoutMessage: string;
  }
> = {
  es: {
    brandKicker: "Portal cliente C&L",
    heroTitle: "Acceso al portal",
    heroDescription:
      "Consulta tus embarques, sigue el recorrido de tus contenedores y revisa documentos y fechas clave desde un solo portal.",
    heroTags: [
      "Seguimiento de embarques",
      "Documentos disponibles",
      "ETD y ETA",
    ],
    formKicker: "Iniciar sesion",
    formTitle: "Accede a tu operacion",
    formDescription:
      "Visualiza el estado de cada embarque, descarga documentos asociados y consulta informacion actualizada de salida y llegada.",
    usernameLabel: "Usuario",
    usernamePlaceholder: "admin_portal",
    passwordLabel: "Contrasena",
    passwordPlaceholder: "Tu clave del portal",
    submitLabel: "Entrar al portal",
    logoutMessage: "Sesion cerrada.",
  },
  en: {
    brandKicker: "C&L client portal",
    heroTitle: "Portal access",
    heroDescription:
      "Review your shipments, track container movement, and check documents and key voyage dates from a single portal.",
    heroTags: ["Shipment tracking", "Available documents", "ETD and ETA"],
    formKicker: "Sign in",
    formTitle: "Access your operation",
    formDescription:
      "View the status of each shipment, download related documents, and check updated departure and arrival information.",
    usernameLabel: "Username",
    usernamePlaceholder: "admin_portal",
    passwordLabel: "Password",
    passwordPlaceholder: "Your portal password",
    submitLabel: "Enter portal",
    logoutMessage: "Signed out.",
  },
};

function resolveLoginLocale(acceptLanguage: string | null): LoginLocale {
  const preferredLanguage = acceptLanguage?.split(",")[0]?.trim().toLowerCase();

  return preferredLanguage?.startsWith("es") ? "es" : "en";
}

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    logged_out?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const locale = resolveLoginLocale(requestHeaders.get("accept-language"));
  const copy = loginCopy[locale];
  const currentUser = await getCurrentAuthenticatedPortalUser();
  const nextPath = sanitizeNextPath(params.next);

  if (currentUser) {
    redirect(nextPath);
  }

  const csrfToken = await readCsrfTokenFromCookies();
  const errorMessage = params.error
    ? errorMessages[locale][params.error]
    : null;
  const logoutMessage = params.logged_out === "1" ? copy.logoutMessage : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-cyl-bg text-cyl-ink">
      <div className="absolute inset-0">
        <Image
          src="/brand/bg_login.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(0,0,0,0.92),rgba(18,18,18,0.84),rgba(18,18,18,0.72))]" />
      </div>

      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle locale={locale} />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-screen-2xl gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <section className="max-w-2xl space-y-6" aria-labelledby="login-title">
          <div className="flex items-center gap-4">
            <Image
              src="/brand/logocyl.png"
              alt="C&L Fruit"
              width={84}
              height={84}
              className="h-18 w-18 object-contain"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyl-gold-soft/72">
                {copy.brandKicker}
              </p>
              <h1
                id="login-title"
                className="portal-display mt-2 text-5xl leading-none text-white sm:text-6xl lg:text-7xl"
              >
                {copy.heroTitle}
              </h1>
            </div>
          </div>

          <p className="max-w-xl text-base leading-7 text-white/76 sm:text-lg">
            {copy.heroDescription}
          </p>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
            <span className="rounded-full border border-white/10 px-3 py-2">
              {copy.heroTags[0]}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              {copy.heroTags[1]}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2">
              {copy.heroTags[2]}
            </span>
          </div>
        </section>

        <section
          className="panel mx-auto w-full max-w-xl p-6 text-cyl-ink sm:p-8"
          aria-labelledby="login-form-title"
        >
          <p className="section-kicker text-cyl-gold">{copy.formKicker}</p>
          <h2
            id="login-form-title"
            className="mt-3 text-3xl font-semibold text-cyl-ink"
          >
            {copy.formTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/70">
            {copy.formDescription}
          </p>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-5 rounded-[1.15rem] border border-cyl-error-text/30 bg-cyl-error-bg px-4 py-3 text-sm text-cyl-error-text"
            >
              {errorMessage}
            </div>
          ) : null}

          {logoutMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 rounded-[1.15rem] border border-cyl-success/30 bg-cyl-success-bg px-4 py-3 text-sm text-cyl-success"
            >
              {logoutMessage}
            </div>
          ) : null}

          <form
            action="/api/auth/login"
            method="post"
            className="mt-6 space-y-4"
          >
            <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
            <input type="hidden" name="next" value={nextPath} />

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-cyl-ink">
                {copy.usernameLabel}
              </span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                className="w-full rounded-2xl border border-cyl-border bg-cyl-surface px-4 py-3 text-sm text-cyl-ink outline-none transition placeholder:text-cyl-muted focus:border-cyl-action focus:ring-2 focus:ring-cyl-action/25"
                placeholder={copy.usernamePlaceholder}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-cyl-ink">
                {copy.passwordLabel}
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-cyl-border bg-cyl-surface px-4 py-3 text-sm text-cyl-ink outline-none transition placeholder:text-cyl-muted focus:border-cyl-action focus:ring-2 focus:ring-cyl-action/25"
                placeholder={copy.passwordPlaceholder}
                required
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-cyl-action px-5 py-3 text-sm font-semibold text-cyl-black transition hover:bg-cyl-action-hover"
            >
              {copy.submitLabel}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
