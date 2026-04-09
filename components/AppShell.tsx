"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, LayoutGrid, LogOut, Megaphone, Package, Settings2, UserCircle2 } from "lucide-react";
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
  { href: "/", label: "Tableau de bord", icon: LayoutGrid },
  { href: "/events/dashboard", label: "Événements", icon: CalendarRange },
  { href: "/social", label: "Réseaux sociaux", icon: Megaphone },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/settings", label: "Paramètres", icon: Settings2 },
];

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-6">
        {/* Sidebar */}
        <aside className="ui-surface fixed bottom-4 left-6 top-6 z-30 hidden w-60 flex-col rounded-2xl p-4 lg:flex">
          <ServiceCommunicationIdenaHeading />

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/events/dashboard"
                  ? pathname.startsWith("/events")
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "ui-transition flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm",
                    active
                      ? "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/75 shadow-[0_6px_20px_rgba(28,24,20,0.07)]"
                      : "border-transparent text-[color:var(--foreground)]/65 hover:border-[var(--line)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bas de sidebar : profil connecté */}
          <div className="mt-auto space-y-2">
            {(currentUserName || currentUserEmail) && (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface)]">
                    {currentUserAvatarUrl ? (
                      <Image
                        src={currentUserAvatarUrl}
                        alt={currentUserName ?? ""}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <UserCircle2 className="m-auto h-6 w-6 text-[color:var(--foreground)]/35" />
                    )}
                  </div>
                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {currentUserName ?? currentUserEmail}
                    </p>
                    {currentUserJobTitle && (
                      <p className="truncate text-[11px] text-[color:var(--foreground)]/55">
                        {currentUserJobTitle}
                      </p>
                    )}
                    {currentUserEmail && (
                      <p className="truncate text-[10px] text-[color:var(--foreground)]/40">
                        {currentUserEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Déconnexion */}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="ui-transition flex w-full items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-medium text-[color:var(--foreground)]/65 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-[16rem]">
          <header className="ui-surface mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
            <div className="min-w-[260px] flex-1">
              {searchSlot ?? (
                <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                  <span className="h-4 w-4 text-[color:var(--foreground)]/45">⌕</span>
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
