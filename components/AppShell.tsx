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
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface)]">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name ?? ""} fill sizes="40px" className="object-cover" />
          ) : (
            <UserCircle2 className="m-auto h-6 w-6 text-[color:var(--foreground)]/35" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{name ?? email}</p>
          {jobTitle && (
            <p className="truncate text-[11px] text-[color:var(--foreground)]/55">{jobTitle}</p>
          )}
          {email && (
            <p className="truncate text-[10px] text-[color:var(--foreground)]/40">{email}</p>
          )}
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

  // Bloquer le scroll body quand le drawer est ouvert
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

  // Échap pour fermer
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navLinkClass = (active: boolean) =>
    [
      "ui-transition flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm",
      active
        ? "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/75 shadow-[0_6px_20px_rgba(28,24,20,0.07)]"
        : "border-transparent text-[color:var(--foreground)]/65 hover:border-[var(--line)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
    ].join(" ");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-6">
        {/* Sidebar desktop ≥ lg */}
        <aside
          className="ui-surface fixed bottom-4 left-6 top-6 hidden w-60 flex-col rounded-2xl p-4 lg:flex"
          style={{ zIndex: "var(--z-sidebar)" }}
        >
          <ServiceCommunicationIdenaHeading />

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href, pathname);
              return (
                <Link key={item.href} href={item.href} className={navLinkClass(active)}>
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2">
            <UserCard
              name={currentUserName}
              email={currentUserEmail}
              avatarUrl={currentUserAvatarUrl}
              jobTitle={currentUserJobTitle}
            />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="ui-transition flex w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)]/65 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Se déconnecter
            </button>
          </div>
        </aside>

        {/* Drawer mobile < lg */}
        {mobileNavOpen && (
          <>
            <button
              type="button"
              aria-label="Fermer le menu"
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm lg:hidden"
              style={{ zIndex: "var(--z-overlay)" }}
              onClick={() => setMobileNavOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation principale"
              className="ui-surface fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col rounded-none rounded-r-2xl p-4 shadow-[0_24px_80px_rgba(20,17,13,0.22)] lg:hidden"
              style={{ zIndex: "calc(var(--z-overlay) + 1)" }}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <ServiceCommunicationIdenaHeading />
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="ui-transition shrink-0 rounded-lg p-1.5 text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                  aria-label="Fermer le menu"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.href, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={navLinkClass(active)}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-2">
                <UserCard
                  name={currentUserName}
                  email={currentUserEmail}
                  avatarUrl={currentUserAvatarUrl}
                  jobTitle={currentUserJobTitle}
                />
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="ui-transition flex w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)]/65 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Se déconnecter
                </button>
              </div>
            </aside>
          </>
        )}

        <div className="min-w-0 flex-1 lg:pl-[16rem]">
          <header className="ui-surface mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
            {/* Burger mobile uniquement */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="ui-transition flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/70 hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={mobileNavOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <div className="min-w-[180px] flex-1">
              {searchSlot ?? (
                <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                  <span className="h-4 w-4 text-[color:var(--foreground)]/45" aria-hidden>
                    ⌕
                  </span>
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    aria-label="Recherche globale"
                    className="ui-focus-ring w-full rounded-md bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
                  />
                </div>
              )}
            </div>
            {toolbarRight}
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
