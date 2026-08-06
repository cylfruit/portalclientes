import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { readCsrfTokenFromCookies } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recuperar contrasena",
  description: "Solicita un enlace para recuperar tu contrasena del portal.",
  robots: { index: false, follow: false },
};

function resolveLocale(value: string | null) {
  return value?.toLowerCase().startsWith("en") ? "en" : "es";
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));
  const csrfToken = await readCsrfTokenFromCookies();
  const params = await searchParams;
  const isEnglish = locale === "en";

  return (
    <main className="relative min-h-screen overflow-hidden bg-cyl-bg text-cyl-ink">
      <div className="absolute inset-0">
        <Image src="/brand/bg_login.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-20" />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(0,0,0,0.92),rgba(18,18,18,0.84),rgba(18,18,18,0.72))]" />
      </div>
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle locale={locale} />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <section className="panel w-full p-6 sm:p-8" aria-labelledby="forgot-password-title">
          <Image src="/brand/logocyl.png" alt="C&L Fruit" width={72} height={72} className="h-16 w-16 object-contain" />
          <p className="section-kicker mt-6 text-cyl-gold">{isEnglish ? "Account access" : "Acceso a la cuenta"}</p>
          <h1 id="forgot-password-title" className="mt-3 text-3xl font-semibold">
            {isEnglish ? "Forgot your password?" : "¿Olvidaste tu contrasena?"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/70">
            {isEnglish
              ? "Enter your account email and we will send you a secure reset link."
              : "Ingresa el email de tu cuenta y te enviaremos un enlace seguro para restablecerla."}
          </p>

          {params.sent === "1" ? (
            <div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-cyl-success/30 bg-cyl-success-bg px-4 py-3 text-sm text-cyl-success">
              {isEnglish
                ? "If an active account matches that email, you will receive a reset link shortly."
                : "Si existe una cuenta activa con ese email, recibiras un enlace en breve."}
            </div>
          ) : null}
          {params.error === "rate-limit" ? (
            <div role="alert" className="mt-5 rounded-2xl border border-cyl-warning-text/30 bg-cyl-warning-bg px-4 py-3 text-sm text-cyl-warning-text">
              {isEnglish
                ? "Too many requests. Please try again later."
                : "Demasiadas solicitudes. Intenta nuevamente mas tarde."}
            </div>
          ) : null}

          <form action="/api/auth/forgot-password" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="csrfToken" value={csrfToken ?? ""} />
            <label className="block space-y-2">
              <span className="text-sm font-semibold">{isEnglish ? "Account email" : "Email de la cuenta"}</span>
              <input name="email" type="email" autoComplete="email" required className="w-full rounded-2xl border border-cyl-border bg-cyl-surface px-4 py-3 text-sm outline-none transition placeholder:text-cyl-muted focus:border-cyl-action focus:ring-2 focus:ring-cyl-action/25" placeholder={isEnglish ? "you@company.com" : "tu@empresa.com"} />
            </label>
            <button type="submit" className="inline-flex w-full items-center justify-center rounded-2xl bg-cyl-action px-5 py-3 text-sm font-semibold text-cyl-black transition hover:bg-cyl-action-hover">
              {isEnglish ? "Send reset link" : "Enviar enlace de recuperacion"}
            </button>
          </form>
          <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-cyl-action hover:underline">
            {isEnglish ? "Back to sign in" : "Volver al inicio de sesion"}
          </Link>
        </section>
      </div>
    </main>
  );
}
