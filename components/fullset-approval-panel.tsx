"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MAX_APPROVER_EMAIL_LENGTH,
  MAX_APPROVER_NAME_LENGTH,
  MAX_COMMENT_LENGTH,
  MIN_REJECTION_COMMENT_LENGTH,
  parseApprovalTokenFromHash,
} from "@/lib/fullset-approval-input";
import { FullSetImagePicker } from "@/components/fullset-image-picker";

type Locale = "es" | "en";

type ItemState =
  | "PENDIENTE"
  | "APROBADO"
  | "RECHAZADO"
  | "NO_REQUIERE"
  | "SUPERSEDIDO"
  | "NO_DISPONIBLE";

type LinkItem = {
  documentoId: number;
  embarqueId: number;
  temporada: string | null;
  codigo: string;
  archivo: string | null;
  estado: ItemState;
  observaciones: string | null;
  decididoEn: string | null;
};

type LinkData = {
  estado: "VIGENTE" | "VENCIDO" | "REVOCADO" | "INVALIDO";
  expiraEn?: string | null;
  esPrueba?: boolean;
  idioma?: string | null;
  items?: LinkItem[];
};

type DecisionResult = {
  documentoId: number;
  ok: boolean;
  estado?: string | null;
  codigo?: string;
  mensaje?: string;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "no-token" }
  | { kind: "error"; message?: string }
  | { kind: "ready"; data: LinkData };

