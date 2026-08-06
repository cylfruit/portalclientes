"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/password-input";

type PasswordLocale = "es" | "en";

const copy = {
  es: {
    requiredTitle: "Actualiza tu contrasena",
    requiredDescription:
      "Por seguridad, debes definir una contrasena personal antes de continuar.",
    title: "Seguridad de la cuenta",
    description:
      "Cambia tu contrasena desde aqui. Las otras sesiones se cerraran despues de guardar el cambio.",
    current: "Contrasena actual",
    currentPlaceholder: "Ingresa tu contrasena actual",
    next: "Nueva contrasena",
    nextPlaceholder: "Minimo 10 caracteres",
    confirm: "Confirmar nueva contrasena",
    confirmPlaceholder: "Repite la nueva contrasena",
    submit: "Actualizar contrasena",
    success: "Tu contrasena fue actualizada correctamente.",
    show: "Mostrar contrasena",
    hide: "Ocultar contrasena",
    error: "No fue posible actualizar la contrasena.",
  },
  en: {
    requiredTitle: "Update your password",
    requiredDescription:
      "For security reasons, you must set a personal password before continuing.",
    title: "Account security",
    description:
      "Change your password here. Other sessions will be signed out after saving the change.",
    current: "Current password",
    currentPlaceholder: "Enter your current password",
    next: "New password",
    nextPlaceholder: "At least 10 characters",
    confirm: "Confirm new password",
    confirmPlaceholder: "Repeat the new password",
    submit: "Update password",
    success: "Your password was updated successfully.",
    show: "Show password",
    hide: "Hide password",
    error: "The password could not be updated.",
  },
} as const;

export function PasswordSecurityPanel({
  csrfToken,
  locale,
  required,
}: {
  csrfToken: string | null;
  locale: PasswordLocale;
  required: boolean;
}) {
  const labels = copy[locale];
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({
        type: "error",
        message:
          locale === "en"
            ? "The new passwords do not match."
            : "Las nuevas contrasenas no coinciden.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrfToken,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || labels.error);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({ type: "success", message: payload.message || labels.success });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : labels.error,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="password-security-title"
      className="mx-auto w-full max-w-2xl rounded-3xl border border-cyl-border bg-cyl-surface/90 p-5 shadow-[var(--cyl-shadow-base)] sm:p-8"
    >
      {required ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-cyl-warning-text/30 bg-cyl-warning-bg px-4 py-3 text-sm text-cyl-warning-text"
        >
          <p className="font-semibold">{labels.requiredTitle}</p>
          <p className="mt-1 leading-6">{labels.requiredDescription}</p>
        </div>
      ) : null}

      <h2 id="password-security-title" className="text-2xl font-semibold">
        {labels.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-cyl-ink/70">
        {labels.description}
      </p>

      {status ? (
        <div
          role={status.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-cyl-error-text/30 bg-cyl-error-bg text-cyl-error-text"
              : "border-cyl-success/30 bg-cyl-success-bg text-cyl-success"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold">{labels.current}</span>
          <PasswordInput
            name="currentPassword"
            placeholder={labels.currentPlaceholder}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={isSubmitting}
            required
            showLabel={labels.show}
            hideLabel={labels.hide}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold">{labels.next}</span>
          <PasswordInput
            name="newPassword"
            placeholder={labels.nextPlaceholder}
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-cyl-action px-5 py-3 text-sm font-semibold text-cyl-black transition hover:bg-cyl-action-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "..." : labels.submit}
        </button>
      </form>
    </section>
  );
}
