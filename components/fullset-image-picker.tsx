"use client";

import { useId, useState } from "react";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGES_PER_DOCUMENT,
  checkImageSelection,
  type ImageCheckError,
} from "@/lib/fullset-approval-input";

type Locale = "es" | "en";

const copy = {
  es: {
    label: "Imágenes (opcional)",
    help: `Por ejemplo, un pantallazo del error. PNG, JPG o WebP; hasta ${MAX_IMAGES_PER_DOCUMENT} imágenes de 5 MB.`,
    add: "Adjuntar imágenes",
    remove: "Quitar",
    errors: {
      TOO_MANY_PER_DOCUMENT: `Puedes adjuntar hasta ${MAX_IMAGES_PER_DOCUMENT} imágenes por documento.`,
      TOO_MANY: "Adjuntaste demasiadas imágenes en total.",
      TOO_BIG: "Cada imagen puede pesar hasta 5 MB.",
      EMPTY: "Una de las imágenes está vacía.",
      NOT_AN_IMAGE: "Solo se aceptan imágenes PNG, JPG o WebP.",
    } as Record<ImageCheckError, string>,
  },
  en: {
    label: "Images (optional)",
    help: `For example, a screenshot of the error. PNG, JPG or WebP; up to ${MAX_IMAGES_PER_DOCUMENT} images of 5 MB.`,
    add: "Attach images",
    remove: "Remove",
    errors: {
      TOO_MANY_PER_DOCUMENT: `You can attach up to ${MAX_IMAGES_PER_DOCUMENT} images per document.`,
      TOO_MANY: "You attached too many images in total.",
      TOO_BIG: "Each image can be up to 5 MB.",
      EMPTY: "One of the images is empty.",
      NOT_AN_IMAGE: "Only PNG, JPG or WebP images are accepted.",
    } as Record<ImageCheckError, string>,
  },
} as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Selector de imágenes para la respuesta del Full Set. Valida tipo, tamaño y
 * cantidad en el navegador para avisar antes de enviar; el portal y el backend
 * vuelven a validar el contenido real de cada archivo.
 */
export function FullSetImagePicker({
  files,
  onChange,
  disabled,
  locale,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  locale: Locale;
}) {
  const labels = copy[locale];
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    // Permite volver a elegir el mismo archivo después de quitarlo.
    event.target.value = "";

    if (selected.length === 0) {
      return;
    }

    const next = [...files, ...selected];
    const problem = checkImageSelection(next);

    if (problem) {
      setError(labels.errors[problem]);
      return;
    }

    setError(null);
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold">{labels.label}</span>
      <p className="text-xs text-cyl-ink/55">{labels.help}</p>

      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-xl bg-cyl-surface-alt px-3 py-1.5 text-xs"
            >
              <span className="min-w-0 truncate">
                {file.name}{" "}
                <span className="text-cyl-ink/55">({formatSize(file.size)})</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setError(null);
                  onChange(files.filter((_, position) => position !== index));
                }}
                className="shrink-0 font-semibold text-cyl-error-text hover:underline disabled:opacity-60"
              >
                {labels.remove}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {files.length < MAX_IMAGES_PER_DOCUMENT ? (
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center rounded-full border border-cyl-border bg-cyl-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-cyl-surface-alt ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {labels.add}
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            disabled={disabled}
            onChange={handleSelect}
            className="sr-only"
          />
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-cyl-error-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
