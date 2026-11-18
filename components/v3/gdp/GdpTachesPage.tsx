"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import V2PageHeader from "../../v2/V2PageHeader";
import { useBoardsOptional } from "../../../lib/boardsContext";

/** Exécution secondaire GdP — board tâches projet s’il existe. */
export default function GdpTachesPage() {
  const boards = useBoardsOptional();
  const taches = boards?.boards.find((b) => b.slug === "taches-gdp");
  const href = taches ? `/v3/boards/${taches.id}` : "/v3/dashboard/kanban";

  return (
    <div className="space-y-5">
      <V2PageHeader
        kicker="Gestion de Projet"
        title="Tâches"
        description="Exécution opérationnelle rattachée aux projets. Le portfolio reste l’entrée principale."
        icon={ClipboardList}
      />
      <div className="ui-surface rounded-2xl px-5 py-6">
        <p className="max-w-xl text-sm text-[color:var(--foreground)]/60">
          Utilisez le tableau de tâches GdP pour le backlog et le suivi quotidien. La santé projet et
          les jalons se pilotent depuis Portfolio / Projets.
        </p>
        <Link href={href} className="ui-btn ui-btn-primary mt-4 text-xs">
          Ouvrir le tableau de tâches
        </Link>
      </div>
    </div>
  );
}
