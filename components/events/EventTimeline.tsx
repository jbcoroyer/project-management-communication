"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Trash2 } from "lucide-react";
import type { EventRow } from "../../lib/eventTypes";
import { formatCurrency } from "../../lib/stockUtils";

type EventTimelineProps = {
  events: EventRow[];
  onDeleteEvent?: (eventId: string) => void | Promise<void>;
};

export default function EventTimeline(props: EventTimelineProps) {
  const { events, onDeleteEvent } = props;

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
        Aucun événement planifié. Créez un salon pour l&apos;afficher ici.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {events.map((ev) => {
        const start = new Date(ev.startDate);
        const end = new Date(ev.endDate);
        const range = `${format(start, "d MMM yyyy", { locale: fr })} → ${format(end, "d MMM yyyy", { locale: fr })}`;
        return (
          <div
            key={ev.id}
            className="relative ui-surface rounded-[22px] border border-[var(--line)] transition-[border-color,box-shadow] hover:border-[var(--line-strong)] hover:shadow-[0_12px_40px_rgba(28,24,20,0.08)]"
          >
            <Link
              href={`/events/${ev.id}`}
              className="group block rounded-[22px] p-5 pr-14"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={[
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
                    ev.status === "Terminé"
                      ? "bg-emerald-50 text-emerald-800"
                      : ev.status === "En préparation"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-[var(--surface-soft)] text-[color:var(--foreground)]/65",
                  ].join(" ")}
                >
                  {ev.status}
                </span>
                <span className="text-xs font-medium text-[color:var(--foreground)]/55">{range}</span>
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[color:var(--foreground)]/75">{ev.name}</h3>
              {ev.location && (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-[color:var(--foreground)]/60">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {ev.location}
                </p>
              )}
              <p className="mt-4 text-sm text-[color:var(--foreground)]/55">
                Budget alloué : <span className="font-semibold text-[var(--foreground)]">{formatCurrency(ev.allocatedBudget)}</span>
              </p>
            </Link>
            {onDeleteEvent && (
              <button
                type="button"
                title="Supprimer l'événement"
                className="ui-transition absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void onDeleteEvent(ev.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