const copy = {
  es: {
    kicker: "Aprobación de documentos",
    title: "Full Set del embarque",
    intro:
      "Revisa el documento y respóndenos si está conforme. Si lo rechazas, indícanos el motivo para que podamos corregirlo.",
    validUntil: "Disponible hasta el",
    testBanner:
      "Enlace de prueba: lo que respondas aquí no modifica ningún dato real.",
    approverTitle: "¿Quién responde?",
    approverName: "Tu nombre",
    approverEmail: "Tu correo (opcional)",
    approverNameRequired: "Indica tu nombre para poder responder.",
    shipment: "Embarque",
    season: "Temporada",
    view: "Ver documento",
    download: "Descargar",
    approve: "Aprobar",
    reject: "Rechazar",
    approveAll: "Aprobar todos los pendientes",
    confirmReject: "Confirmar rechazo",
    cancel: "Cancelar",
    notesLabel: "Observaciones",
    notesPlaceholder:
      "Opcional al aprobar: puedes indicar una dirección u otra indicación. Si rechazas, cuéntanos el motivo.",
    notesRequiredToReject: `Para rechazar, escribe el motivo en las observaciones (mínimo ${MIN_REJECTION_COMMENT_LENGTH} caracteres).`,
    yourNotes: "Tus observaciones",
    sending: "Enviando...",
    states: {
      PENDIENTE: "Pendiente de tu respuesta",
      APROBADO: "Aprobado",
      RECHAZADO: "Rechazado",
      NO_REQUIERE: "No requiere aprobación",
      SUPERSEDIDO: "Reemplazado por una versión más nueva",
      NO_DISPONIBLE: "Documento no disponible",
    } as Record<ItemState, string>,
    supersededHelp:
      "Subimos una versión más reciente de este Full Set. Te enviaremos un nuevo enlace para revisarla.",
    unavailableHelp:
      "Este documento ya no está disponible. Contáctanos si necesitas ayuda.",
    yourReason: "Tu motivo",
    decidedOn: "Respondido el",
    thanksApproved: "¡Gracias! Registramos tu aprobación.",
    thanksRejected: "Gracias. Registramos el rechazo y avisamos a nuestro equipo.",
    alreadyAnswered:
      "Este documento ya había sido respondido; no se modificó.",
    genericFailure: "No pudimos registrar tu respuesta. Intenta nuevamente.",
    openFailure: "No pudimos abrir el documento. Intenta nuevamente.",
    loadFailure: "No pudimos cargar la información. Intenta nuevamente.",
    retry: "Reintentar",
    noToken: {
      title: "Enlace incompleto",
      body: "Este enlace no está completo. Abre nuevamente el botón del correo que te enviamos o copia la dirección completa.",
    },
    invalid: {
      title: "Enlace no válido",
      body: "No reconocemos este enlace. Revisa que esté completo o solicita uno nuevo a tu ejecutivo de C&L Fruit.",
    },
    expired: {
      title: "Este enlace venció",
      body: "El plazo para responder con este enlace terminó. Solicita uno nuevo a tu ejecutivo de C&L Fruit.",
    },
    allAnswered: "Ya respondiste todos los documentos de este enlace.",
    noItems: "Este enlace no tiene documentos para revisar.",
  },
  en: {
    kicker: "Document approval",
    title: "Shipment Full Set",
    intro:
      "Please review the document and let us know if it is correct. If you reject it, tell us why so we can fix it.",
    validUntil: "Available until",
    testBanner:
      "Test link: whatever you answer here does not change any real data.",
    approverTitle: "Who is answering?",
    approverName: "Your name",
    approverEmail: "Your email (optional)",
    approverNameRequired: "Please enter your name to respond.",
    shipment: "Shipment",
    season: "Season",
    view: "View document",
    download: "Download",
    approve: "Approve",
    reject: "Reject",
    approveAll: "Approve all pending",
    confirmReject: "Confirm rejection",
    cancel: "Cancel",
    notesLabel: "Notes",
    notesPlaceholder:
      "Optional when approving: you can add an address or any other instruction. If you reject, tell us why.",
    notesRequiredToReject: `To reject, write the reason in the notes (at least ${MIN_REJECTION_COMMENT_LENGTH} characters).`,
    yourNotes: "Your notes",
    sending: "Sending...",
    states: {
      PENDIENTE: "Waiting for your answer",
      APROBADO: "Approved",
      RECHAZADO: "Rejected",
      NO_REQUIERE: "No approval needed",
      SUPERSEDIDO: "Replaced by a newer version",
      NO_DISPONIBLE: "Document unavailable",
    } as Record<ItemState, string>,
    supersededHelp:
      "We uploaded a newer version of this Full Set. We will send you a new link to review it.",
    unavailableHelp:
      "This document is no longer available. Contact us if you need help.",
    yourReason: "Your reason",
    decidedOn: "Answered on",
    thanksApproved: "Thank you! Your approval was recorded.",
    thanksRejected: "Thank you. Your rejection was recorded and our team was notified.",
    alreadyAnswered: "This document had already been answered; nothing changed.",
    genericFailure: "We could not record your answer. Please try again.",
    openFailure: "We could not open the document. Please try again.",
    loadFailure: "We could not load the information. Please try again.",
    retry: "Retry",
    noToken: {
      title: "Incomplete link",
      body: "This link is incomplete. Open the button in the email we sent you again, or copy the full address.",
    },
    invalid: {
      title: "Invalid link",
      body: "We do not recognize this link. Check that it is complete or ask your C&L Fruit contact for a new one.",
    },
    expired: {
      title: "This link has expired",
      body: "The time to answer with this link has ended. Ask your C&L Fruit contact for a new one.",
    },
    allAnswered: "You have answered every document in this link.",
    noItems: "This link has no documents to review.",
  },
} as const;

const STATE_STYLES: Record<ItemState, string> = {
  PENDIENTE: "bg-cyl-warning-bg text-cyl-warning-text",
  APROBADO: "bg-cyl-success-bg text-cyl-success",
  RECHAZADO: "bg-cyl-error-bg text-cyl-error-text",
  NO_REQUIERE: "bg-cyl-info-bg text-cyl-info-text",
  SUPERSEDIDO: "bg-cyl-info-bg text-cyl-info-text",
  NO_DISPONIBLE: "bg-cyl-info-bg text-cyl-info-text",
};

function formatChileDate(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // El backend entrega la hora de Chile "como si fuera UTC": se muestra en UTC para
  // no volver a desplazarla según la zona horaria del navegador.
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

async function postJson(path: string, body: Record<string, unknown>) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
}

/**
 * Respuesta con imágenes: multipart con el JSON en "payload". El CSRF va además en
 * la cabecera para que el servidor lo valide antes de leer las imágenes.
 */
