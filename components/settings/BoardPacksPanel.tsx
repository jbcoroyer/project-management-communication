"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Sparkles } from "lucide-react";
import { BOARD_PACKS } from "../../lib/boardPacks";
import { useBoards } from "../../lib/boardsContext";
import { useServices } from "../../lib/servicesContext";
import { toastError, toastSuccess } from "../../lib/toast";

export default function BoardPacksPanel() {
  const router = useRouter();
  const { createBoard } = useBoards();
  const { services } = useServices();
  const [busyId, setBusyId] = useState<string | null>(null);

  const install = async (packId: string) => {
    const pack = BOARD_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    setBusyId(packId);
    try {
      const serviceId =
        pack.serviceSlug == null
          ? null
          : (services.find((s) => s.slug === pack.serviceSlug)?.id ?? null);
      const board = await createBoard({
        name: pack.name,
        description: pack.description,
        serviceId,
        capabilities: pack.capabilities,
        fields: pack.fields.map((f) => ({
          label: f.label,
          key: f.key,
          fieldType: f.fieldType,
        })),
      });
      toastSuccess(`Pack « ${pack.name} » installé`);
      router.push(`/v3/boards/${board.id}`);
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="ui-surface space-y-4 rounded-2xl p-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Packs
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          Modèles métier
        </h2>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
          Installez un modèle prêt à l’emploi : cela crée un tableau déjà
          configuré (capacités + champs). Vous pouvez aussi partir de zéro via
          « Créer un tableau ».
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {BOARD_PACKS.map((pack) => (
          <li
            key={pack.id}
            className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]/40 p-3.5"
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{pack.name}</h3>
            <p className="mt-1 flex-1 text-[12px] text-[color:var(--foreground)]/55">
              {pack.description}
            </p>
            <button
              type="button"
              className="ui-btn ui-btn-primary mt-3 h-9 text-[12px]"
              disabled={busyId === pack.id}
              onClick={() => void install(pack.id)}
            >
              <PackagePlus className="h-3.5 w-3.5" aria-hidden />
              {busyId === pack.id ? "Installation…" : "Installer"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
