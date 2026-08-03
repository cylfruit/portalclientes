"use client";

import { useState } from "react";

type PasswordInputProps = {
  name: string;
  placeholder: string;
  autoComplete: string;
  required?: boolean;
};

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M2.5 2.5 21.5 21.5" />
      <path d="M14.6 14.6a4 4 0 0 1-5.2-5.2" />
      <path d="M17.1 9.5A9 9 0 0 0 7.9 5.9" />
      <path d="M9.5 17.1A9 9 0 0 0 16.1 6.9" />
    </svg>
  );
}

export function PasswordInput({
  name,
  placeholder,
  autoComplete,
  required,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-cyl-border bg-cyl-surface px-4 py-3 pr-11 text-sm text-cyl-ink outline-none transition placeholder:text-cyl-muted focus:border-cyl-action focus:ring-2 focus:ring-cyl-action/25"
        placeholder={placeholder}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-cyl-muted transition hover:text-cyl-ink"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