async function postMultipart(
  path: string,
  body: Record<string, unknown>,
  files: { field: string; file: File }[],
  csrfToken: string | null,
) {
  const form = new FormData();
  form.append("payload", JSON.stringify(body));

  for (const { field, file } of files) {
    form.append(field, file, file.name);
  }

  return fetch(path, {
    method: "POST",
    headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
    cache: "no-store",
    credentials: "same-origin",
    body: form,
  });
}

export function FullSetApprovalPanel({
  csrfToken,
  initialLocale,
}: {
  csrfToken: string | null;
  initialLocale: Locale;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  // Observaciones por Full Set (opcionales al aprobar, obligatorias al rechazar).
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [notesError, setNotesError] = useState<number | null>(null);
  // Imágenes por Full Set (opcionales), p. ej. un pantallazo del error.
  const [images, setImages] = useState<Record<number, File[]>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [nameError, setNameError] = useState(false);

  const labels = copy[locale];

  const load = useCallback(
    async (linkToken: string) => {
      setView({ kind: "loading" });

      try {
        const response = await postJson("/api/aprobacion-fullset/consultar", {
          csrfToken,
          token: linkToken,
        });
        const payload = (await response.json()) as LinkData & {
          message?: string;
        };

        if (!response.ok) {
          setView({ kind: "error", message: payload.message });
          return;
        }

        if (payload.idioma === "en" || payload.idioma === "es") {
          setLocale(payload.idioma);
        }

        setView({ kind: "ready", data: payload });
      } catch {
        setView({ kind: "error" });
      }
    },
    [csrfToken],
  );

  useEffect(() => {
    // El token vive en el fragmento (#token=...): el navegador no lo envía al
    // servidor. Se mantiene en la barra para que recargar la página siga funcionando.
    function readFragment() {
      const found = parseApprovalTokenFromHash(window.location.hash);

      if (!found) {
        setToken(null);
        setView({ kind: "no-token" });
        return;
      }

      setToken(found);
      setNotice(null);
      setNotes({});
      setNotesError(null);
      setImages({});
      void load(found);
    }

    queueMicrotask(readFragment);
    // Abrir otro link del correo en la misma pestaña solo cambia el fragmento.
    window.addEventListener("hashchange", readFragment);

    return () => window.removeEventListener("hashchange", readFragment);
  }, [load]);

  const items = useMemo(
    () => (view.kind === "ready" ? (view.data.items ?? []) : []),
    [view],
  );
  const pendingItems = items.filter((item) => item.estado === "PENDIENTE");

  function patchItems(updater: (item: LinkItem) => LinkItem) {
    setView((current) =>
      current.kind === "ready"
        ? {
            kind: "ready",
            data: {
              ...current.data,
              items: (current.data.items ?? []).map(updater),
            },
          }
        : current,
    );
  }

  async function openDocument(item: LinkItem, download: boolean) {
    if (!token) {
      return;
    }

    setNotice(null);
    // La pestaña se abre en el clic, antes del fetch, para que no la bloqueen.
    const tab = download ? null : window.open("about:blank", "_blank");

    if (tab) {
      tab.opener = null;
    }

    try {
      const response = await postJson("/api/aprobacion-fullset/archivo", {
        csrfToken,
        token,
        documentId: item.documentoId,
      });

      if (!response.ok) {
        throw new Error("open");
      }

      const blob = await response.blob();
      const isPdf = blob.type.toLowerCase().startsWith("application/pdf");
      const objectUrl = URL.createObjectURL(
        isPdf ? blob : new Blob([blob], { type: "application/octet-stream" }),
      );

      if (tab && isPdf) {
        tab.location.href = objectUrl;
      } else {
        // Lo que no sea un PDF verificado nunca se renderiza: se descarga.
        tab?.close();
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = item.archivo || `FullSet-${item.codigo}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      tab?.close();
      setNotice({ type: "error", message: labels.openFailure });
    }
  }

  async function submitDecisions(
    decisions: {
      documentoId: number;
      decision: "APROBADO" | "RECHAZADO";
      observaciones?: string;
    }[],
  ) {
    if (!token || busy) {
      return;
    }

    if (!approverName.trim()) {
      setNameError(true);
      setNotice({ type: "error", message: labels.approverNameRequired });
      document.getElementById("approver-name")?.focus();
      return;
    }

    setNameError(false);
    setBusy(true);
    setNotice(null);

    try {
      const payloadBody = {
        csrfToken,
        token,
        approverName: approverName.trim(),
        approverEmail: approverEmail.trim(),
        decisions,
      };
      const attached = decisions.flatMap((d) =>
        (images[d.documentoId] ?? []).map((file) => ({
          field: `imagenes_${d.documentoId}`,
          file,
        })),
      );
      const response =
        attached.length > 0
          ? await postMultipart(
              "/api/aprobacion-fullset/decision",
              payloadBody,
              attached,
              csrfToken,
            )
          : await postJson("/api/aprobacion-fullset/decision", payloadBody);
      const payload = (await response.json()) as {
        results?: DecisionResult[];
        message?: string;
        code?: string;
      };

      if (!response.ok || !payload.results) {
        if (response.status === 404 || response.status === 410) {
          // El enlace dejó de valer mientras estaba abierto.
          await load(token);
          return;
        }

        setNotice({
          type: "error",
          message: payload.message || labels.genericFailure,
        });
        return;
      }

      const results = payload.results;
      const byDocument = new Map(decisions.map((d) => [d.documentoId, d]));
      let approvedCount = 0;
      let rejectedCount = 0;
      let skipped = false;

      patchItems((item) => {
        const result = results.find((r) => r.documentoId === item.documentoId);
        const sent = byDocument.get(item.documentoId);

        if (!result || !sent) {
          return item;
        }

        if (result.ok) {
          return {
            ...item,
            estado: sent.decision,
            observaciones: sent.observaciones ?? null,
            // La hora oficial la fija el servidor (hora de Chile); se muestra al recargar.
            decididoEn: null,
          };
        }

        if (
          result.codigo === "YA_DECIDIDO" &&
          (result.estado === "APROBADO" || result.estado === "RECHAZADO")
        ) {
          return { ...item, estado: result.estado };
        }

        if (result.codigo === "SUPERSEDIDO") {
          return { ...item, estado: "SUPERSEDIDO" };
        }

        if (result.codigo === "NO_DISPONIBLE") {
          return { ...item, estado: "NO_DISPONIBLE" };
        }

        return item;
      });

      for (const result of results) {
        const sent = byDocument.get(result.documentoId);

        if (result.ok && sent?.decision === "APROBADO") approvedCount += 1;
        else if (result.ok && sent?.decision === "RECHAZADO") rejectedCount += 1;
        else skipped = true;
      }

      if (rejectedCount > 0 && approvedCount === 0 && !skipped) {
        setNotice({ type: "success", message: labels.thanksRejected });
      } else if (approvedCount > 0 && !skipped) {
        setNotice({ type: "success", message: labels.thanksApproved });
      } else if (skipped) {
        setNotice({ type: "error", message: labels.alreadyAnswered });
      }

      setNotesError(null);
      setImages((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result.ok) delete next[result.documentoId];
        }
        return next;
      });
    } catch {
      setNotice({ type: "error", message: labels.genericFailure });
    } finally {
      setBusy(false);
    }
  }

  if (view.kind === "loading") {
    return (
      <div
        className="h-40 animate-pulse rounded-2xl bg-cyl-surface-alt"
        role="status"
        aria-live="polite"
      />
    );
  }

  if (view.kind === "no-token") {
    return <Message tone="info" title={labels.noToken.title} body={labels.noToken.body} />;
  }

  if (view.kind === "error") {
    return (
      <div className="space-y-4">
        <Message
          tone="error"
          title={labels.loadFailure}
          body={view.message ?? ""}
        />
        <button
          type="button"
          onClick={() => token && void load(token)}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-cyl-action px-5 py-3 text-sm font-semibold text-cyl-black transition hover:bg-cyl-action-hover"
        >
          {labels.retry}
        </button>
      </div>
    );
  }

  const { data } = view;

  if (data.estado === "VENCIDO") {
    return <Message tone="warning" title={labels.expired.title} body={labels.expired.body} />;
  }

  if (data.estado !== "VIGENTE") {
    return <Message tone="error" title={labels.invalid.title} body={labels.invalid.body} />;
  }

  const expiry = formatChileDate(data.expiraEn, locale);
  const everythingAnswered = items.length > 0 && pendingItems.length === 0;

  return (
    <div className="space-y-5">
      {data.esPrueba ? (
        <div role="note" className="rounded-2xl border border-cyl-warning-text/30 bg-cyl-warning-bg px-4 py-3 text-sm font-semibold text-cyl-warning-text">
          {labels.testBanner}
        </div>
      ) : null}

      <p className="text-sm leading-6 text-cyl-ink/70">{labels.intro}</p>
      {expiry ? (
        <p className="text-xs text-cyl-ink/55">
          {labels.validUntil} {expiry}
        </p>
      ) : null}

      {notice ? (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={
            notice.type === "error"
              ? "rounded-2xl border border-cyl-error-text/30 bg-cyl-error-bg px-4 py-3 text-sm text-cyl-error-text"
              : "rounded-2xl border border-cyl-success/30 bg-cyl-success-bg px-4 py-3 text-sm text-cyl-success"
          }
        >
          {notice.message}
        </div>
      ) : null}

      {pendingItems.length > 0 ? (
        <fieldset className="grid gap-3 rounded-2xl border border-cyl-border bg-cyl-surface p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">{labels.approverTitle}</legend>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">{labels.approverName}</span>
            <input
              id="approver-name"
              type="text"
              value={approverName}
              maxLength={MAX_APPROVER_NAME_LENGTH}
              autoComplete="name"
              required
              aria-invalid={nameError}
              onChange={(event) => {
                setApproverName(event.target.value);
                setNameError(false);
              }}
              className={`w-full rounded-xl border bg-cyl-card px-3 py-2 text-sm ${
                nameError ? "border-cyl-error-text" : "border-cyl-border"
              }`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">{labels.approverEmail}</span>
            <input
              type="email"
              value={approverEmail}
              maxLength={MAX_APPROVER_EMAIL_LENGTH}
              autoComplete="email"
              onChange={(event) => setApproverEmail(event.target.value)}
              className="w-full rounded-xl border border-cyl-border bg-cyl-card px-3 py-2 text-sm"
            />
          </label>
        </fieldset>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-cyl-ink/70">{labels.noItems}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const decidedOn = formatChileDate(item.decididoEn, locale);
            const note = notes[item.documentoId] ?? "";
            const noteMissing = notesError === item.documentoId;

            return (
              <li
                key={item.documentoId}
                className="rounded-2xl border border-cyl-border bg-cyl-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {labels.shipment} {item.codigo}
                      {item.temporada ? (
                        <span className="ml-2 text-xs font-medium text-cyl-ink/55">
                          {labels.season} {item.temporada}
                        </span>
                      ) : null}
                    </p>
                    {item.archivo ? (
                      <p className="mt-0.5 break-all text-xs text-cyl-ink/55">
                        {item.archivo}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATE_STYLES[item.estado]}`}
                  >
                    {labels.states[item.estado]}
                  </span>
                </div>

                {item.estado === "SUPERSEDIDO" ? (
                  <p className="mt-3 text-xs text-cyl-ink/65">{labels.supersededHelp}</p>
                ) : null}
                {item.estado === "NO_DISPONIBLE" ? (
                  <p className="mt-3 text-xs text-cyl-ink/65">{labels.unavailableHelp}</p>
                ) : null}
                {(item.estado === "RECHAZADO" || item.estado === "APROBADO") &&
                item.observaciones ? (
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-cyl-surface-alt px-3 py-2 text-xs text-cyl-ink/75">
                    <span className="font-semibold">
                      {item.estado === "RECHAZADO"
                        ? labels.yourReason
                        : labels.yourNotes}
                      :
                    </span>{" "}
                    {item.observaciones}
                  </p>
                ) : null}
                {(item.estado === "APROBADO" || item.estado === "RECHAZADO") &&
                decidedOn ? (
                  <p className="mt-2 text-xs text-cyl-ink/55">
                    {labels.decidedOn} {decidedOn}
                  </p>
                ) : null}

                {item.estado !== "NO_DISPONIBLE" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openDocument(item, false)}
                      className="inline-flex items-center rounded-full border border-cyl-border bg-cyl-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-cyl-surface-alt"
                    >
                      {labels.view}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openDocument(item, true)}
                      className="inline-flex items-center rounded-full border border-cyl-border bg-cyl-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-cyl-surface-alt"
                    >
                      {labels.download}
                    </button>
                  </div>
                ) : null}

                {item.estado === "PENDIENTE" ? (
                  <div className="mt-4 space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold">
                        {labels.notesLabel}
                      </span>
                      <textarea
                        id={`notes-${item.documentoId}`}
                        value={note}
                        maxLength={MAX_COMMENT_LENGTH}
                        rows={3}
                        disabled={busy}
                        aria-invalid={noteMissing}
                        placeholder={labels.notesPlaceholder}
                        onChange={(event) => {
                          setNotes((current) => ({
                            ...current,
                            [item.documentoId]: event.target.value,
                          }));
                          setNotesError(null);
                        }}
                        className={`w-full rounded-xl border bg-cyl-card px-3 py-2 text-sm ${
                          noteMissing
                            ? "border-cyl-error-text"
                            : "border-cyl-border"
                        }`}
                      />
                    </label>
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <span
                        role={noteMissing ? "alert" : undefined}
                        className="text-cyl-error-text"
                      >
                        {noteMissing ? labels.notesRequiredToReject : ""}
                      </span>
                      <span className="shrink-0 text-cyl-ink/55">
                        {note.length}/{MAX_COMMENT_LENGTH}
                      </span>
                    </div>
                    <FullSetImagePicker
                      files={images[item.documentoId] ?? []}
                      disabled={busy}
                      locale={locale}
                      onChange={(files) =>
                        setImages((current) => ({
                          ...current,
                          [item.documentoId]: files,
                        }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void submitDecisions([
                            {
                              documentoId: item.documentoId,
                              decision: "APROBADO",
                              ...(note.trim()
                                ? { observaciones: note.trim() }
                                : {}),
                            },
                          ])
                        }
                        className="inline-flex flex-1 items-center justify-center rounded-2xl bg-cyl-success px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60 sm:flex-none"
                      >
                        {busy ? labels.sending : labels.approve}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            note.trim().length < MIN_REJECTION_COMMENT_LENGTH
                          ) {
                            setNotesError(item.documentoId);
                            document
                              .getElementById(`notes-${item.documentoId}`)
                              ?.focus();
                            return;
                          }

                          void submitDecisions([
                            {
                              documentoId: item.documentoId,
                              decision: "RECHAZADO",
                              observaciones: note.trim(),
                            },
                          ]);
                        }}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-cyl-error-text/40 px-5 py-2.5 text-sm font-semibold text-cyl-error-text transition hover:bg-cyl-error-bg disabled:opacity-60 sm:flex-none"
                      >
                        {labels.reject}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {pendingItems.length > 1 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void submitDecisions(
              pendingItems.map((item) => {
                const note = (notes[item.documentoId] ?? "").trim();

                return {
                  documentoId: item.documentoId,
                  decision: "APROBADO" as const,
                  ...(note ? { observaciones: note } : {}),
                };
              }),
            )
          }
          className="inline-flex w-full items-center justify-center rounded-2xl bg-cyl-action px-5 py-3 text-sm font-semibold text-cyl-black transition hover:bg-cyl-action-hover disabled:opacity-60"
        >
          {busy ? labels.sending : labels.approveAll}
        </button>
      ) : null}

      {everythingAnswered ? (
        <p className="text-center text-sm font-semibold text-cyl-success">
          {labels.allAnswered}
        </p>
      ) : null}
    </div>
  );
}

function Message({
  tone,
  title,
  body,
}: {
  tone: "info" | "warning" | "error";
  title: string;
  body: string;
}) {
  const styles = {
    info: "border-cyl-info-text/30 bg-cyl-info-bg text-cyl-info-text",
    warning: "border-cyl-warning-text/30 bg-cyl-warning-bg text-cyl-warning-text",
    error: "border-cyl-error-text/30 bg-cyl-error-bg text-cyl-error-text",
  } as const;

  return (
    <div role="alert" className={`rounded-2xl border px-4 py-4 ${styles[tone]}`}>
      <p className="text-base font-semibold">{title}</p>
      {body ? <p className="mt-1 text-sm">{body}</p> : null}
    </div>
  );
}
