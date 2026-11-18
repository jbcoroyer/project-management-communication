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
import { useSalonDetail, useSalons } from "../../lib/useSalons";
import { checklistProgress } from "../../lib/salonData";
import {
  SALON_DOC_CATEGORY_LABELS,
  SALON_MODE_LABELS,
  SALON_STATUS_LABELS,
  docCategoriesForMode,
  type SalonDocCategory,
  type SalonStatus,
} from "../../lib/salonTypes";
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
    loading,
    patchSalon,
    patchChecklist,
    createChecklist,
    createDoc,
    removeDoc,
    createContact,
    createBudget,
    patchBudget,
    removeBudget,
  } = useSalonDetail(salonId);

  const [tab, setTab] = useState<Tab>("checklist");
  const [newCheckLabel, setNewCheckLabel] = useState("");
  const [newCheckDue, setNewCheckDue] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docCat, setDocCat] = useState<SalonDocCategory>("orga");
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

      <header className="ui-surface rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              className="w-full bg-transparent text-xl font-semibold outline-none"
              value={salon.name}
              onChange={(e) => void patchSalon({ name: e.target.value })}
              onBlur={(e) => void patchSalon({ name: e.target.value.trim() || salon.name })}
            />
            <p className="mt-1 text-xs text-[color:var(--foreground)]/50">
              {salon.startDate} → {salon.endDate}
              {salon.location ? ` · ${salon.location}` : ""}
              {(salon.hall || salon.standNumber) &&
                ` · ${[salon.hall, salon.standNumber].filter(Boolean).join(" / ")}`}
              {salon.surfaceM2 != null ? ` · ${salon.surfaceM2} m²` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[color:var(--foreground)]/6 px-2.5 py-1 text-[11px] font-semibold">
              {salon.mode} · {SALON_MODE_LABELS[salon.mode]}
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
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--foreground)]/60">
          <span>Checklist {progress}%</span>
          <span>
            Budget {formatMoney(engaged)} · payé {formatMoney(paid)}
          </span>
        </div>
        {salon.notes ? (
          <p className="mt-2 text-xs text-[color:var(--foreground)]/45">{salon.notes}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-1 border-b border-[color:var(--foreground)]/10 pb-1">
        {(
          [
            ["checklist", "Checklist", CheckSquare],
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
            {checklist.map((item) => (
              <li
                key={item.id}
                className="ui-surface flex flex-wrap items-center gap-3 rounded-xl px-3 py-2"
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
                <span className={`flex-1 text-sm ${item.done ? "line-through opacity-50" : ""}`}>
                  {item.label}
                </span>
                <input
                  type="date"
                  className="ui-input text-xs"
                  value={item.dueDate ?? ""}
                  onChange={(e) =>
                    void patchChecklist(item.id, { dueDate: e.target.value || null })
                  }
                />
              </li>
            ))}
          </ul>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCheckLabel.trim()) return;
              void createChecklist(newCheckLabel, newCheckDue || null)
                .then(() => {
                  setNewCheckLabel("");
                  setNewCheckDue("");
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
                          <p className="truncate font-medium">{d.title}</p>
                          {d.url ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-[11px] text-[var(--accent)] hover:underline"
                            >
                              {d.url}
                            </a>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="text-xs text-red-600"
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
            className="ui-surface space-y-2 rounded-2xl p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!docTitle.trim()) return;
              void createDoc({
                category: docCat,
                title: docTitle,
                url: docUrl,
              })
                .then(() => {
                  setDocTitle("");
                  setDocUrl("");
                  toastSuccess("Document ajouté");
                })
                .catch((err) => toastError(err instanceof Error ? err.message : "Erreur"));
            }}
          >
            <p className="text-xs font-semibold">Ajouter un document / lien</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                className="ui-input text-xs"
                value={docCat}
                onChange={(e) => setDocCat(e.target.value as SalonDocCategory)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {SALON_DOC_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <input
                className="ui-input text-xs sm:col-span-2"
                placeholder="Titre"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>
            <input
              className="ui-input w-full text-xs"
              placeholder="URL ou chemin"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
            />
            <button type="submit" className="ui-btn ui-btn-primary text-xs">
              Ajouter
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
