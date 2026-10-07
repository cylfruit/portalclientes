import Image from "next/image";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { readCsrfTokenFromCookies } from "@/lib/auth";
import { FullSetApprovalPanel } from "@/components/fullset-approval-panel";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aprobación de Full Set",
  description: "Revisa y responde el Full Set de tu embarque.",
  // Página con un enlace privado: no debe indexarse ni seguirse.
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

function resolveLocale(value: string | null) {
  return value?.toLowerCase().startsWith("en") ? "en" : "es";
}

export default async function FullSetApprovalPage() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));
  const csrfToken = await readCsrfTokenFromCookies();

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
      <div className="relative mx-auto flex min-h-screen max-w-2xl items-start px-4 py-10 sm:items-center">
        <section
          className="panel w-full p-6 sm:p-8"
          aria-labelledby="fullset-approval-title"
        >
          <Image
            src="/brand/logocyl.png"
            alt="C&L Fruit"
            width={72}
            height={72}
            className="h-16 w-16 object-contain"
          />
          <p className="section-kicker mt-6 text-cyl-gold">
            {locale === "en" ? "Document approval" : "Aprobación de documentos"}
          </p>
          <h1
            id="fullset-approval-title"
            className="mt-3 text-3xl font-semibold"
          >
            {locale === "en" ? "Shipment Full Set" : "Full Set del embarque"}
          </h1>
          <div className="mt-6">
            <FullSetApprovalPanel csrfToken={csrfToken} initialLocale={locale} />
          </div>
        </section>
      </div>
    </main>
  );
}
