"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Plus, X } from "lucide-react";
import {
  BOARD_CAPABILITY_KEYS,
  BOARD_CAPABILITY_META,
  defaultBoardCapabilities,
  type BoardCapabilities,
  type BoardCapabilityKey,
} from "../../lib/boards";
import { useBoards } from "../../lib/boardsContext";
import { useServicesOptional } from "../../lib/servicesContext";
import { resolveOrgLabel } from "../../lib/orgLabels";
import { toastError, toastSuccess } from "../../lib/toast";

type DraftField = { label: string; fieldType: "text" | "number" | "date" | "select" };

export default function CreateBoardWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { createBoard } = useBoards();
  const services = useServicesOptional();
  const serviceLabel = resolveOrgLabel(services?.orgLabels, "service");
  const boardLabel = resolveOrgLabel(services?.orgLabels, "board");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState<string>("");
  const [capabilities, setCapabilities] = useState<BoardCapabilities>(
    defaultBoardCapabilities,
  );
  const [fields, setFields] = useState<DraftField[]>([]);
  const [busy, setBusy] = useState(false);

  const myServices = services?.myServices ?? [];
  const showFields = capabilities.custom_fields;

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  if (!open) return null;

  const toggleCap = (key: BoardCapabilityKey) => {
    if (key === "columns") return;
    setCapabilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const board = await createBoard({
        name: name.trim(),
        description: description.trim() || undefined,
        serviceId: serviceId || null,
        capabilities,
        fields: showFields
          ? fields.filter((f) => f.label.trim()).map((f) => ({
              label: f.label.trim(),
              fieldType: f.fieldType,
            }))
          : [],
      });
      toastSuccess(`${boardLabel} créé`);
      onClose();
      setName("");
      setDescription("");
      setServiceId("");
      setCapabilities(defaultBoardCapabilities());
      setFields([]);
      router.push(`/v3/boards/${board.id}`);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-board-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_34px_90px_rgba(20,17,13,0.28)]"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Création sur mesure
            </p>
            <h2
              id="create-board-title"
              className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]"
            >
              <LayoutGrid className="h-5 w-5 text-[var(--accent)]" aria-hidden />
              Nouveau {boardLabel.toLowerCase()}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Composez les capacités dont vous avez besoin. Rien n’est imposé.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-ghost h-9 w-9 shrink-0 p-0"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="board-name" className="text-xs font-medium text-[color:var(--foreground)]/65">
              Nom
            </label>
            <input
              id="board-name"
              className="ui-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Devis ADV, Suivi export…"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="board-desc" className="text-xs font-medium text-[color:var(--foreground)]/65">
              Description (optionnel)
            </label>
            <textarea
              id="board-desc"
              className="ui-input min-h-[72px] w-full resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="À quoi sert ce tableau ?"
            />
          </div>

          {myServices.length > 0 ? (
            <div className="space-y-1.5">
              <label htmlFor="board-service" className="text-xs font-medium text-[color:var(--foreground)]/65">
                {serviceLabel} (optionnel)
              </label>
              <select
                id="board-service"
                className="ui-input w-full"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Transverse (tous les services)</option>
                {myServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[color:var(--foreground)]/65">
              Capacités
            </legend>
            <ul className="space-y-1.5">
              {BOARD_CAPABILITY_KEYS.map((key) => {
                const meta = BOARD_CAPABILITY_META[key];
                const checked = capabilities[key];
                const locked = key === "columns";
                return (
                  <li key={key}>
                    <label
                      className={[
                        "ui-transition flex cursor-pointer gap-3 rounded-xl border p-3",
                        checked
                          ? "border-[var(--accent)]/45 bg-[var(--surface-soft)]"
                          : "border-[var(--line)]",
                        locked ? "opacity-90" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleCap(key)}
                        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[var(--foreground)]">
                          {meta.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[color:var(--foreground)]/50">
                          {meta.description}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {showFields ? (
            <div className="space-y-2 rounded-xl border border-[var(--line)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[color:var(--foreground)]/65">
                  Champs personnalisés
                </p>
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost h-8 text-[11px]"
                  onClick={() =>
                    setFields((prev) => [...prev, { label: "", fieldType: "text" }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Ajouter
                </button>
              </div>
              {fields.length === 0 ? (
                <p className="text-[11px] text-[color:var(--foreground)]/45">
                  Aucun champ pour l’instant.
                </p>
              ) : (
                <ul className="space-y-2">
                  {fields.map((field, index) => (
                    <li key={index} className="flex gap-2">
                      <input
                        className="ui-input flex-1"
                        placeholder="Libellé"
                        value={field.label}
                        onChange={(e) =>
                          setFields((prev) =>
                            prev.map((f, i) =>
                              i === index ? { ...f, label: e.target.value } : f,
                            ),
                          )
                        }
                      />
                      <select
                        className="ui-input w-[110px]"
                        value={field.fieldType}
                        onChange={(e) =>
                          setFields((prev) =>
                            prev.map((f, i) =>
                              i === index
                                ? {
                                    ...f,
                                    fieldType: e.target.value as DraftField["fieldType"],
                                  }
                                : f,
                            ),
                          )
                        }
                      >
                        <option value="text">Texte</option>
                        <option value="number">Nombre</option>
                        <option value="date">Date</option>
                        <option value="select">Liste</option>
                      </select>
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost h-10 w-10 p-0"
                        aria-label="Retirer le champ"
                        onClick={() =>
                          setFields((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <footer className="mt-5 flex justify-end gap-2">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={!canSubmit || busy}
            onClick={() => void submit()}
          >
            {busy ? "Création…" : `Créer le ${boardLabel.toLowerCase()}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
