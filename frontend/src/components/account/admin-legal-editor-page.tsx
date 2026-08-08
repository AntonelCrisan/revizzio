"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import {
  type LegalDocument,
  type LegalDocumentSection,
  updateAdminLegalDocumentSection,
} from "@/lib/legal-api";

type AdminLegalEditorPageProps = {
  document: LegalDocument;
  description: string;
  publicHref: string;
};

type DraftSection = {
  title: string;
  content: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "necunoscut";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function countWords(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function EditorMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-subtle bg-surface p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-4 font-serif text-2xl font-semibold leading-tight text-content">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

export function AdminLegalEditorPage({
  document,
  description,
  publicHref,
}: AdminLegalEditorPageProps) {
  const [sections, setSections] = useState(document.sections);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftSection | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  function startEditing(section: LegalDocumentSection) {
    setEditingKey(section.section_key);
    setDraft({ title: section.title, content: section.content });
    setStatusMessage(null);
  }

  async function saveSection(section: LegalDocumentSection) {
    if (!draft) return;

    setSavingKey(section.section_key);
    setStatusMessage(null);
    try {
      const updatedDocument = await updateAdminLegalDocumentSection(
        document.slug,
        section.section_key,
        draft,
      );
      setSections(updatedDocument.sections);
      setEditingKey(null);
      setDraft(null);
      setStatusMessage(`Secțiunea „${draft.title}” a fost salvată.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Secțiunea nu a putut fi salvată.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  const totalWords = sections.reduce(
    (total, section) => total + countWords(section.content),
    0,
  );
  const latestModified = sections
    .map((section) => new Date(section.last_date_modified))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/settings"
              className="mb-5 flex w-fit items-center rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              ← Setări admin
            </Link>
            <p className="inline-flex rounded-full border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Document legal
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              {document.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {description}
            </p>
          </div>

          <Link
            href={publicHref}
            target="_blank"
            className="inline-flex w-fit items-center justify-center rounded-full border border-subtle bg-surface px-5 py-3 text-sm font-bold text-content transition hover:bg-surface-hover"
          >
            Vezi public
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <EditorMetric
            label="Secțiuni"
            value={String(sections.length)}
            detail="salvare individuală"
          />
          <EditorMetric
            label="Conținut"
            value={String(totalWords)}
            detail="cuvinte aproximative"
          />
          <EditorMetric
            label="Ultima modificare"
            value={
              latestModified ? formatDate(latestModified.toISOString()) : "necunoscut"
            }
            detail="sincronizat cu pagina publică"
          />
        </div>

        {statusMessage ? (
          <div className="rounded-xl border border-info-border bg-info-soft px-5 py-4 text-sm font-bold text-info">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                  Secțiuni document
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-content">
                  Editează direct textul final.
                </h2>
              </div>
              <span className="text-sm leading-6 text-muted">
                Salvarea se face pe secțiunea deschisă.
              </span>
            </div>

            {sections.map((section) => {
              const isEditing = editingKey === section.section_key;
              const isSaving = savingKey === section.section_key;

              return (
                <article
                  key={section.section_key}
                  className={`rounded-xl border bg-surface p-5 transition ${
                    isEditing ? "border-action" : "border-subtle"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-subtle bg-app px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                          {section.section_key}
                        </span>
                        <span className="text-xs font-bold text-muted">
                          modificat {formatDate(section.last_date_modified)}
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight text-content">
                        {section.title}
                      </h3>
                    </div>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => startEditing(section)}
                        className="w-fit rounded-full border border-subtle bg-app px-4 py-2.5 text-sm font-bold text-content transition hover:bg-surface-hover"
                      >
                        Editează
                      </button>
                    ) : null}
                  </div>

                  {isEditing && draft ? (
                    <div className="mt-5 space-y-4 border-t border-subtle pt-5">
                      <label className="block">
                        <span className="text-sm font-bold text-content">
                          Titlu secțiune
                        </span>
                        <input
                          value={draft.title}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, title: event.target.value }
                                : current,
                            )
                          }
                          className="mt-2 h-12 w-full rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold text-content">
                          Conținut secțiune
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          Poți folosi HTML și variabile precum {"{phone}"} sau{" "}
                          {"{DATA_ULTIMEI_ACTUALIZĂRI}"}.
                        </span>
                        <textarea
                          value={draft.content}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, content: event.target.value }
                                : current,
                            )
                          }
                          spellCheck={false}
                          className="mt-2 min-h-72 w-full resize-y rounded-lg border border-subtle bg-app p-4 font-mono text-sm leading-6 text-content outline-none transition placeholder:text-muted focus:border-action"
                        />
                      </label>

                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKey(null);
                            setDraft(null);
                          }}
                          className="rounded-full border border-subtle bg-app px-5 py-3 text-sm font-bold text-content transition hover:bg-surface-hover"
                        >
                          Renunță
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSection(section)}
                          disabled={isSaving}
                          className="rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
                        >
                          {isSaving ? "Se salvează..." : "Salvează secțiunea"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="legal-document mt-5 border-t border-subtle pt-5"
                      dangerouslySetInnerHTML={{
                        __html: section.rendered_content,
                      }}
                    />
                  )}
                </article>
              );
            })}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-xl border border-subtle bg-surface p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Variabile
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Le folosești în text, iar pagina publică le înlocuiește automat
                cu datele firmei.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {document.available_variables.length > 0 ? (
                  document.available_variables.map((variable) => (
                    <code
                      key={variable}
                      className="rounded-full border border-subtle bg-app px-3 py-1 text-xs font-bold text-muted"
                    >
                      {variable}
                    </code>
                  ))
                ) : (
                  <span className="text-sm text-muted">
                    Nu există variabile configurate.
                  </span>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-subtle bg-surface p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Publicare
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Salvarea actualizează direct conținutul afișat public. Mai
                târziu putem separa fluxul în draft și publicare.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </AccountStaticShell>
  );
}
