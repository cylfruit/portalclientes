"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PasswordInput } from "@/components/password-input";

type ResetLocale = "es" | "en";

const copy = {
  es: {
    title: "Define una nueva contrasena",
    description: "Elige una contrasena de al menos 10 caracteres para tu cuenta.",
    password: "Nueva contrasena",
    passwordPlaceholder: "Minimo 10 caracteres",
    confirm: "Confirmar contrasena",
    confirmPlaceholder: "Repite la contrasena",
    submit: "Guardar nueva contrasena",
    success: "Tu contrasena fue restablecida. Ya puedes iniciar sesion.",
    login: "Volver al inicio de sesion",
    invalid: "El enlace no es valido o ya expiro.",
    error: "No fue posible restablecer la contrasena.",
    show: "Mostrar contrasena",
    hide: "Ocultar contrasena",
  },
  en: {
    title: "Set a new password",
    description: "Choose a password with at least 10 characters for your account.",
    password: "New password",
    passwordPlaceholder: "At least 10 characters",
    confirm: "Confirm password",
    confirmPlaceholder: "Repeat the password",
    submit: "Save new password",
    success: "Your password was reset. You can now sign in.",
    login: "Back to sign in",
    invalid: "This link is invalid or has expired.",
    error: "The password could not be reset.",
    show: "Show password",
    hide: "Hide password",
  },
} as const;

export function PasswordResetForm({
  token,
  csrfToken,
  locale,
}: {
  token: string;
  csrfToken: string | null;
  locale: ResetLocale;
}) {
  const labels = copy[locale];
  const [resolvedToken, setResolvedToken] = useState(token);
  const [tokenReady, setTokenReady] = useState(Boolean(token));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    const fragmentToken = new URLSearchParams(hash).get("token")?.trim() ?? "";

    window.history.replaceState(
      null,
      document.title,
      `${window.location.pathname}${window.location.search}`,
    );

    queueMicrotask(() => {
      if (fragmentToken) {
        setResolvedToken(fragmentToken);
      }
      setTokenReady(true);
    });
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({
        type: "error",
        message:
          locale === "en"
            ? "The passwords do not match."
            : "Las contrasenas no coinciden.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrfToken,
          token: resolvedToken,
          newPassword,
          confirmPassword,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || labels.error);
      }

      setStatus({
        type: "success",
        message: payload.message || labels.success,
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : labels.error,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!tokenReady) {
    return <div className="h-12 animate-pulse rounded-2xl bg-cyl-surface-alt" />;
  }

  if (!resolvedToken) {
    return (
      <div role="alert" className="rounded-2xl border border-cyl-error-text/30 bg-cyl-error-bg px-4 py-3 text-sm text-cyl-error-text">
        {labels.invalid}
      </div>
    );
  }

  if (status?.type === "success") {
    return (
      <div className="space-y-5">
        <div role="status" aria-live="polite" className="rounded-2xl border border-cyl-success/30 bg-cyl-success-bg px-4 py-3 text-sm text-cyl-success">
          {status.message}
        </div>
        <Link href="/login" className="inline-flex w-full items-center justify-center rounded-2xl bg-cyl-action px-5 py-3 text-sm font-semibold text-cyl-black transition hover:bg-cyl-action-hover">
          {labels.login}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status ? (
        <div role="alert" aria-live="polite" className="rounded-2xl border border-cyl-error-text/30 bg-cyl-error-bg px-4 py-3 text-sm text-cyl-error-text">
          {status.message}
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-semibold">{labels.password}</span>
        <PasswordInput
          name="newPassword"
          placeholder={labels.passwordPlaceholder}
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={isSubmitting}
          minLength={10}
          required
          showLabel={labels.show}
          hideLabel={labels.hide}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold">{labels.confirm}</span>
        <PasswordInput
          name="confirmPassword"
          placeholder={labels.confirmPlaceholder}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isSubmitting}
          minLength={10}
          required
          showLabel={labels.show}
          hideLabel={labels.hide}
        />
      </label>

      <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-2xl bg-cyl-action px-5 py-3 text-sm font-semibold text-cyl-black transition hover:bg-cyl-action-hover disabled:cursor-not-allowed disabled:opacity-60">
        {isSubmitting ? "..." : labels.submit}
      </button>
    </form>
  );
}
