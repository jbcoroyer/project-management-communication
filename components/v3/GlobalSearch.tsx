"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, FolderOpen, LayoutGrid, Package, PackageCheck, Search } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import {
  filterAndRankHits,
  GLOBAL_SEARCH_KIND_LABEL,
  type GlobalSearchHit,
  type GlobalSearchKind,
} from "../../lib/globalSearch";
import { useWorkspace } from "../../lib/useWorkspace";

const KIND_ICON: Record<GlobalSearchKind, typeof Search> = {
  task: LayoutGrid,
  event: CalendarRange,
  stock: Package,
  deliverable: PackageCheck,
  dam: FolderOpen,
};

export default function V3GlobalSearch() {
  const router = useRouter();
  const listId = useId();
  const supabase = getSupabaseBrowser();
  const { workspaceId } = useWorkspace();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<GlobalSearchHit[]>([]);
  const [active, setActive] = useState(0);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2 || !workspaceId) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const [tasksRes, eventsRes, stockRes, delivRes, damRes] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, project_name, company, is_archived")
            .eq("organization_id", workspaceId)
            .eq("is_archived", false)
            .ilike("project_name", `%${trimmed}%`)
            .limit(12),
          supabase
            .from("events")
            .select("id, name, location")
            .eq("organization_id", workspaceId)
            .ilike("name", `%${trimmed}%`)
            .limit(8),
          supabase
            .from("inventory_items")
            .select("id, name, category")
            .eq("organization_id", workspaceId)
            .ilike("name", `%${trimmed}%`)
            .limit(8),
          supabase
            .from("deliverables")
            .select("id, project_name, company")
            .eq("organization_id", workspaceId)
            .ilike("project_name", `%${trimmed}%`)
            .limit(8),
          supabase
            .from("dam_assets")
            .select("id, name, company")
            .eq("organization_id", workspaceId)
            .ilike("name", `%${trimmed}%`)
            .limit(8),
        ]);

        const collected: GlobalSearchHit[] = [];

        for (const row of tasksRes.data ?? []) {
          collected.push({
            id: row.id,
            kind: "task",
            title: row.project_name,
            subtitle: row.company || "Tâche",
            href: `/v3/dashboard/kanban?task=${row.id}`,
          });
        }
        for (const row of eventsRes.data ?? []) {
          collected.push({
            id: row.id,
            kind: "event",
            title: row.name,
            subtitle: row.location || "Événement",
            href: `/v3/events/${row.id}`,
          });
        }
        for (const row of stockRes.data ?? []) {
          collected.push({
            id: String(row.id),
            kind: "stock",
            title: row.name,
            subtitle: row.category || "Stock",
            href: `/v3/stock`,
          });
        }
        for (const row of delivRes.data ?? []) {
          collected.push({
            id: row.id,
            kind: "deliverable",
            title: row.project_name,
            subtitle: row.company || "Livrable",
            href: `/v3/deliverables`,
          });
        }
        for (const row of damRes.data ?? []) {
          collected.push({
            id: row.id,
            kind: "dam",
            title: row.name,
            subtitle: row.company || "Médias",
            href: `/v3/dam`,
          });
        }

        setHits(filterAndRankHits(collected, trimmed));
        setActive(0);
      } finally {
        setLoading(false);
      }
    },
    [supabase, workspaceId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => void runSearch(query), 220);
    return () => window.clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (hit: GlobalSearchHit) => {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)]/80 px-3">
        <Search className="h-3.5 w-3.5 shrink-0 text-[color:var(--foreground)]/35" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher tâches, events, stock…"
          aria-label="Recherche globale"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40 focus:outline-none"
        />
      </div>

      {open && query.trim().length >= 2 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-2)]"
        >
          {loading && hits.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[color:var(--foreground)]/50">Recherche…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[color:var(--foreground)]/50">Aucun résultat</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((hit, index) => {
                const Icon = KIND_ICON[hit.kind];
                return (
                  <li key={`${hit.kind}-${hit.id}`} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(hit)}
                      className={[
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left",
                        index === active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-soft)]",
                      ].join(" ")}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[color:var(--foreground)]/55">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                          {hit.title}
                        </span>
                        <span className="block truncate text-[11px] text-[color:var(--foreground)]/50">
                          {GLOBAL_SEARCH_KIND_LABEL[hit.kind]} · {hit.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
