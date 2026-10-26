"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, FolderOpen, Pencil, SkipForward, X } from "lucide-react";
import type { Task } from "../../lib/types";
import {
  DELIVERABLE_ACCEPT,
  DELIVERABLE_MAX_BYTES,
  deliverableFileError,
  isPdfDeliverable,
  type CreateDeliverableInput,
  type Deliverable,
  type UpdateDeliverableInput,
} from "../../lib/deliverables";
import { pdfEmbedSrc } from "../../lib/stockVisualUtils";

type CompanyOption = { name: string };

type DeliverableFormModalProps = {
  open: boolean;
  mode: "completion" | "manual" | "edit";
  task?: Task | null;
  deliverable?: Deliverable | null;
  companies: CompanyOption[];
  createdBy?: string | null;
  onSave: (input: CreateDeliverableInput | UpdateDeliverableInput) => Promise<boolean>;
  onClose: () => void;
};

export default function DeliverableFormModal({
  open,
  mode,
  task,
  deliverable,
  companies,
  createdBy,
  onSave,
  onClose,
}: DeliverableFormModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isEdit = mode === "edit";

  const [projectName, setProjectName] = useState("");
  const [company, setCompany] = useState("");
  const [serverPath, setServerPath] = useState("");
  const [completedAt, setCompletedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExistingFile, setKeepExistingFile] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit && deliverable) {
      setProjectName(deliverable.projectName);
      setCompany(deliverable.company || companies[0]?.name || "");
      setServerPath(deliverable.serverPath);
      setCompletedAt(deliverable.completedAt);
      setNotes(deliverable.notes);
      setFile(null);
      setKeepExistingFile(Boolean(deliverable.fileUrl || deliverable.storagePath));
      setPreviewUrl(null);
    } else {
      setProjectName(task?.projectName ?? "");
      setCompany(task?.company ?? companies[0]?.name ?? "");
      setServerPath("");
      setCompletedAt(new Date().toISOString().slice(0, 10));
      setNotes("");
      setFile(null);
      setKeepExistingFile(false);
      setPreviewUrl(null);
    }
    setError(null);
    setBusy(false);
  }, [open, task, companies, isEdit, deliverable]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const companyOptions = useMemo(() => {
    const names = companies.map((c) => c.name).filter(Boolean);
    const extra = isEdit ? deliverable?.company : task?.company;
    if (extra && !names.includes(extra)) names.unshift(extra);
    return names;
  }, [companies, task?.company, deliverable?.company, isEdit]);

  if (!open) return null;

  const pickFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      setError(null);
      return;
    }
    const err = deliverableFileError(next);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
    setKeepExistingFile(false);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    pickFile(event.dataTransfer.files?.[0] ?? null);
  };

  const existingPreview = isEdit && keepExistingFile && !file ? deliverable?.fileUrl ?? null : null;
  const showPreview = Boolean((file && previewUrl) || existingPreview);
  const previewSrc = file && previewUrl ? previewUrl : existingPreview;
  const isPdf = file
    ? file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    : deliverable
      ? isPdfDeliverable(deliverable)
      : false;

  const hasFileForManual = Boolean(file || (isEdit && keepExistingFile && deliverable?.storagePath));

  const submit = async () => {
    if (mode === "manual" && !file) {
      setError("Ajoutez une image ou un PDF (max. 5 Mo).");
      return;
    }
    if (isEdit && !file && !keepExistingFile) {
      setError("Ajoutez une image ou un PDF, ou conservez le fichier actuel.");
      return;
    }
    if (!projectName.trim()) {
      setError("Indiquez le nom du projet.");
      return;
    }
    setBusy(true);
    const ok = await onSave({
      projectName,
      company,
      serverPath,
      completedAt,
      notes,
      ...(isEdit
        ? { file: file ?? null }
        : {
            taskId: task?.id ?? null,
            createdBy: createdBy ?? null,
            file,
          }),
    });
    setBusy(false);
    if (ok) onClose();
  };

  const title =
    mode === "completion" ? "Déposer le rendu ?" : isEdit ? "Modifier le livrable" : "Ajouter un livrable";
  const subtitle =
    mode === "completion"
      ? "Projet terminé — centralisez le fichier et son emplacement serveur. Vous pouvez passer."
      : isEdit
        ? "Mettez à jour le nom, l’entité, le chemin ou remplacez le fichier (≤ 5 Mo)."
        : "Enregistrez un projet terminé avec son visuel (≤ 5 Mo).";

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal,80)] flex items-end justify-center bg-[var(--foreground)]/35 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deliverable-modal-title"
    >
      <div className="ui-surface max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl p-5 shadow-[var(--shadow-2)] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Livrables
            </p>
            <h2 id="deliverable-modal-title" className="mt-1 text-xl font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost h-9 w-9 p-0" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[color:var(--foreground)]/65">Nom du projet</span>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              placeholder="Ex. Brochure salon SPACE"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[color:var(--foreground)]/65">Entité</span>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                {companyOptions.length === 0 ? <option value="">—</option> : null}
                {companyOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-[color:var(--foreground)]/65">Date du rendu</span>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[color:var(--foreground)]/65">Emplacement serveur</span>
            <input
              value={serverPath}
              onChange={(e) => setServerPath(e.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 font-mono text-xs sm:text-sm"
              placeholder="\\serveur\partage\Communication\Projet\"
            />
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={[
              "rounded-2xl border border-dashed p-4 transition",
              dragOver
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line-strong)] bg-[var(--surface-soft)]",
            ].join(" ")}
          >
            <input
              ref={inputRef}
              type="file"
              accept={DELIVERABLE_ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {showPreview && previewSrc ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                  {isPdf ? (
                    <iframe title="Aperçu PDF" src={pdfEmbedSrc(previewSrc)} className="h-48 w-full" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="" className="max-h-56 w-full object-contain" />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--foreground)]/60">
                  <span className="truncate font-medium text-[var(--foreground)]">
                    {file?.name ?? deliverable?.fileName ?? "Fichier actuel"}
                  </span>
                  {file ? <span>{(file.size / (1024 * 1024)).toFixed(2)} Mo</span> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => inputRef.current?.click()} className="ui-btn ui-btn-ghost text-xs">
                    Remplacer le fichier
                  </button>
                  {file ? (
                    <button
                      type="button"
                      onClick={() => {
                        pickFile(null);
                        if (isEdit && deliverable?.storagePath) setKeepExistingFile(true);
                      }}
                      className="ui-btn ui-btn-ghost text-xs"
                    >
                      Annuler le remplacement
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 py-6 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--foreground)]">
                  <FileUp className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-[var(--foreground)]">Glisser un fichier ici</span>
                <span className="text-xs text-[color:var(--foreground)]/50">
                  Image ou PDF · max {(DELIVERABLE_MAX_BYTES / (1024 * 1024)).toFixed(0)} Mo
                </span>
              </button>
            )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[color:var(--foreground)]/65">Notes (optionnel)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              placeholder="Version finale, contact, remarques…"
            />
          </label>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {mode === "completion" ? (
              <button type="button" disabled={busy} onClick={onClose} className="ui-btn ui-btn-ghost">
                <SkipForward className="h-4 w-4" />
                Passer
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={onClose} className="ui-btn ui-btn-ghost">
                Annuler
              </button>
            )}
            <button
              type="button"
              disabled={busy || (mode === "manual" && !file) || (isEdit && !hasFileForManual && !file)}
              onClick={() => void submit()}
              className="ui-btn ui-btn-primary"
            >
              {isEdit ? <Pencil className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
              {busy ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer le livrable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
