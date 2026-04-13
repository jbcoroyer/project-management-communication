"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Archive,
  CheckCircle2,
  Download,
  Lightbulb,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../lib/useCurrentUser";
import {
  type StockIdea,
  type StockIdeaCategory,
  type StockIdeaStatus,
  useStockIdeas,
} from "../../lib/useStockIdeas";

const CATEGORIES: { id: StockIdeaCategory; label: string; hint: string }[] = [
  { id: "materiel", label: "Matériel & logistique", hint: "Stock, emballages, réserves…" },
  { id: "process", label: "Process & qualité", hint: "Inventaire, étiquetage, réceptions…" },
  { id: "communication", label: "Communication", hint: "PLV, goodies, supports salon…" },
  { id: "autre", label: "Autre", hint: "Tout le reste pour IDENA" },
];

const STATUS_COLS: {
  status: StockIdeaStatus;
  label: string;
  icon: typeof Lightbulb;
  accent: string;
}[] = [
  {
    status: "nouveau",
    label: "Nouvelles",
    icon: Sparkles,
    accent: "border-sky-300 bg-sky-50/80 text-sky-950",
  },
  {
    status: "etude",
    label: "À creuser",
    icon: Lightbulb,
    accent: "border-amber-300 bg-amber-50/80 text-amber-950",
  },
  {
    status: "adopte",
    label: "Adoptées",
    icon: CheckCircle2,
    accent: "border-emerald-300 bg-emerald-50/80 text-emerald-950",
  },
  {
    status: "archive",
    label: "Archives",
    icon: Archive,
    accent: "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70",
  },
];

function categoryLabel(c: StockIdeaCategory): string {
  return CATEGORIES.find((x) => x.id === c)?.label ?? c;
}

export default function IdeasPage() {
  const { user: currentUser } = useCurrentUser();
  const { ideas, hydrated, addIdea, updateIdea, removeIdea, exportJson } = useStockIdeas();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<StockIdeaCategory>("materiel");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        categoryLabel(i.category).toLowerCase().includes(q),
    );
  }, [ideas, query]);

  const byStatus = useMemo(() => {
    const map: Record<StockIdeaStatus, StockIdea[]> = {
      nouveau: [],
      etude: [],
      adopte: [],
      archive: [],
    };
    for (const i of filtered) {
      map[i.status].push(i);
    }
    for (const k of Object.keys(map) as StockIdeaStatus[]) {
      map[k].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return map;
  }, [filtered]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    addIdea({
      title: t,
      description: description.trim(),
      category,
      status: "nouveau",
    });
    setTitle("");
    setDescription("");
  };

  return (
    <AppShell
      currentUserName={currentUser?.teamMemberName ?? currentUser?.displayName ?? undefined}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl ?? null}
      currentUserJobTitle={currentUser?.jobTitle ?? null}
    >
      <div className="space-y-6">
        <header className="ui-surface relative overflow-hidden rounded-[28px] p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)]/15 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-[#fffdf9] shadow-[0_12px_40px_rgba(20,17,13,0.18)]">
              <Lightbulb className="h-8 w-8" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--foreground)]/50">
                Service Communication IDENA
              </p>
              <h1 className="ui-heading mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Boîte à idées
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--foreground)]/60">
                Proposez une amélioration pour le matériel, la logistique ou les process (y compris autour du stock).
                Les idées sont enregistrées sur cet appareil (navigateur) — exportez-les en JSON pour les partager ou
                les archiver.
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportJson()}
              className="ui-transition inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)]/75 hover:border-[var(--line-strong)]"
            >
              <Download className="h-4 w-4" />
              Exporter JSON
            </button>
          </div>
        </header>

        <section className="ui-surface rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Nouvelle idée</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre court et clair…"
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40"
                  maxLength={200}
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contexte, bénéfice attendu, contraintes…"
                  rows={4}
                  className="ui-focus-ring w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40"
                  maxLength={4000}
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
                  Catégorie
                </p>
                <div className="grid gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={[
                        "ui-transition rounded-xl border px-3 py-2.5 text-left text-sm",
                        category === c.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--foreground)]"
                          : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70 hover:border-[var(--line-strong)]",
                      ].join(" ")}
                    >
                      <span className="block font-medium">{c.label}</span>
                      <span className="mt-0.5 block text-[11px] text-[color:var(--foreground)]/45">{c.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={!title.trim() || !hydrated}
              className="ui-transition inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#fffdf9] shadow-[0_10px_28px_rgba(20,17,13,0.15)] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter à la boîte
            </button>
          </form>
        </section>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[color:var(--foreground)]/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une idée…"
            className="ui-focus-ring min-w-[200px] flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40"
          />
          <span className="text-xs font-semibold text-[color:var(--foreground)]/50">
            {filtered.length} idée{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {STATUS_COLS.map((col) => {
            const Icon = col.icon;
            const list = byStatus[col.status];
            return (
              <div
                key={col.status}
                className={["flex min-h-[320px] flex-col rounded-2xl border-2 p-4 shadow-[0_8px_30px_rgba(20,17,13,0.06)]", col.accent].join(
                  " ",
                )}
              >
                <div className="mb-3 flex items-center gap-2 border-b border-current/10 pb-3">
                  <Icon className="h-4 w-4 opacity-80" />
                  <h3 className="text-sm font-bold">{col.label}</h3>
                  <span className="ml-auto rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                    {list.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                  {list.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[color:var(--foreground)]/45">Aucune idée ici.</p>
                  ) : (
                    list.map((idea) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        onStatus={(s) => updateIdea(idea.id, { status: s })}
                        onRemove={() => {
                          if (window.confirm("Retirer cette idée ?")) removeIdea(idea.id);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function formatIdeaDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return "";
  }
}

function IdeaCard(props: {
  idea: StockIdea;
  onStatus: (s: StockIdeaStatus) => void;
  onRemove: () => void;
}) {
  const { idea, onStatus, onRemove } = props;
  const created = formatIdeaDate(idea.createdAt);

  const nextActions: { label: string; status: StockIdeaStatus }[] = [];
  if (idea.status === "nouveau") nextActions.push({ label: "À creuser", status: "etude" });
  if (idea.status === "nouveau" || idea.status === "etude") nextActions.push({ label: "Adoptée", status: "adopte" });
  if (idea.status !== "archive") nextActions.push({ label: "Archiver", status: "archive" });
  if (idea.status === "archive") nextActions.push({ label: "Rouvrir", status: "nouveau" });

  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/40">
        {categoryLabel(idea.category)} · {created}
      </p>
      <h4 className="mt-1 text-sm font-semibold leading-snug text-[var(--foreground)]">{idea.title}</h4>
      {idea.description ? (
        <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--foreground)]/60">{idea.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {nextActions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onStatus(a.status)}
            className="ui-transition rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[10px] font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onRemove}
          className="ui-transition ml-auto inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
          title="Supprimer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
