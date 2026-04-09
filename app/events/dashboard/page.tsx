"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, Plus, RefreshCcw, TrendingUp, Wallet } from "lucide-react";
import AppShell from "../../../components/AppShell";
import CreateEventModal from "../../../components/events/CreateEventModal";
import EventTasksKanban from "../../../components/events/EventTasksKanban";
import EventTimeline from "../../../components/events/EventTimeline";
import EventsSectionNav from "../../../components/events/EventsSectionNav";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useEvents } from "../../../lib/useEvents";
import { useTasks } from "../../../lib/useTasks";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { formatCurrency } from "../../../lib/stockUtils";
import { deleteEvent } from "../../actions/events";
import { toastError, toastSuccess } from "../../../lib/toast";

export default function EventsDashboardPage() {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const { events, loading: eventsLoading, loadEvents } = useEvents();
  const { tasks, loadTasks } = useTasks();
  const [createOpen, setCreateOpen] = useState(false);
  const [yearEngaged, setYearEngaged] = useState<number | null>(null);

  const eventTasks = useMemo(() => tasks.filter((t) => Boolean(t.eventId)), [tasks]);

  const activeEventsCount = useMemo(
    () => events.filter((e) => e.status !== "Terminé").length,
    [events],
  );

  const handleDeleteEvent = async (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    const label = ev?.name ?? "cet événement";
    if (!window.confirm(`Supprimer « ${label} » et toutes ses tâches ?`)) return;
    const r = await deleteEvent(eventId);
    if (!r.ok) {
      toastError(r.error);
      return;
    }
    toastSuccess("Événement supprimé");
    void loadEvents();
    void loadTasks();
  };

  useEffect(() => {
    let cancelled = false;
    async function loadYearBudget() {
      const supabase = getSupabaseBrowser();
      const y = new Date().getFullYear();
      const start = `${y}-01-01`;
      const end = `${y}-12-31`;
      const { data: evs, error: evErr } = await supabase
        .from("events")
        .select("id")
        .gte("start_date", start)
        .lte("start_date", end);
      if (evErr || cancelled) {
        if (!cancelled) setYearEngaged(0);
        return;
      }
      const ids = (evs ?? []).map((e: { id: string }) => e.id);
      if (ids.length === 0) {
        setYearEngaged(0);
        return;
      }
      const { data: exRows } = await supabase.from("expenses").select("amount").in("event_id", ids);
      let sum = (exRows ?? []).reduce((a: number, r: { amount: number | string | null }) => a + Number(r.amount ?? 0), 0);

      const { data: mvRows } = await supabase
        .from("stock_movements")
        .select("change_amount, unit_price_at_movement, inventory_items(unit_price)")
        .in("event_id", ids)
        .lt("change_amount", 0);

      for (const raw of mvRows ?? []) {
        const row = raw as {
          change_amount: number;
          unit_price_at_movement: number | null;
          inventory_items: { unit_price: number | string } | null;
        };
        const unit =
          row.unit_price_at_movement != null
            ? Number(row.unit_price_at_movement)
            : Number(row.inventory_items?.unit_price ?? 0) || 0;
        sum += Math.abs(row.change_amount) * unit;
      }
      if (!cancelled) setYearEngaged(sum);
    }
    void loadYearBudget();
    return () => {
      cancelled = true;
    };
  }, [events]);

  const toolbarRight = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          void loadEvents();
          void loadTasks();
        }}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
      >
        <RefreshCcw className="h-4 w-4" />
        Actualiser
      </button>
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)]"
      >
        <Plus className="h-4 w-4" />
        Nouvel événement
      </button>
    </div>
  );

  return (
    <AppShell
      toolbarRight={toolbarRight}
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <section className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/75">
              <CalendarRange className="h-3.5 w-3.5" />
              Espace événementiel
            </div>
            <h1 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">Hub salons &amp; événements</h1>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--foreground)]/65">
              Vue consolidée : calendrier des salons, charge de travail Kanban (tâches liées aux événements) et budget engagé sur
              l&apos;année.
            </p>
          </div>
        </div>

        <EventsSectionNav />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="ui-surface rounded-[24px] p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
              <TrendingUp className="h-3.5 w-3.5" />
              Événements en cours
            </div>
            <p className="mt-4 text-4xl font-semibold text-[var(--foreground)]">{activeEventsCount}</p>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">Statuts autres que « Terminé »</p>
          </div>
          <div className="ui-surface rounded-[24px] p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
              <Wallet className="h-3.5 w-3.5" />
              Budget engagé ({new Date().getFullYear()})
            </div>
            <p className="mt-4 text-4xl font-semibold text-[var(--foreground)]">
              {yearEngaged === null ? "…" : formatCurrency(yearEngaged)}
            </p>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">Dépenses saisies + valorisation des sorties stock</p>
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Timeline des salons</h2>
              <p className="text-sm text-[color:var(--foreground)]/55">Cliquez sur une carte pour ouvrir l&apos;espace de travail.</p>
            </div>
            <Link
              href="/"
              className="text-sm font-semibold text-[color:var(--foreground)]/75 hover:underline"
            >
              Retour au tableau de bord principal
            </Link>
          </div>
          {eventsLoading ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
              Chargement des événements…
            </div>
          ) : (
            <EventTimeline events={events} onDeleteEvent={handleDeleteEvent} />
          )}
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">Charge de travail (tâches événements)</h2>
          <p className="mb-4 text-sm text-[color:var(--foreground)]/55">
            Toutes les tâches avec un lien événement apparaissent aussi sur le Kanban principal.
          </p>
          <EventTasksKanban tasks={eventTasks} />
        </div>
      </section>

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          void loadEvents();
          void loadTasks();
          router.push(`/events/${id}`);
        }}
      />
    </AppShell>
  );
}
