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
      setStatusMessage(`Sectiunea "${draft.title}" a fost salvata.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Sectiunea nu a putut fi salvata.",
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-subtle bg-surface p-6 sm:p-8">
          <Link
            href="/admin/settings"
            className="text-sm font-bold text-muted transition hover:text-content"
          >
            &lt;- Înapoi la setări admin
          </Link>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                Editor document legal
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
                {document.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                {description}
              </p>
            </div>
            <Link
              href={publicHref}
              target="_blank"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-subtle bg-app px-4 py-3 text-sm font-bold transition hover:bg-surface-hover"
            >
              Vezi pagina publica
            </Link>
          </div>
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-info-border bg-info-soft px-5 py-4 text-sm font-bold text-info">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            {sections.map((section) => {
              const isEditing = editingKey === section.section_key;
              const isSaving = savingKey === section.section_key;

              return (
                <article
                  key={section.section_key}
                  className="rounded-[2rem] border border-subtle bg-surface p-4 sm:p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 border-b border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                        {section.section_key} | modificat {formatDate(section.last_date_modified)}
                      </p>
                      <h2 className="mt-2 text-lg font-black">{section.title}</h2>
                    </div>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => startEditing(section)}
                        className="w-fit rounded-2xl border border-subtle bg-app px-4 py-2.5 text-sm font-bold transition hover:bg-surface-hover"
                      >
                        Editeaza sectiunea
                      </button>
                    ) : null}
                  </div>

                  {isEditing && draft ? (
                    <div className="space-y-4">
                      <label className="block">
                        <span className="text-sm font-bold">Titlu sectiune</span>
                        <input
                          value={draft.title}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, title: event.target.value }
                                : current,
                            )
                          }
                          className="mt-2 h-12 w-full rounded-2xl border border-subtle bg-app px-4 text-sm outline-none transition focus:border-action"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-bold">Continut HTML</span>
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
                          className="mt-2 min-h-72 w-full resize-y rounded-[1.5rem] border border-subtle bg-app p-4 font-mono text-sm leading-6 outline-none transition focus:border-action"
                        />
                      </label>

                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKey(null);
                            setDraft(null);
                          }}
                          className="rounded-2xl border border-subtle bg-app px-5 py-3 text-sm font-bold transition hover:bg-surface-hover"
                        >
                          Renunta
                        </button>
                        <button
                          type="button"
                          onClick={() => saveSection(section)}
                          disabled={isSaving}
                          className="rounded-2xl bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
                        >
                          {isSaving ? "Se salvează..." : "Salvează secțiunea"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="legal-document rounded-[1.5rem] bg-app px-5 py-6"
                      dangerouslySetInnerHTML={{
                        __html: section.rendered_content,
                      }}
                    />
                  )}
                </article>
              );
            })}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[1.5rem] border border-subtle bg-surface p-5">
              <p className="text-sm font-black">Variabile disponibile</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Le poti folosi in text, iar pagina publica le inlocuieste automat
                cu datele firmei.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {document.available_variables.map((variable) => (
                  <code
                    key={variable}
                    className="rounded-full border border-subtle bg-app px-3 py-1 text-xs font-bold text-muted"
                  >
                    {variable}
                  </code>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-subtle bg-surface p-5">
              <p className="text-sm font-black">Publicare</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                In aceasta varianta salvarea actualizeaza direct continutul afisat
                public. Daca vrei, urmatorul pas poate adauga draft si publicare
                separata.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </AccountStaticShell>
  );
}
