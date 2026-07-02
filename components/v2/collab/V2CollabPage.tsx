"use client";

import { useMemo, useState } from "react";
import { MessagesSquare, Users } from "lucide-react";
import V2AppShell from "../AppShell";
import V2CommentThread from "./V2CommentThread";
import PresenceBar from "../PresenceBar";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useReferenceData } from "../../../lib/useReferenceData";
import { useTasks } from "../../../lib/useTasks";
import { usePresence } from "../../../lib/v2/usePresence";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";

export default function V2CollabPage() {
  const { user } = useCurrentUser();
  const { admins } = useReferenceData();
  const { tasks } = useTasks();

  const knownNames = useMemo(() => admins.map((a) => a.name).filter(Boolean), [admins]);
  const currentUser = useMemo(
    () => ({ id: user?.id ?? null, name: user?.teamMemberName ?? user?.displayName ?? user?.email ?? "Anonyme" }),
    [user],
  );

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.column !== DONE_COLUMN_NAME),
    [tasks],
  );
  const [entityKey, setEntityKey] = useState("equipe");

  const presence = usePresence("v2-collab", {
    id: currentUser.id,
    name: currentUser.name,
    avatarUrl: user?.avatarUrl ?? null,
  });

  const entityTitle =
    entityKey === "equipe"
      ? "Fil d'équipe"
      : `Tâche : ${activeTasks.find((t) => `task:${t.id}` === entityKey)?.projectName ?? ""}`;

  return (
    <V2AppShell
      currentUserName={currentUser.name}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                <MessagesSquare className="h-3.5 w-3.5" /> Collaboration · V2
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Discussions &amp; mentions</h1>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
                Commentaires temps réel (Broadcast) avec @mentions, sur le fil d'équipe ou une tâche.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[color:var(--foreground)]/45" />
              <PresenceBar members={presence} />
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <section className="ui-surface rounded-2xl p-4">
            <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Fils</h2>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setEntityKey("equipe")}
                className={[
                  "ui-transition w-full rounded-lg px-3 py-2 text-left text-sm font-medium",
                  entityKey === "equipe" ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                ].join(" ")}
              >
                # Fil d'équipe
              </button>
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/40">Tâches actives</p>
              <div className="max-h-[420px] space-y-1 overflow-y-auto">
                {activeTasks.slice(0, 40).map((t) => {
                  const key = `task:${t.id}`;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEntityKey(key)}
                      className={[
                        "ui-transition w-full truncate rounded-lg px-3 py-2 text-left text-sm",
                        entityKey === key ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]" : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                      ].join(" ")}
                    >
                      {t.projectName}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <V2CommentThread
            key={entityKey}
            channelKey={entityKey}
            currentUser={currentUser}
            knownNames={knownNames}
            title={entityTitle}
          />
        </div>
      </div>
    </V2AppShell>
  );
}
