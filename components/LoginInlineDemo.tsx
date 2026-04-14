"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { CalendarRange, LayoutGrid, ListTodo, Package, Sparkles, Users } from "lucide-react";

type DemoItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof LayoutGrid;
  gradient: string;
  focal: string;
  badge: string;
  highlights: string[];
};

const ITEMS: DemoItem[] = [
  {
    id: "kanban",
    title: "Kanban intelligent",
    subtitle: "Priorisez, glissez-déposez, suivez en temps réel.",
    icon: LayoutGrid,
    gradient: "from-cyan-500/20 to-blue-600/10",
    focal: "64% 28%",
    badge: "Temps réel",
    highlights: ["Drag & drop fluide", "Suivi multi-collaborateurs", "Priorisation instantanée"],
  },
  {
    id: "events",
    title: "Hub Événements",
    subtitle: "Tâches, budget et documents centralisés.",
    icon: CalendarRange,
    gradient: "from-amber-500/20 to-orange-500/10",
    focal: "58% 30%",
    badge: "Vue consolidée",
    highlights: ["Vue salons", "Budgets engagés", "Pilotage opérationnel"],
  },
  {
    id: "stock",
    title: "Stock & idées",
    subtitle: "Mouvements, alertes et boîte à idées équipe.",
    icon: Package,
    gradient: "from-emerald-500/20 to-teal-500/10",
    focal: "62% 34%",
    badge: "Suivi précis",
    highlights: ["Historique détaillé", "Alertes de seuil", "Amélioration continue"],
  },
  {
    id: "todo",
    title: "To-Do personnel",
    subtitle: "Priorités filtrées par collaborateur.",
    icon: ListTodo,
    gradient: "from-rose-500/20 to-fuchsia-500/10",
    focal: "62% 26%",
    badge: "Priorités claires",
    highlights: ["Vision quotidienne", "Retards identifiés", "Actions immédiates"],
  },
  {
    id: "calendar",
    title: "Planning calendrier",
    subtitle: "Vision semaine, slots et deadlines.",
    icon: CalendarRange,
    gradient: "from-violet-500/20 to-indigo-500/10",
    focal: "58% 43%",
    badge: "Planification",
    highlights: ["Vue semaine", "Conflits visibles", "Coordination simplifiée"],
  },
  {
    id: "workload",
    title: "Charge de l’équipe",
    subtitle: "Disponibilité, surcharge, capacité hebdo.",
    icon: Users,
    gradient: "from-sky-500/20 to-cyan-500/10",
    focal: "59% 34%",
    badge: "Pilotage équipe",
    highlights: ["Capacité hebdo", "Répartition équitable", "Décisions managériales"],
  },
];

export default function LoginInlineDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((v) => (v + 1) % ITEMS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const current = ITEMS[index];
  const Icon = current.icon;

  return (
    <aside className="ui-surface h-full rounded-2xl p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
            Démo produit
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Découvrez la plateforme IDENA
          </h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
            Un outil métier pensé pour une équipe communication exigeante.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)]">
          <Sparkles className="h-3.5 w-3.5" />
          SaaS
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Modules", value: "6" },
          { label: "Temps réel", value: "Live" },
          { label: "UX", value: "Premium" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-2 text-center"
          >
            <p className="text-sm font-bold leading-none text-[var(--foreground)]">{kpi.value}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)]/55">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {ITEMS.map((item, i) => {
          const ItemIcon = item.icon;
          const active = i === index;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              className={[
                "ui-transition inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                active
                  ? "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[var(--foreground)]"
                  : "border-[var(--line)] bg-transparent text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]",
              ].join(" ")}
            >
              <ItemIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
              {item.title}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.992 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="relative mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
        >
          <div className={["pointer-events-none absolute inset-0 bg-gradient-to-br", current.gradient].join(" ")} />
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold leading-tight">{current.title}</p>
                <p className="mt-0.5 text-xs text-[color:var(--foreground)]/60">{current.subtitle}</p>
              </div>
              <Icon className="h-4 w-4 text-[var(--accent)]" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-[var(--line)]/80 bg-[#f6f6f6] shadow-[0_14px_35px_rgba(14,12,10,0.12)]">
              <div className="flex items-center gap-1.5 border-b border-[var(--line)]/60 bg-white/70 px-2 py-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400/90" />
                <span className="h-2 w-2 rounded-full bg-amber-400/90" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
                <div className="ml-2 h-2 w-24 rounded-full bg-[var(--foreground)]/15" />
              </div>

              <motion.div
                initial={{ scale: 1.06, x: 5, y: 0 }}
                animate={{ scale: [1.06, 1.02, 1.05], x: [5, -2, 3], y: [0, -1, 1] }}
                transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="relative aspect-[16/9] w-full"
              >
                <Image
                  src={`/demo/${current.id}.png`}
                  alt={`${current.title} - aperçu plateforme IDENA`}
                  fill
                  className="object-cover"
                  style={{ objectPosition: current.focal, filter: "saturate(1.1) contrast(1.04)" }}
                  sizes="(max-width: 1024px) 100vw, 560px"
                  priority={index < 2}
                />
              </motion.div>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/8" />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-white/0 via-white/25 to-white/0"
                animate={{ x: ["0%", "430%"] }}
                transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2.8, ease: "easeInOut" }}
              />
              <div className="absolute left-2 top-8 flex items-center gap-1 rounded-full border border-white/40 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                <Icon className="h-3 w-3" />
                {current.badge}
              </div>
              <div className="absolute right-2 top-8 rounded-full border border-white/35 bg-black/25 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                Live Demo
              </div>
            </div>

            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {current.highlights.map((h) => (
                <div
                  key={h}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1.5 text-[10px] font-semibold text-[color:var(--foreground)]/72"
                >
                  {h}
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-center gap-1.5">
              {ITEMS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Voir ${item.title}`}
                  className={[
                    "ui-transition h-1.5 rounded-full",
                    i === index
                      ? "w-6 bg-[var(--accent)]"
                      : "w-2.5 bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/35",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-3 text-center text-[11px] text-[color:var(--foreground)]/52">
        Démonstration visuelle des modules clés du Service Communication IDENA.
      </p>
    </aside>
  );
}
