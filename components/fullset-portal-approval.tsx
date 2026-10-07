"use client";

import { useState } from "react";
import {
  MAX_COMMENT_LENGTH,
  MIN_REJECTION_COMMENT_LENGTH,
} from "@/lib/fullset-approval-input";

type Locale = "es" | "en";

export type FullSetApprovalInfo = {
  status: "PENDIENTE" | "APROBADO" | "NO_REQUIERE";
  canDecide: boolean;
  decidedAt: string | null;
};

const copy = {
  es: {
    pending: "Pendiente de aprobación",
    approved: "Aprobado",
    approve: "Aprobar",
    reject: "Rechazar",
    sending: "Enviando...",
    reasonLabel: "Motivo del rechazo",
    reasonPlaceholder: "Cuéntanos qué debemos corregir",
    reasonTooShort: `Describe el motivo (mínimo ${MIN_REJECTION_COMMENT_LENGTH} caracteres).`,
    confirmReject: "Confirmar rechazo",
    cancel: "Cancelar",
    approvedNow: "Registramos tu aprobación.",
    rejectedNow:
      "Registramos tu rechazo. Este documento dejará de mostrarse hasta que subamos una versión corregida.",
    alreadyAnswered:
      "Este Full Set ya fue respondido. Actualiza la lista para ver el estado.",
    failure: "No pudimos registrar tu respuesta. Intenta nuevamente.",
  },
  en: {
    pending: "Pending approval",
    approved: "Approved",
    approve: "Approve",
    reject: "Reject",
    sending: "Sending...",
    reasonLabel: "Reason for rejection",
    reasonPlaceholder: "Tell us what we need to correct",
    reasonTooShort: `Describe the reason (at least ${MIN_REJECTION_COMMENT_LENGTH} characters).`,
    confirmReject: "Confirm rejection",
    cancel: "Cancel",
    approvedNow: "Your approval was recorded.",
    rejectedNow:
      "Your rejection was recorded. This document will stop being shown until we upload a corrected version.",
    alreadyAnswered:
      "This Full Set was already answered. Refresh the list to see its status.",
    failure: "We could not record your answer. Please try again.",
  },
} as const;

type LocalOutcome = "APROBADO" | "RECHAZADO" | null;

/**
 * Aprobación del Full Set por el cliente que ya tiene sesión en el portal (no
 * necesita el link del correo). El backend aplica la misma regla que el link: la
 * decisión es única y rechazar exige motivo.
 */
export function FullSetPortalApproval({
  csrfToken,
  shipmentId,
  season,
  documentId,
  approval,
  locale,
}: {
  csrfToken: string | null;
  shipmentId: string;
  season: string;
  documentId: string;
  approval: FullSetApprovalInfo;
  locale: Locale;
}) {
  const labels = copy[locale];
  const [outcome, setOutcome] = useState<LocalOutcome>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approved = approval.status === "APROBADO" || outcome === "APROBADO";

  async function submit(decision: "APROBADO" | "RECHAZADO") {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/embarques/${encodeURIComponent(shipmentId)}/documentos/${encodeURIComponent(documentId)}/aprobacion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            csrfToken,
            season,
            decision,
            comment: decision === "RECHAZADO" ? reason.trim() : undefined,
          }),
        },
      );

      if (response.status === 409) {
        setError(labels.alreadyAnswered);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };

        setError(payload.message?.trim() || labels.failure);
        return;
      }

      setOutcome(decision);
      setRejecting(false);
    } catch {
      setError(labels.failure);
    } finally {
      setBusy(false);
    }
  }

  if (outcome === "RECHAZADO") {
    return (
      <p
        role="status"
        className="mt-3 rounded-xl bg-cyl-info-bg px-3 py-2 text-xs text-cyl-info-text"
      >
        {labels.rejectedNow}
      </p>
    );
  }

  if (approved) {
    return (
      <p
        role="status"
        className="mt-3 inline-flex rounded-full bg-cyl-success-bg px-3 py-1 text-xs font-semibold text-cyl-success"
      >
        {labels.approved}
      </p>
    );
  }

  // Versión anterior o sin acciones disponibles: no se muestra nada.
  if (approval.status !== "PENDIENTE" || !approval.canDecide) {
    return null;
  }

  const reasonTooShort = reason.trim().length < MIN_REJECTION_COMMENT_LENGTH;

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-cyl-warning-text/25 bg-cyl-warning-bg/60 p-3">
      <p className="text-xs font-semibold text-cyl-warning-text">
        {labels.pending}
      </p>

      {error ? (
        <p role="alert" className="text-xs text-cyl-error-text">
          {error}
        </p>
      ) : null}

      {rejecting ? (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">{labels.reasonLabel}</span>
            <textarea
              value={reason}
              maxLength={MAX_COMMENT_LENGTH}
              rows={3}
              autoFocus
              placeholder={labels.reasonPlaceholder}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border border-cyl-border bg-cyl-card px-3 py-2 text-xs"
            />
          </label>
          {reasonTooShort ? (
            <p className="text-xs text-cyl-ink/55">{labels.reasonTooShort}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || reasonTooShort}
              onClick={() => void submit("RECHAZADO")}
              className="inline-flex items-center rounded-full bg-cyl-error-text px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? labels.sending : labels.confirmReject}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="inline-flex items-center rounded-full border border-cyl-border bg-cyl-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-cyl-surface-alt"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit("APROBADO")}
            className="inline-flex items-center rounded-full bg-cyl-success px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {busy ? labels.sending : labels.approve}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRejecting(true);
              setError(null);
            }}
            className="inline-flex items-center rounded-full border border-cyl-error-text/40 bg-cyl-surface px-3 py-1.5 text-xs font-semibold text-cyl-error-text transition hover:bg-cyl-error-bg disabled:opacity-60"
          >
            {labels.reject}
          </button>
        </div>
      )}
    </div>
  );
}
