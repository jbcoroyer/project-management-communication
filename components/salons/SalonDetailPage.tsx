"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckSquare,
  Copy,
  FileText,
  Link2,
  Trash2,
  Wallet,
} from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import { useConfirm } from "../ui/ConfirmDialog";
import SalonLogo from "./SalonLogo";
import { useSalonDetail, useSalons } from "../../lib/useSalons";
import { checklistProgress } from "../../lib/salonData";
import { useReferenceData } from "../../lib/referenceDataContext";
import {
  SALON_DOC_CATEGORY_LABELS,
  SALON_DOC_KIND_LABELS,
  SALON_MODE_LABELS,
  SALON_STATUS_LABELS,
  docCategoriesForMode,
  type SalonDocCategory,
  type SalonDocKind,
  type SalonStatus,
} from "../../lib/salonTypes";
import { SALON_DOC_ACCEPT, salonDocFileError } from "../../lib/salonDocumentUpload";
import { toastError, toastSuccess } from "../../lib/toast";

type Tab = "checklist" | "docs" | "contacts" | "budget";

function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SalonDetailPage({ salonId }: { salonId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { removeSalon, duplicateSalon } = useSalons();
  const {
    salon,
    checklist,
    documents,
    contacts,
    budgetLines,
    creatorName,
    loading,
    patchSalon,
    patchChecklist,
    createChecklist,
    removeChecklist,
    createDoc,
    removeDoc,
    createContact,
    createBudget,
    patchBudget,
    removeBudget,
  } = useSalonDetail(salonId);
  const { admins } = useReferenceData();
  const teamNames = useMemo(() => admins.map((a) => a.name).filter(Boolean), [admins]);
  const defaultAssignee = creatorName || teamNames[0] || "";

  const [tab, setTab] = useState<Tab>("checklist");
  const [newCheckLabel, setNewCheckLabel] = useState("");
  const [newCheckDue, setNewCheckDue] = useState("");
  const [newCheckAssignee, setNewCheckAssignee] = useState("");
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCat, setDocCat] = useState<SalonDocCategory>("orga");
  const [docKind, setDocKind] = useState<SalonDocKind>("autre");
  const [docAmount, setDocAmount] = useState("");
  const [docBusy, setDocBusy] = useState(false);
  const [contactLabel, setContactLabel] = useState("");
  const [contactValue, setContactValue] = useState("");
  const [budgetLabel, setBudgetLabel] = useState("");
  const [budgetHt, setBudgetHt] = useState("");
  const [budgetTtc, setBudgetTtc] = useState("");

  const progress = checklistProgress(checklist);
  const engaged = useMemo(
    () => budgetLines.reduce((s, l) => s + (l.amountTtc || l.amountHt), 0),
    [budgetLines],
  );
  const paid = useMemo(
    () => budgetLines.filter((l) => l.paid).reduce((s, l) => s + (l.amountTtc || l.amountHt), 0),
    [budgetLines],
  );

  const categories = salon ? docCategoriesForMode(salon.mode) : [];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TuesdayLoader />
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="space-y-3 py-10 text-center">
        <p>Salon introuvable.</p>
        <Link href="/v3/salons" className="text-[var(--accent)] hover:underline">
          Retour dashboard
        </Link>
      </div>
    );
  }

  const clone = async () => {
    const name = window.prompt("Nom de la nouvelle édition", `${salon.name} (copie)`);
    if (!name) return;
    const start = window.prompt("Date début (YYYY-MM-DD)", salon.startDate);
    if (!start) return;
    const end = window.prompt("Date fin (YYYY-MM-DD)", salon.endDate);
    if (!end) return;
    const created = await duplicateSalon(salon, { name, startDate: start, endDate: end });
    if (created) router.push(`/v3/salons/${created.id}`);
  };

  const destroy = async () => {
    const ok = await confirm({
      title: "Supprimer ce salon ?",
      description: (
        <>
          « {salon.name} » et sa checklist / docs / budget seront supprimés.
        </>
      ),
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    const done = await removeSalon(salon.id);
    if (done) router.push("/v3/salons");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/v3/salons"
          className="inline-flex items-center gap-1 text-xs text-[color:var(--foreground)]/55 hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Dashboard salons
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-btn text-xs" onClick={() => void clone()}>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Cloner
          </button>
          <button
            type="button"
            className="ui-btn text-xs"
            onClick={() => void patchSalon({ status: "termine" })}
          >
            Marquer terminé
          </button>
          <button type="button" className="ui-btn text-xs text-red-600" onClick={() => void destroy()}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Supprimer
          </button>
        </div>
      </div>

      <header className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-start gap-4">
          <SalonLogo
            slug={salon.catalogSlug}
            name={salon.name}
            logoUrl={salon.logoUrl}
            size={64}
          />
          <div className="min-w-0 flex-1">
            <input
              className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none"
              value={salon.name}
              onChange={(e) => void patchSalon({ name: e.target.value })}
              onBlur={(e) => void patchSalon({ name: e.target.value.trim() || salon.name })}
            />
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              {salon.startDate} → {salon.endDate}
              {salon.location ? ` · ${salon.location}` : ""}
              {(salon.hall || salon.standNumber) &&
                ` · ${[salon.hall, salon.standNumber].filter(Boolean).join(" / ")}`}
              {salon.surfaceM2 != null ? ` · ${salon.surfaceM2} m²` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold">
                {SALON_MODE_LABELS[salon.mode]}
              </span>
              <select
                className="ui-input text-xs"
                value={salon.status}
                onChange={(e) => void patchSalon({ status: e.target.value as SalonStatus })}
              >
                {(Object.keys(SALON_STATUS_LABELS) as SalonStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {SALON_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--foreground)]/45">
              Avancement
            </p>
            <p className="text-lg font-semibold">{progress}%</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--foreground)]/45">
              Budget
            </p>
            <p className="text-lg font-semibold">{formatMoney(engaged)}</p>
            <p className="text-xs text-[color:var(--foreground)]/50">payé {formatMoney(paid)}</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--foreground)]/60">
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--foreground)]/45">
              Synchronisé
            </p>
            <p className="mt-1">
              Les cases coché(e)s et les dates partent aussi sur le{" "}
              <Link href="/v3/dashboard/kanban" className="underline">
                tableau
              </Link>{" "}
              et l’
              <Link href="/v3/dashboard/calendar" className="underline">
                agenda
              </Link>
              .
            </p>
          </div>
        </div>
        {salon.notes ? (
          <p className="mt-3 text-xs text-[color:var(--foreground)]/45">{salon.notes}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-1 border-b border-[color:var(--foreground)]/10 pb-1">
        {(
          [
            ["checklist", "À faire", CheckSquare],
            ["docs", "Documents", FileText],
            ["contacts", "Contacts", Link2],
            ["budget", "Budget", Wallet],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${
              tab === id
                ? "bg-[color:var(--foreground)]/8 font-semibold"
                : "text-[color:var(--foreground)]/55 hover:bg-[color:var(--foreground)]/5"
            }`}
            onClick={() => setTab(id)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "checklist" && (
        <section id="checklist" className="space-y-3">
          <ul className="space-y-2">
            {checklist.map((item) => {
              const assigneeValue = item.assignee || defaultAssignee;
              const assigneeOptions =
                assigneeValue && !teamNames.includes(assigneeValue)
                  ? [assigneeValue, ...teamNames]
                  : teamNames;
              return (
                <li
                  key={item.id}
                  className="ui-surface flex flex-wrap items-center gap-2 rounded-xl px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) =>
                      void patchChecklist(item.id, { done: e.target.checked }).catch((err) =>
                        toastError(err instanceof Error ? err.message : "Erreur"),
                      )
                    }
                    aria-label={item.label}
                  />
                  <input
                    className={`ui-input min-w-[10rem] flex-1 text-sm ${
                      item.done ? "line-through opacity-50" : ""
                    }`}
                    value={draftLabels[item.id] ?? item.label}
                    onChange={(e) =>
                      setDraftLabels((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    onBlur={(e) => {
                      const label = e.target.value.trim();
                      setDraftLabels((prev) => {
                        const next = { ...prev };
                        delete next[item.id];
                        return next;
                      });
                      if (!label || label === item.label) return;
                      void patchChecklist(item.id, { label }).catch((err) =>
                        toastError(err instanceof Error ? err.message : "Erreur"),
                      );
                    }}
                    aria-label="Libellé de la tâche"
                  />
                  <select
                    className="ui-input max-w-[11rem] text-xs"
                    value={assigneeValue}
                    onChange={(e) =>
                      void patchChecklist(item.id, {
                        assignee: e.target.value || null,
                      }).catch((err) =>
                        toastError(err instanceof Error ? err.message : "Erreur"),
                      )
                    }
                    aria-label="Responsable"
                  >
                    {assigneeOptions.length === 0 ? (
                      <option value="">Équipe</option>
                    ) : (
                      assigneeOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))
                    )}
                  </select>
                  <input
                    type="date"
                    className="ui-input text-xs"
                    value={item.dueDate ?? ""}
                    onChange={(e) =>
                      void patchChecklist(item.id, { dueDate: e.target.value || null })
                    }
                  />
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-[color:var(--foreground)]/45 hover:bg-red-500/10 hover:text-red-600"
                    title="Supprimer"
                    aria-label={`Supprimer « ${item.label} »`}
                    onClick={() =>
                      void (async () => {
                        const ok = await confirm({
                          title: "Supprimer cette tâche ?",
                          description: `« ${item.label} » sera retirée de la checklist.`,
                          confirmLabel: "Supprimer",
                          variant: "destructive",
                        });
                        if (!ok) return;
                        try {
                          await removeChecklist(item.id);
                          toastSuccess("Tâche supprimée");
                        } catch (err) {
                          toastError(err instanceof Error ? err.message : "Erreur");
                        }
                      })()
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCheckLabel.trim()) return;
              const assignee = newCheckAssignee || defaultAssignee || null;
              void createChecklist(newCheckLabel, newCheckDue || null, assignee)
                .then(() => {
                  setNewCheckLabel("");
                  setNewCheckDue("");
                  setNewCheckAssignee("");
                  toastSuccess("Case ajoutée");
                })
                .catch((err) => toastError(err instanceof Error ? err.message : "Erreur"));
            }}
          >
            <input
              className="ui-input min-w-[12rem] flex-1 text-xs"
              placeholder="Nouvelle case…"
              value={newCheckLabel}
              onChange={(e) => setNewCheckLabel(e.target.value)}
            />
            <select
              className="ui-input max-w-[11rem] text-xs"
              value={newCheckAssignee || defaultAssignee}
              onChange={(e) => setNewCheckAssignee(e.target.value)}
              aria-label="Responsable"
            >
              {(defaultAssignee && !teamNames.includes(defaultAssignee)
                ? [defaultAssignee, ...teamNames]
                : teamNames
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {teamNames.length === 0 && !defaultAssignee ? (
                <option value="">Équipe</option>
              ) : null}
            </select>
            <input
              type="date"
              className="ui-input text-xs"
              value={newCheckDue}
              onChange={(e) => setNewCheckDue(e.target.value)}
            />
            <button type="submit" className="ui-btn ui-btn-primary text-xs">
              Ajouter
            </button>
          </form>
        </section>
      )}

      {tab === "docs" && (
        <section className="space-y-4">
          {categories.map((cat) => {
            const docs = documents.filter((d) => d.category === cat);
            return (
              <div key={cat}>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)]/40">
                  {SALON_DOC_CATEGORY_LABELS[cat]}
                </h3>
                {docs.length === 0 ? (
                  <p className="text-xs text-[color:var(--foreground)]/40">Vide</p>
                ) : (
                  <ul className="space-y-1">
                    {docs.map((d) => (
                      <li
                        key={d.id}
                        className="ui-surface flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate font-medium">{d.title}</p>
                            <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold">
                              {SALON_DOC_KIND_LABELS[d.docKind]}
                            </span>
                          </div>
                          {d.description ? (
                            <p className="mt-0.5 truncate text-[11px] text-[color:var(--foreground)]/50">
                              {d.description}
                            </p>
                          ) : null}
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[color:var(--foreground)]/45">
                            {d.fileName ? <span>{d.fileName}</span> : null}
                            {(d.amountTtc ?? d.amountHt) != null ? (
                              <span>{formatMoney(d.amountTtc ?? d.amountHt ?? 0)}</span>
                            ) : null}
                            {d.url ? (
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--accent)] hover:underline"
                              >
                                Ouvrir
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-xs text-red-600"
                          onClick={() =>
                            void removeDoc(d.id).catch((err) =>
                              toastError(err instanceof Error ? err.message : "Erreur"),
                            )
                          }
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <form
            className="ui-surface space-y-3 rounded-2xl border border-[var(--line)] p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!docTitle.trim() || !docFile || docBusy) return;
              const fileErr = salonDocFileError(docFile);
              if (fileErr) {
                toastError(fileErr);
                return;
              }
              const needsAmount = docKind === "devis" || docKind === "facture";
              const amount = docAmount ? Number(docAmount.replace(",", ".")) : NaN;
              if (needsAmount && (!Number.isFinite(amount) || amount <= 0)) {
                toastError("Indiquez le montant TTC pour un devis ou une facture.");
                return;
              }
              setDocBusy(true);
              void createDoc({
                category: docCat,
                docKind,
                title: docTitle,
                description: docDescription,
                file: docFile,
                amountTtc: needsAmount ? amount : null,
                amountHt: needsAmount ? amount : null,
              })
                .then(() => {
                  setDocTitle("");
                  setDocDescription("");
                  setDocFile(null);
                  setDocAmount("");
                  setDocKind("autre");
                  toastSuccess(
                    needsAmount
                      ? "Document ajouté — budget engagé mis à jour"
                      : "Document ajouté",
                  );
                })
                .catch((err) => toastError(err instanceof Error ? err.message : "Erreur"))
                .finally(() => setDocBusy(false));
            }}
          >
            <div>
              <p className="text-sm font-semibold">Lier un document</p>
              <p className="mt-0.5 text-[11px] text-[color:var(--foreground)]/50">
                Fichier ≤ 5 Mo (PDF ou image). Pour un devis / facture, le montant augmente le
                budget engagé.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[color:var(--foreground)]/70">
                Fichier
                <input
                  type="file"
                  accept={SALON_DOC_ACCEPT}
                  className="ui-input mt-1.5 w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface-soft)] file:px-2 file:py-1 file:text-xs"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f) {
                      const err = salonDocFileError(f);
                      if (err) {
                        toastError(err);
                        e.target.value = "";
                        setDocFile(null);
                        return;
                      }
                    }
                    setDocFile(f);
                    if (f && !docTitle.trim()) {
                      setDocTitle(f.name.replace(/\.[^.]+$/, ""));
                    }
                  }}
                  required
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--foreground)]/70">
                Type
                <select
                  className="ui-input mt-1.5 w-full"
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value as SalonDocKind)}
                >
                  {(Object.keys(SALON_DOC_KIND_LABELS) as SalonDocKind[]).map((k) => (
                    <option key={k} value={k}>
                      {SALON_DOC_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[color:var(--foreground)]/70">
                Titre
                <input
                  className="ui-input mt-1.5 w-full"
                  placeholder="ex. Devis standiste SPACE"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  required
                />
              </label>
              <label className="block text-xs font-semibold text-[color:var(--foreground)]/70">
                Catégorie
                <select
                  className="ui-input mt-1.5 w-full"
                  value={docCat}
                  onChange={(e) => setDocCat(e.target.value as SalonDocCategory)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {SALON_DOC_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-[color:var(--foreground)]/70">
              Description <span className="font-normal text-[color:var(--foreground)]/40">(facultatif)</span>
              <textarea
                className="ui-input mt-1.5 min-h-[64px] w-full resize-y"
                placeholder="Contexte, version, notes…"
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
              />
            </label>
            {(docKind === "devis" || docKind === "facture") && (
              <label className="block text-xs font-semibold text-[color:var(--foreground)]/70">
                Montant TTC (€) — obligatoire
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="ui-input mt-1.5 w-full sm:max-w-xs"
                  placeholder="0,00"
                  value={docAmount}
                  onChange={(e) => setDocAmount(e.target.value)}
                  required
                />
                <span className="mt-1 block text-[11px] font-normal text-[color:var(--foreground)]/45">
                  Ajouté au budget engagé du salon (saisie manuelle — pas d’OCR PDF en v1).
                </span>
              </label>
            )}
            <button
              type="submit"
              className="ui-btn ui-btn-primary text-xs"
              disabled={docBusy || !docFile || !docTitle.trim()}
            >
              {docBusy ? "Envoi…" : "Lier le document"}
            </button>
          </form>
        </section>
      )}

      {tab === "contacts" && (
        <section className="space-y-3">
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="ui-surface rounded-xl px-3 py-2">
                <p className="text-xs text-[color:var(--foreground)]/45">{c.label}</p>
                <p className="text-sm break-all">{c.value || "—"}</p>
              </li>
            ))}
          </ul>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!contactLabel.trim()) return;
              void createContact(contactLabel, contactValue)
                .then(() => {
                  setContactLabel("");
                  setContactValue("");
                  toastSuccess("Contact ajouté");
                })
                .catch((err) => toastError(err instanceof Error ? err.message : "Erreur"));
            }}
          >
            <input
              className="ui-input text-xs"
              placeholder="Label"
              value={contactLabel}
              onChange={(e) => setContactLabel(e.target.value)}
            />
            <input
              className="ui-input min-w-[12rem] flex-1 text-xs"
              placeholder="Email / URL / tél"
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
            />
            <button type="submit" className="ui-btn ui-btn-primary text-xs">
              Ajouter
            </button>
          </form>
        </section>
      )}

      {tab === "budget" && (
        <section className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span>Engagé {formatMoney(engaged)}</span>
            <span>Payé {formatMoney(paid)}</span>
            <span>Reste {formatMoney(Math.max(0, engaged - paid))}</span>
          </div>
          <ul className="space-y-2">
            {budgetLines.map((line) => (
              <li
                key={line.id}
                className="ui-surface flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{line.label}</p>
                  <p className="text-[11px] text-[color:var(--foreground)]/45">
                    {formatMoney(line.amountTtc || line.amountHt)}
                    {line.dueDate ? ` · échéance ${line.dueDate}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={line.paid}
                      onChange={(e) =>
                        void patchBudget(line.id, { paid: e.target.checked }).catch((err) =>
                          toastError(err instanceof Error ? err.message : "Erreur"),
                        )
                      }
                    />
                    Payé
                  </label>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() =>
                      void removeBudget(line.id).catch((err) =>
                        toastError(err instanceof Error ? err.message : "Erreur"),
                      )
                    }
                  >
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <form
            className="ui-surface flex flex-wrap gap-2 rounded-2xl p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!budgetLabel.trim()) return;
              const ht = Number(budgetHt) || 0;
              const ttc = Number(budgetTtc) || ht;
              void createBudget({ label: budgetLabel, amountHt: ht, amountTtc: ttc })
                .then(() => {
                  setBudgetLabel("");
                  setBudgetHt("");
                  setBudgetTtc("");
                  toastSuccess("Ligne ajoutée");
                })
                .catch((err) => toastError(err instanceof Error ? err.message : "Erreur"));
            }}
          >
            <input
              className="ui-input min-w-[10rem] flex-1 text-xs"
              placeholder="Libellé"
              value={budgetLabel}
              onChange={(e) => setBudgetLabel(e.target.value)}
            />
            <input
              className="ui-input w-24 text-xs"
              placeholder="HT"
              value={budgetHt}
              onChange={(e) => setBudgetHt(e.target.value)}
            />
            <input
              className="ui-input w-24 text-xs"
              placeholder="TTC"
              value={budgetTtc}
              onChange={(e) => setBudgetTtc(e.target.value)}
            />
            <button type="submit" className="ui-btn ui-btn-primary text-xs">
              Ajouter
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
