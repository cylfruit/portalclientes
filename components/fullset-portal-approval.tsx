"use client";

import { useState } from "react";
import {
  MAX_COMMENT_LENGTH,
  MIN_REJECTION_COMMENT_LENGTH,
} from "@/lib/fullset-approval-input";
import { FullSetImagePicker } from "@/components/fullset-image-picker";

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
    notesLabel: "Observaciones",
    notesPlaceholder:
      "Opcional al aprobar: puedes indicar una dirección u otra indicación. Si rechazas, cuéntanos el motivo.",
    notesRequiredToReject: `Para rechazar, escribe el motivo en las observaciones (mínimo ${MIN_REJECTION_COMMENT_LENGTH} caracteres).`,
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
    notesLabel: "Notes",
    notesPlaceholder:
      "Optional when approving: you can add an address or any other instruction. If you reject, tell us why.",
    notesRequiredToReject: `To reject, write the reason in the notes (at least ${MIN_REJECTION_COMMENT_LENGTH} characters).`,
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
 * decisión es única, rechazar exige motivo y las observaciones son opcionales al
 * aprobar.
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
  const [notes, setNotes] = useState("");
  const [notesMissing, setNotesMissing] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approved = approval.status === "APROBADO" || outcome === "APROBADO";

  async function submit(decision: "APROBADO" | "RECHAZADO") {
    if (busy) {
      return;
    }

    if (
      decision === "RECHAZADO" &&
      notes.trim().length < MIN_REJECTION_COMMENT_LENGTH
    ) {
      setNotesMissing(true);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const url = `/api/embarques/${encodeURIComponent(shipmentId)}/documentos/${encodeURIComponent(documentId)}/aprobacion`;
      const payload = {
        csrfToken,
        season,
        decision,
        comment: notes.trim() || undefined,
      };
      let init: RequestInit;

      if (images.length > 0) {
        // Con imágenes: multipart, JSON en "payload" y CSRF también en la cabecera.
        const form = new FormData();
        form.append("payload", JSON.stringify(payload));
        for (const file of images) {
          form.append("imagenes", file, file.name);
        }
        init = {
          method: "POST",
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
          cache: "no-store",
          body: form,
        };
      } else {
        init = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        };
      }

      const response = await fetch(url, init);

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

      <label className="block space-y-1">
        <span className="text-xs font-semibold">{labels.notesLabel}</span>
        <textarea
          value={notes}
          maxLength={MAX_COMMENT_LENGTH}
          rows={3}
          disabled={busy}
          aria-invalid={notesMissing}
          placeholder={labels.notesPlaceholder}
          onChange={(event) => {
            setNotes(event.target.value);
            setNotesMissing(false);
          }}
          className={`w-full rounded-xl border bg-cyl-card px-3 py-2 text-xs ${
            notesMissing ? "border-cyl-error-text" : "border-cyl-border"
          }`}
        />
      </label>
      {notesMissing ? (
        <p role="alert" className="text-xs text-cyl-error-text">
          {labels.notesRequiredToReject}
        </p>
      ) : null}

      <FullSetImagePicker
        files={images}
        onChange={setImages}
        disabled={busy}
        locale={locale}
      />

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
          onClick={() => void submit("RECHAZADO")}
          className="inline-flex items-center rounded-full border border-cyl-error-text/40 bg-cyl-surface px-3 py-1.5 text-xs font-semibold text-cyl-error-text transition hover:bg-cyl-error-bg disabled:opacity-60"
        >
          {labels.reject}
        </button>
      </div>
    </div>
  );
}
