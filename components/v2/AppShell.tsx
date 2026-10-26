"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  FolderOpen,
  Inbox,
  LayoutGrid,
  Lightbulb,
  ListTodo,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Send,
  Settings2,
  Target,
  UserCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { resolveAdminAvatarUrl, useAdminAvatarMap } from "../../lib/adminAvatarContext";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { ServiceCommunicationIdenaHeading } from "../IdenaBrand";

type V2AppShellProps = {
  children: ReactNode;
  toolbarRight?: ReactNode;
  searchSlot?: ReactNode;
  currentUserName?: string;
  currentUserEmail?: string;
  currentUserAvatarUrl?: string | null;
  currentUserJobTitle?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "travail",
    label: "Travail",
    items: [
      { href: "/v2/dashboard/kanban", label: "Tableau", hint: "Kanban & vues", icon: LayoutGrid },
      { href: "/v2/todo", label: "Espace", hint: "Agenda du jour", icon: ListTodo },
      { href: "/v2/planning", label: "Planning", hint: "Semaine & charge", icon: CalendarDays },
      { href: "/v2/okr", label: "Objectifs", hint: "OKR", icon: Target },
    ],
  },
  {
    id: "demandes",
    label: "Demandes",
    items: [
      { href: "/v2/asks", label: "Nouvelle", hint: "Formulaire", icon: Send },
      { href: "/v2/dashboard/triage", label: "Triage", hint: "À qualifier", icon: Inbox },
    ],
  },
  {
    id: "contenu",
    label: "Contenu",
    items: [
      { href: "/v2/events/dashboard", label: "Événements", hint: "Salons & retex", icon: CalendarRange },
      { href: "/v2/social", label: "Social", hint: "Studio", icon: Megaphone },
      { href: "/v2/dam", label: "Médias", hint: "Bibliothèque", icon: FolderOpen },
      { href: "/v2/ideas", label: "Idées", hint: "Votes", icon: Lightbulb },
    ],
  },
  {
    id: "outils",
    label: "Outils",
    items: [
      { href: "/v2/stock", label: "Stock", hint: "Inventaire", icon: Package },
      { href: "/v2/settings", label: "Réglages", hint: "Règles", icon: Settings2 },
    ],
  },
];

const SURVEY_ITEM: NavItem = {
  href: "/questionnaire/reponses",
  label: "Enquêtes",
  hint: "Réponses",
  icon: ClipboardList,
};

function sectionsFor(isAdmin: boolean): NavSection[] {
  if (!isAdmin) return NAV_SECTIONS;
  return NAV_SECTIONS.map((section) =>
    section.id === "outils" ? { ...section, items: [...section.items, SURVEY_ITEM] } : section,
  );
}

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/v2/events/dashboard") return pathname.startsWith("/v2/events");
  if (href === "/v2/dashboard/triage") return pathname === "/v2/dashboard/triage";
  if (href === "/v2/asks") return pathname === "/v2/asks";
  if (href === "/v2/dashboard/kanban") {
    return (
      pathname === "/v2" ||
      (pathname.startsWith("/v2/dashboard") && pathname !== "/v2/dashboard/triage")
    );
  }
  if (href === "/v2/stock") return pathname.startsWith("/v2/stock");
  if (href === "/v2/ideas") return pathname.startsWith("/v2/ideas");
  if (href === "/questionnaire/reponses") return pathname.startsWith("/questionnaire/reponses");
  return pathname === href;
}

