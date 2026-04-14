"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, Bell, CalendarRange, LayoutGrid, Megaphone, Package, ShieldCheck } from "lucide-react";
import { IdenaMark } from "./IdenaBrand";

type DemoView = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof LayoutGrid;
  bullets: string[];
  tone: string;
};

const DEMO_VIEWS: DemoView[] = [
  {
    id: "kanban",
    title: "Tableau Kanban",
    subtitle: "Pilotez les priorités en glisser-déposer",
    icon: LayoutGrid,
    bullets: ["Colonnes personnalisables", "Sous-tâches et planning", "Fin de tâche animée"],
    tone: "from-cyan-500/20 to-blue-600/10",
  },
  {
    id: "events",
    title: "Hub Événements",
    subtitle: "Coordonnez salons, budgets et documents",
    icon: CalendarRange,
    bullets: ["Tâches liées aux salons", "Budget consolidé", "Documents centralisés"],
    tone: "from-amber-400/20 to-orange-500/10",
  },
  {
    id: "social",
    title: "Réseaux sociaux",
    subtitle: "Planifiez, validez et transformez en tâches",
    icon: Megaphone,
    bullets: ["Calendrier éditorial", "Suivi responsable", "Création de tâche en 1 clic"],
    tone: "from-fuchsia-500/20 to-pink-500/10",
  },
  {
    id: "stock",
    title: "Stock & Idées",
    subtitle: "Suivez les mouvements et améliorez les process",
    icon: Package,
    bullets: ["Historique des entrées/sorties", "Alertes de seuil", "Boîte à idées intégrée"],
    tone: "from-emerald-500/20 to-teal-500/10",
  },
  {
    id: "analytics",
    title: "Analytics",
    subtitle: "Visualisez charge, deadlines et performance",
    icon: BarChart3,
    bullets: ["Charge équipe", "Vue calendrier", "Aide décisionnelle"],
    tone: "from-violet-500/20 to-indigo-500/10",
  },
];

function DemoPreview({ view }: { view: DemoView }) {
  const bars = useMemo(() => [34, 61, 42, 75, 50], []);
  return (
    <motion.div
      key={view.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
    >
      <div className={["pointer-events-none absolute inset-0 bg-gradient-to-br", view.tone].join(" ")} />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-28 rounded-full bg-[var(--foreground)]/12" />
          <div className="h-2.5 w-12 rounded-full bg-[var(--accent)]/45" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {view.id === "kanban" &&
            [1, 2, 3].map((col) => (
              <div key={col} className="rounded-lg border border-[var(--line)]/80 bg-[var(--surface-soft)] p-1.5">
                <div className="mb-1.5 h-2 w-10 rounded-full bg-[var(--foreground)]/20" />
                {[1, 2, 3].map((card) => (
                  <motion.div
                    key={card}
                    className="mb-1 h-8 rounded-md bg-white/80"
                    animate={{ y: [0, -1.5, 0] }}
                    transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, delay: card * 0.22 }}
                  />
                ))}
              </div>
            ))}
          {view.id === "analytics" && (
            <div className="col-span-3 flex h-28 items-end gap-2 rounded-lg border border-[var(--line)]/80 bg-[var(--surface-soft)] p-2">
              {bars.map((h, i) => (
                <motion.div
                  key={h}
                  className="w-full rounded-sm bg-[var(--accent)]/80"
                  animate={{ height: [h * 0.5, h, h * 0.7] }}
                  transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          )}
          {view.id !== "kanban" && view.id !== "analytics" && (
            <div className="col-span-3 space-y-2 rounded-lg border border-[var(--line)]/80 bg-[var(--surface-soft)] p-2">
              {[1, 2, 3, 4].map((line) => (
                <motion.div
                  key={line}
                  className="h-6 rounded-md bg-white/85"
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: line * 0.18 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function PublicProductDemo() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((p) => (p + 1) % DEMO_VIEWS.length);
    }, 3600);
    return () => window.clearInterval(id);
  }, []);

  const view = DEMO_VIEWS[active];
  const ViewIcon = view.icon;

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="ui-surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <IdenaMark className="h-12 w-12 rounded-2xl" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/60">
                  Service Communication
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">IDENA Platform</h1>
                <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
                  Suite métier interne pour gérer projets, événements, social media et stock.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:border-[var(--line-strong)]"
              >
                Découvrir en accès équipe
              </Link>
              <Link
                href="/login"
                className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)]"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="ui-surface space-y-2 rounded-2xl p-3">
            {DEMO_VIEWS.map((item, idx) => {
              const Icon = item.icon;
              const selected = idx === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(idx)}
                  className={[
                    "ui-transition w-full rounded-xl border px-3 py-3 text-left",
                    selected
                      ? "border-[var(--line-strong)] bg-[var(--surface-soft)] shadow-sm"
                      : "border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-soft)]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--accent)]" />
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--foreground)]/60">{item.subtitle}</p>
                </button>
              );
            })}
          </div>

          <div className="ui-surface rounded-2xl p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/70">
                  <Bell className="h-3.5 w-3.5" />
                  Démo animée de l’outil
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{view.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--foreground)]/60">{view.subtitle}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
                <ViewIcon className="h-5 w-5" />
              </div>
            </div>

            <DemoPreview view={view} />

            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {view.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)]/75"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="ui-surface rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
                Outil interne Service Communication IDENA
              </h3>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
                Environnement sécurisé, pensé pour les équipes IDENA, avec notifications en temps réel et workflows unifiés.
              </p>
            </div>
            <Link
              href="/login"
              className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)]"
            >
              Accéder à la plateforme
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
