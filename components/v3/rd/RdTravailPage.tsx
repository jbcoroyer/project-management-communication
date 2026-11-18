"use client";

import Link from "next/link";
import { ListTodo } from "lucide-react";
import V2PageHeader from "../../v2/V2PageHeader";
import { useBoardsOptional } from "../../../lib/boardsContext";

/** Exécution secondaire : board Travail R&D s’il existe, sinon tableau org. */
export default function RdTravailPage() {
  const boards = useBoardsOptional();
  const travail = boards?.boards.find((b) => b.slug === "travail-rd");
  const href = travail ? `/v3/boards/${travail.id}` : "/v3/dashboard/kanban";

  return (
    <div className="space-y-5">
      <V2PageHeader
        kicker="R&D"
        title="Travail"
        description="Tâches opérationnelles (préparer un banc, rédiger un rapport). Le portfolio reste sur Projets / Expériences / Gates."
        icon={ListTodo}
      />
      <div className="ui-surface rounded-2xl px-5 py-6">
        <p className="max-w-xl text-sm text-[color:var(--foreground)]/60">
          Le Kanban sert l’exécution quotidienne, pas le pilotage de l’incertitude. Ouvrez le tableau
          de travail R&D pour les sous-tâches liées aux expériences.
        </p>
        <Link href={href} className="ui-btn ui-btn-primary mt-4 text-xs">
          Ouvrir le tableau de travail
        </Link>
      </div>
    </div>
  );
}
