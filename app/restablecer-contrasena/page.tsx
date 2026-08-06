import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { readCsrfTokenFromCookies } from "@/lib/auth";
import { PasswordResetForm } from "@/components/password-reset-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restablecer contrasena",
  description: "Define una nueva contrasena para tu cuenta del portal.",
  robots: { index: false, follow: false },
};

function resolveLocale(value: string | null) {
  return value?.toLowerCase().startsWith("en") ? "en" : "es";
}

export default async function ResetPasswordPage() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));
  const csrfToken = await readCsrfTokenFromCookies();
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
        <section className="panel w-full p-6 sm:p-8" aria-labelledby="reset-password-title">
          <Image src="/brand/logocyl.png" alt="C&L Fruit" width={72} height={72} className="h-16 w-16 object-contain" />
          <p className="section-kicker mt-6 text-cyl-gold">{isEnglish ? "Account access" : "Acceso a la cuenta"}</p>
          <h1 id="reset-password-title" className="mt-3 text-3xl font-semibold">
            {isEnglish ? "Set a new password" : "Define una nueva contrasena"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-cyl-ink/70">
            {isEnglish
              ? "Choose a password with at least 10 characters."
              : "Elige una contrasena de al menos 10 caracteres."}
          </p>
          <div className="mt-6">
            <PasswordResetForm token="" csrfToken={csrfToken} locale={locale} />
          </div>
          <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-cyl-action hover:underline">
            {isEnglish ? "Back to sign in" : "Volver al inicio de sesion"}
          </Link>
        </section>
      </div>
    </main>
  );
}
