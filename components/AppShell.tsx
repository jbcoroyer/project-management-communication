"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Settings2,
  UserCircle2,
  X,
} from "lucide-react";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import { ServiceCommunicationIdenaHeading } from "./IdenaBrand";

type AppShellProps = {
  children: ReactNode;
  toolbarRight?: ReactNode;
  searchSlot?: ReactNode;
  currentUserName?: string;
  currentUserEmail?: string;
  currentUserAvatarUrl?: string | null;
  currentUserJobTitle?: string | null;
};

const navItems = [
  { href: "/dashboard/kanban", label: "Tableau de bord", icon: LayoutGrid },
  { href: "/events/dashboard", label: "Événements", icon: CalendarRange },
  { href: "/social", label: "Réseaux sociaux", icon: Megaphone },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/ideas", label: "Boîte à idées", icon: Lightbulb },
  { href: "/settings", label: "Paramètres", icon: Settings2 },
] as const;

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/events/dashboard") return pathname.startsWith("/events");
  if (href === "/dashboard/kanban") return pathname === "/" || pathname.startsWith("/dashboard");
  if (href === "/stock") return pathname.startsWith("/stock");
  if (href === "/ideas") return pathname.startsWith("/ideas");
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
  if (!name && !email) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--line)]">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name ?? ""} fill sizes="36px" className="object-cover" />
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

export default function AppShell({
  children,
  toolbarRight,
  searchSlot,
  currentUserName,
  currentUserEmail,
  currentUserAvatarUrl,
  currentUserJobTitle,
}: AppShellProps) {
  const pathname = usePathname();
  const supabase = getSupabaseBrowser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const isGuest = !currentUserName && !currentUserEmail;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navLinkClass = (active: boolean) =>
    [
      "ui-transition flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium",
      active
        ? "bg-[var(--foreground)] text-[var(--accent-contrast)]"
        : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
    ].join(" ");

  const sidebarContent = (onNavClick?: () => void) => (
    <>
      <ServiceCommunicationIdenaHeading />
      <nav className="mt-6 flex-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={navLinkClass(active)}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
        {isGuest ? (
          <Link href="/login" className="ui-btn ui-btn-primary w-full text-xs" onClick={onNavClick}>
            Se connecter
          </Link>
        ) : (
          <>
            <UserCard
              name={currentUserName}
              email={currentUserEmail}
              avatarUrl={currentUserAvatarUrl}
              jobTitle={currentUserJobTitle}
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-5 lg:px-8">
        <aside
          className="fixed bottom-5 left-4 top-5 hidden w-[15.5rem] flex-col border-r border-[var(--line)] bg-[var(--background)] pr-4 lg:flex"
          style={{ zIndex: "var(--z-sidebar)" }}
        >
          {sidebarContent()}
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
              className="ui-surface fixed inset-y-0 left-0 flex w-72 max-w-[88vw] flex-col p-5 lg:hidden"
              style={{ zIndex: "calc(var(--z-overlay) + 1)" }}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <ServiceCommunicationIdenaHeading />
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="ui-btn ui-btn-ghost h-9 w-9 p-0"
                  aria-label="Fermer le menu"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">{sidebarContent(() => setMobileNavOpen(false))}</div>
            </aside>
          </>
        ) : null}

        <div className="min-w-0 lg:pl-[17rem]">
          <header className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--line)] pb-5 pr-24">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="ui-btn ui-btn-secondary h-10 w-10 p-0 lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={mobileNavOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <div className="min-w-[180px] flex-1">
              {searchSlot ?? (
                <div className="flex max-w-md items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
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
            {toolbarRight}
          </header>

          <main className="pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
