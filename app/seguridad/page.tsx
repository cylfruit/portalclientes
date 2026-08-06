import type { Metadata } from "next";
import { readCsrfTokenFromCookies, requireAuthenticatedPortalUser } from "@/lib/auth";
import { PasswordSecurityPanel } from "@/components/password-security-panel";
import { PortalShell } from "@/components/portal-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seguridad de la cuenta",
  description: "Gestiona la contrasena de tu cuenta del portal de clientes.",
  robots: { index: false, follow: false },
};

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string }>;
}) {
  const user = await requireAuthenticatedPortalUser("/seguridad");
  const csrfToken = await readCsrfTokenFromCookies();
  const locale = user.preferredLocale;
  const required = (await searchParams).required === "1";

  return (
    <PortalShell
      activePath="/seguridad"
      centeredHeading
      heading={locale === "en" ? "Account security" : "Seguridad de la cuenta"}
      description={
        locale === "en"
          ? "Manage your portal password and keep your account protected."
          : "Gestiona tu contrasena y mantén protegida tu cuenta del portal."
      }
    >
      <PasswordSecurityPanel
        csrfToken={csrfToken}
        locale={locale}
        required={required}
      />
    </PortalShell>
  );
}
