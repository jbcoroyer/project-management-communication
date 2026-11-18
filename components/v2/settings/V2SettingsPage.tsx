"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Home,
  Palette,
  UserCircle2,
  UsersRound,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import AdminSettingsPanel from "../../settings/AdminSettingsPanel";
import WorkspaceMembersPanel from "../../settings/WorkspaceMembersPanel";
import WorkspaceModulesPanel from "../../settings/WorkspaceModulesPanel";
import WorkspaceServicesPanel from "../../settings/WorkspaceServicesPanel";
import OrgLabelsPanel from "../../settings/OrgLabelsPanel";
import DeleteAccountPanel from "../../settings/DeleteAccountPanel";
import DesktopStartupPanel from "../../settings/DesktopStartupPanel";
import UiThemePanel from "../../settings/UiThemePanel";
import V2PageHeader from "../V2PageHeader";

type SettingsIntent = "me" | "look" | "team" | "space" | "lists";

const INTENTS: {
  id: SettingsIntent;
  title: string;
  blurb: string;
  icon: typeof UserCircle2;
}[] = [
  {
    id: "me",
    title: "Compte",
    blurb: "Profil, agenda Outlook, application bureau et suppression de compte.",
    icon: UserCircle2,
  },
  {
    id: "look",
    title: "Apparence",
    blurb: "Thèmes d’interface : typographie, couleurs et contrôles.",
    icon: Palette,
  },
  {
    id: "team",
    title: "Équipe",
    blurb: "Accès à l’espace et personnes assignables sur les tâches.",
    icon: UsersRound,
  },
  {
    id: "space",
    title: "Espace",
    blurb: "Modules, rattachements aux services, vocabulaire et identité.",
    icon: Home,
  },
  {
    id: "lists",
    title: "Référentiels",
    blurb: "Sociétés, domaines, colonnes Kanban et archivage.",
    icon: BookOpen,
  },
];

function intentFromSearch(outlook: string | null): SettingsIntent | null {
  if (outlook) return "me";
  return null;
}

export default function V2SettingsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isModernUi = pathname.startsWith("/v2") || pathname.startsWith("/v3");
  const outlookParam = searchParams.get("outlook");

  const [intent, setIntent] = useState<SettingsIntent | null>(() =>
    intentFromSearch(outlookParam),
  );

  useEffect(() => {
    if (outlookParam) setIntent("me");
  }, [outlookParam]);

  const active = useMemo(
    () => INTENTS.find((i) => i.id === intent) ?? null,
    [intent],
  );

  return (
    <div className="space-y-5">
      <section>
        {isModernUi ? (
          <V2PageHeader
            kicker="Outils"
            title="Réglages"
            description="Choisissez une section. Un sujet à la fois — sans formulaire interminable."
          />
        ) : (
          <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Paramètres
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Réglages</h1>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Choisissez une section. Un sujet à la fois — sans formulaire interminable.
            </p>
          </header>
        )}
      </section>

      {!active ? (
        <div className="ui-surface overflow-hidden rounded-2xl">
          <ul className="divide-y divide-[var(--line)]">
            {INTENTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setIntent(item.id)}
                    className="ui-transition flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--surface-soft)]/70 sm:px-5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]">
                      <Icon className="h-4 w-4 text-[color:var(--foreground)]/70" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--foreground)]">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-[color:var(--foreground)]/55">
                        {item.blurb}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[color:var(--foreground)]/35"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIntent(null)}
              className="ui-btn ui-btn-secondary inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Toutes les sections
            </button>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{active.title}</h2>
          </div>

          <nav
            className="flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-3"
            aria-label="Sections des réglages"
          >
            {INTENTS.map((item) => {
              const selected = item.id === intent;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIntent(item.id)}
                  className={[
                    "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                    selected
                      ? "bg-[var(--foreground)] text-[var(--accent-contrast)]"
                      : "text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
                  ].join(" ")}
                >
                  {item.title}
                </button>
              );
            })}
          </nav>

          {intent === "me" && (
            <div className="space-y-5">
              <DesktopStartupPanel />
              <AdminSettingsPanel hideChrome sections={["profile", "outlook"]} />
              <DeleteAccountPanel />
            </div>
          )}

          {intent === "look" && (
            <div className="space-y-5">
              <UiThemePanel />
            </div>
          )}

          {intent === "team" && (
            <div className="space-y-5">
              <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]/50 px-4 py-3 text-sm text-[color:var(--foreground)]/65">
                <strong className="font-semibold text-[var(--foreground)]">Membres</strong> =
                comptes qui se connectent.{" "}
                <strong className="font-semibold text-[var(--foreground)]">Collaborateurs</strong> =
                noms assignables sur une tâche.
              </p>
              <WorkspaceMembersPanel />
              <AdminSettingsPanel hideChrome sections={["collaborators"]} />
            </div>
          )}

          {intent === "space" && (
            <div className="space-y-5">
              <WorkspaceModulesPanel />
              <WorkspaceServicesPanel />
              <OrgLabelsPanel />
              <AdminSettingsPanel hideChrome sections={["identity"]} />
            </div>
          )}

          {intent === "lists" && (
            <div className="space-y-5">
              <AdminSettingsPanel
                hideChrome
                sections={["companies", "domains", "columns", "archive"]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
