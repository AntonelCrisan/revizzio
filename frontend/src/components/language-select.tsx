"use client";

import { useEffect, useRef, useState } from "react";
import type { LanguagePreference } from "@/lib/auth-api";
import {
  languageOptions,
  useLanguage,
} from "@/components/language-provider";

type LanguageSelectProps = {
  value?: LanguagePreference;
  onChange?: (language: LanguagePreference) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

const languageMeta: Record<LanguagePreference, { shortLabel: string }> = {
  ro: { shortLabel: "RO" },
  en: { shortLabel: "EN" },
  fr: { shortLabel: "FR" },
};

function FlagIcon({ language }: { language: LanguagePreference }) {
  if (language === "ro") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-5 shrink-0 overflow-hidden rounded-[0.2rem] ring-1 ring-black/10"
        viewBox="0 0 30 20"
      >
        <rect width="10" height="20" fill="#002B7F" />
        <rect x="10" width="10" height="20" fill="#FCD116" />
        <rect x="20" width="10" height="20" fill="#CE1126" />
      </svg>
    );
  }

  if (language === "fr") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-5 shrink-0 overflow-hidden rounded-[0.2rem] ring-1 ring-black/10"
        viewBox="0 0 30 20"
      >
        <rect width="10" height="20" fill="#0055A4" />
        <rect x="10" width="10" height="20" fill="#FFFFFF" />
        <rect x="20" width="10" height="20" fill="#EF4135" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-5 shrink-0 overflow-hidden rounded-[0.2rem] ring-1 ring-black/10"
      viewBox="0 0 60 40"
    >
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v40M0 20h60" stroke="#FFFFFF" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function LanguageSelect({
  value,
  onChange,
  disabled = false,
  compact = false,
  className = "",
}: LanguageSelectProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLanguage = value ?? language;
  const selectedMeta = languageMeta[selectedLanguage];
  const rootClassName = className || "inline-flex";

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function selectLanguage(nextLanguage: LanguagePreference) {
    setLanguage(nextLanguage);
    onChange?.(nextLanguage);
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`relative text-xs font-bold text-content ${rootClassName}`}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-full border border-subtle bg-surface px-3 text-xs font-black shadow-sm transition hover:-translate-y-0.5 hover:border-content/25 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex items-center gap-2">
          <FlagIcon language={selectedLanguage} />
          <span className={compact ? "sr-only" : "text-muted"}>
            {t("language.label")}
          </span>
          <span>
            {compact
              ? selectedMeta.shortLabel
              : t(`language.${selectedLanguage}`)}
          </span>
        </span>
        <ChevronIcon open={isOpen} />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 origin-top-right overflow-hidden rounded-2xl border border-subtle bg-surface p-1 shadow-2xl shadow-black/10 transition dark:shadow-black/35 ${
          isOpen
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div
          role="listbox"
          aria-label={t("language.label")}
          className="space-y-1"
        >
          {languageOptions.map((option) => {
            const meta = languageMeta[option.value];
            const isSelected = option.value === selectedLanguage;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectLanguage(option.value)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "bg-action text-on-action"
                    : "text-content hover:bg-surface-hover"
                }`}
              >
                <span className="flex items-center gap-3">
                  <FlagIcon language={option.value} />
                  <span>
                    <span className="block text-sm font-black">
                      {t(option.labelKey)}
                    </span>
                    <span
                      className={`mt-0.5 block text-[10px] uppercase tracking-[0.16em] ${
                        isSelected ? "text-on-action/70" : "text-muted"
                      }`}
                    >
                      {meta.shortLabel}
                    </span>
                  </span>
                </span>
                {isSelected ? <CheckIcon /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