function UserCard({
  name,
  email,
  avatarUrl,
  jobTitle,
}: {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
}) {
  const [broken, setBroken] = useState(false);
  if (!name && !email) return null;
  const showPhoto = Boolean(avatarUrl) && !broken;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-[var(--line)]">
          {showPhoto ? (
            <img
              src={avatarUrl!}
              alt={name ?? ""}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--surface-soft)]">
              <UserCircle2 className="h-5 w-5 text-[color:var(--foreground)]/35" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{name ?? email}</p>
          {jobTitle ? (
            <p className="truncate text-[11px] text-[color:var(--foreground)]/50">{jobTitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Identity() {
  return (
    <div className="space-y-3">
      <ServiceCommunicationIdenaHeading />
      <p className="w-fit rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
        Interface V2
      </p>
    </div>
  );
}

export default function V2AppShell({
  children,
  toolbarRight,
  searchSlot,
  currentUserName,
  currentUserEmail,
  currentUserAvatarUrl,
  currentUserJobTitle,
}: V2AppShellProps) {
  const pathname = usePathname();
  const supabase = getSupabaseBrowser();
  const { user, loading: userLoading } = useCurrentUser();
  const avatarMap = useAdminAvatarMap();
  const displayName =
    currentUserName ?? user?.teamMemberName ?? user?.displayName ?? undefined;
  const displayEmail = currentUserEmail ?? user?.email;
  const displayJob = currentUserJobTitle ?? user?.jobTitle;
  const displayAvatar =
    currentUserAvatarUrl ??
    user?.avatarUrl ??
    (displayName ? resolveAdminAvatarUrl(avatarMap, displayName) : null);
  const isAdmin = Boolean(user?.isAdmin);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sections = sectionsFor(isAdmin);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileNavOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const isGuest = !userLoading && !displayName && !displayEmail;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navBlock = (onNavClick?: () => void) => (
    <>
      <nav
        className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]"
        aria-label="Navigation V2"
      >
        {sections.map((section) => (
          <div key={section.id}>
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--foreground)]/40">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "ui-transition flex items-center gap-2.5 rounded-xl px-2 py-1.5",
                      active
                        ? "bg-[var(--foreground)] text-[var(--accent-contrast)] shadow-[var(--shadow-1)]"
                        : "text-[color:var(--foreground)]/75 hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-[var(--accent-contrast)]/15" : "bg-[var(--surface-soft)]",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight">{item.label}</span>
                      <span
                        className={[
                          "mt-0.5 block truncate text-[10px]",
                          active ? "text-[var(--accent-contrast)]/70" : "text-[color:var(--foreground)]/45",
                        ].join(" ")}
                      >
                        {item.hint}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-3 shrink-0 space-y-2 border-t border-[var(--line)] pt-3">
        {userLoading ? (
          <div className="h-[52px] animate-pulse rounded-2xl bg-[var(--surface-soft)]" aria-hidden />
        ) : isGuest ? (
          <Link href="/login" className="ui-btn ui-btn-primary w-full text-xs" onClick={onNavClick}>
            Se connecter
          </Link>
        ) : (
          <>
            <UserCard
              name={displayName}
              email={displayEmail}
              avatarUrl={displayAvatar}
              jobTitle={displayJob}
            />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="ui-btn ui-btn-ghost w-full justify-start text-xs"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Se déconnecter
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 12% -10%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 60%), radial-gradient(ellipse 55% 40% at 92% 8%, color-mix(in oklab, var(--foreground) 5%, transparent), transparent 55%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1680px] px-4 py-5 lg:px-8">
        <aside
          className="fixed bottom-5 left-4 top-5 hidden w-[18rem] min-h-0 flex-col overflow-hidden lg:flex"
          style={{ zIndex: "var(--z-sidebar)" }}
        >
          <div className="shrink-0">
            <Identity />
          </div>
          {navBlock()}
        </aside>

        {mobileNavOpen ? (
          <>
            <button
              type="button"
              aria-label="Fermer le menu"
              className="fixed inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm lg:hidden"
              style={{ zIndex: "var(--z-overlay)" }}
              onClick={() => setMobileNavOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation principale"
              className="ui-surface fixed inset-y-0 left-0 flex w-[20rem] max-w-[90vw] flex-col p-5 lg:hidden"
              style={{ zIndex: "calc(var(--z-overlay) + 1)" }}
            >
              <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
                <Identity />
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="ui-btn ui-btn-ghost h-9 w-9 p-0"
                  aria-label="Fermer le menu"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{navBlock(() => setMobileNavOpen(false))}</div>
            </aside>
          </>
        ) : null}

        <div className="min-w-0 lg:pl-[19.25rem]">
          <header className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--line)]/80 pb-5 pr-24">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="ui-btn ui-btn-secondary h-11 w-11 rounded-2xl p-0 lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={mobileNavOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <div className="min-w-[180px] flex-1">
              {searchSlot ?? (
                <div className="flex max-w-lg items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/90 px-4 py-2.5 shadow-[var(--shadow-1)] backdrop-blur-sm">
                  <span className="text-sm text-[color:var(--foreground)]/40" aria-hidden>
                    ⌕
                  </span>
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    aria-label="Recherche globale"
                    className="ui-focus-ring w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40 focus:outline-none"
                  />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">{toolbarRight}</div>
          </header>

          <main className="pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
