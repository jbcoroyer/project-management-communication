"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  FolderOpen,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Settings2,
  UserCircle2,
  X,
  type LucideIcon,
} from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { resolveAdminAvatarUrl, useAdminAvatarMap } from "../../lib/adminAvatarContext";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { TuesdaySplash } from "@/components/brand";
import { ServiceCommunicationIdenaHeading } from "../IdenaBrand";
import V3GlobalSearch from "./GlobalSearch";

type V3AppShellProps = {
  children: ReactNode;
  toolbarRight?: ReactNode;
  searchSlot?: ReactNode;
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
      { href: "/v3/dashboard/kanban", label: "Tableau", hint: "Kanban & vues", icon: LayoutGrid },
      { href: "/v3/deliverables", label: "Livrables", hint: "Rendus finaux", icon: PackageCheck },
    ],
  },
  {
    id: "contenu",
    label: "Contenu",
    items: [
      { href: "/v3/events/dashboard", label: "Événements", hint: "Salons & retex", icon: CalendarRange },
      { href: "/v3/dam", label: "Médias", hint: "Bibliothèque", icon: FolderOpen },
      { href: "/v3/ideas", label: "Idées", hint: "Boîte à idées", icon: Lightbulb },
    ],
  },
  {
    id: "outils",
    label: "Outils",
    items: [
      { href: "/v3/stock", label: "Stock", hint: "Inventaire", icon: Package },
      { href: "/v3/settings", label: "Réglages", hint: "Paramètres", icon: Settings2 },
    ],
  },
];

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/v3/events/dashboard") return pathname.startsWith("/v3/events");
  if (href === "/v3/dashboard/kanban") {
    return pathname === "/v3" || pathname.startsWith("/v3/dashboard");
  }
  if (href === "/v3/stock") return pathname.startsWith("/v3/stock");
  if (href === "/v3/ideas") return pathname.startsWith("/v3/ideas");
  if (href === "/v3/dam") return pathname.startsWith("/v3/dam");
  if (href === "/v3/deliverables") return pathname.startsWith("/v3/deliverables");
  return pathname === href || pathname.startsWith(`${href}/`);
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
    <div className="flex items-center gap-2.5 px-1 py-1">
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--line)]">
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
            <UserCircle2 className="h-4 w-4 text-[color:var(--foreground)]/35" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--foreground)]">{name ?? email}</p>
        {jobTitle ? (
          <p className="truncate text-[11px] text-[color:var(--foreground)]/45">{jobTitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function V3AppShell({ children, toolbarRight, searchSlot }: V3AppShellProps) {
  const pathname = usePathname();
  const supabase = getSupabaseBrowser();
  const { user, loading: userLoading } = useCurrentUser();
  // Splash uniquement sur l’auth — ne pas attendre le fetch global des tâches
  // (sinon stock/DAM/settings restent bloqués et le shell re-rend à chaque mutation).
  const splashReady = !userLoading;
  const avatarMap = useAdminAvatarMap();
  const displayName = user?.teamMemberName ?? user?.displayName ?? undefined;
  const displayEmail = user?.email;
  const displayJob = user?.jobTitle;
  const displayAvatar =
    user?.avatarUrl ?? (displayName ? resolveAdminAvatarUrl(avatarMap, displayName) : null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sections = NAV_SECTIONS;

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

  const sidebarContent = (onNavClick?: () => void, { showBrand = true }: { showBrand?: boolean } = {}) => (
    <>
      {showBrand ? (
        <div className="pb-1">
          <ServiceCommunicationIdenaHeading />
        </div>
      ) : null}

      <nav
        className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]"
        aria-label="Navigation V3"
      >
        {sections.map((section) => (
          <div key={section.id}>
            <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[color:var(--foreground)]/35">
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
                      "ui-transition group flex items-center gap-2.5 rounded-lg px-2.5 py-2",
                      active
                        ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[var(--line)]"
                        : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]/80 hover:text-[var(--foreground)]",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-4 w-4 shrink-0",
                        active ? "text-[var(--accent)]" : "opacity-70",
                      ].join(" ")}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
                      <span
                        className={[
                          "mt-0.5 block truncate text-[10.5px]",
                          active ? "text-[color:var(--foreground)]/45" : "text-[color:var(--foreground)]/35",
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

      <div className="mt-3 shrink-0 space-y-1.5 border-t border-[var(--line)]/70 pt-3">
        {userLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-soft)]" aria-hidden />
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
              className="ui-btn ui-btn-ghost h-8 w-full justify-start px-2.5 text-[11px] text-[color:var(--foreground)]/55"
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
      <TuesdaySplash ready={splashReady} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 8% -8%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 58%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1680px] px-4 py-4 lg:px-7">
        <aside
          className="fixed bottom-4 left-4 top-4 hidden w-[15.75rem] flex-col pr-3 lg:flex"
          style={{ zIndex: "var(--z-sidebar)" }}
        >
          {sidebarContent()}
        </aside>

        {mobileNavOpen ? (
          <>
            <button
              type="button"
              aria-label="Fermer le menu"
              className="fixed inset-0 bg-[var(--foreground)]/20 backdrop-blur-sm lg:hidden"
              style={{ zIndex: "var(--z-overlay)" }}
              onClick={() => setMobileNavOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation principale"
              className="fixed inset-y-0 left-0 flex w-72 max-w-[88vw] flex-col border-r border-[var(--line)] bg-[var(--background)] p-4 lg:hidden"
              style={{ zIndex: "calc(var(--z-overlay) + 1)" }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <ServiceCommunicationIdenaHeading intro={false} />
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="ui-btn ui-btn-ghost h-8 w-8 p-0"
                  aria-label="Fermer le menu"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                {sidebarContent(() => setMobileNavOpen(false), { showBrand: false })}
              </div>
            </aside>
          </>
        ) : null}

        <div className="min-w-0 lg:pl-[16.75rem]">
          <header className="mb-6 flex h-10 items-center gap-2.5 border-b border-[var(--line)]/60 pb-4">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/70 lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={mobileNavOpen}
            >
              <Menu className="h-4 w-4" aria-hidden />
            </button>

            <div className="min-w-0 flex-1">
              {searchSlot ?? <V3GlobalSearch />}
            </div>
            <div className="flex h-9 shrink-0 items-center gap-1.5">{toolbarRight}</div>
          </header>

          <main className="pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
