"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Calendar, dateFnsLocalizer, type SlotInfo } from "react-big-calendar";
import {
  addMonths,
  addWeeks,
  endOfDay,
  format,
  getDay,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  KanbanSquare,
  List,
  Megaphone,
  Plus,
  RefreshCcw,
  Search,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import CompanyAvatar from "../../components/CompanyAvatar";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { toastError, toastSuccess } from "../../lib/toast";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useReferenceData } from "../../lib/useReferenceData";
import { getSupabaseErrorMessage, useSocialPosts } from "../../lib/useSocialPosts";
import {
  socialPostStatuses,
  type SocialPost,
  type SocialPostDraft,
  type SocialPostMutation,
} from "../../lib/socialTypes";

import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { fr };
const SocialPostModal = dynamic(() => import("../../components/SocialPostModal"));
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1, locale: fr }),
  getDay,
  locales,
});

type DisplayMode = "month" | "week" | "list";

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: SocialPost;
};

type LinkedinFollowersApiResponse = {
  followersCount?: number;
  fetchedAt?: string;
  historicalStatsAvailable?: boolean;
  viewsAvailable?: boolean;
  monthDelta?: LinkedinMonthlyPoint | null;
  monthlySeries?: LinkedinMonthlyPoint[];
};

type LinkedinMonthlyPoint = {
  month: string;
  followersCount: number;
  deltaFollowers: number;
  deltaPercent: number | null;
};

type DisplayMonthlyPoint = LinkedinMonthlyPoint & {
  isEstimated?: boolean;
};

const statusClasses: Record<string, string> = {
  "Idée": "bg-slate-100 text-slate-700 border-slate-200",
  "Rédaction": "bg-amber-100 text-amber-800 border-amber-200",
  "À valider": "bg-violet-100 text-violet-800 border-violet-200",
  "Planifié": "bg-sky-100 text-sky-800 border-sky-200",
  "Publié": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Annulé": "bg-rose-100 text-rose-700 border-rose-200",
};

const statusEventColor: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {
  "Idée": { backgroundColor: "#e2e8f0", borderColor: "#cbd5e1", color: "#334155" },
  "Rédaction": { backgroundColor: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" },
  "À valider": { backgroundColor: "#ede9fe", borderColor: "#8b5cf6", color: "#5b21b6" },
  "Planifié": { backgroundColor: "#dbeafe", borderColor: "#3b82f6", color: "#1d4ed8" },
  "Publié": { backgroundColor: "#dcfce7", borderColor: "#16a34a", color: "#166534" },
  "Annulé": { backgroundColor: "#fee2e2", borderColor: "#ef4444", color: "#991b1b" },
};

function formatCalendarLabel(date: Date, mode: DisplayMode) {
  if (mode === "week") {
    return `Semaine du ${format(startOfWeek(date, { weekStartsOn: 1, locale: fr }), "d MMMM yyyy", { locale: fr })}`;
  }
  return format(date, "MMMM yyyy", { locale: fr });
}

function toTaskDescription(post: SocialPost) {
  const lines = [
    `Post RS: ${post.title}`,
    post.campaignLabel ? `Campagne: ${post.campaignLabel}` : "",
    post.targetNetworks.length > 0 ? `Réseaux: ${post.targetNetworks.join(", ")}` : "",
    post.format ? `Format: ${post.format}` : "",
    post.driveUrl ? `Lien: ${post.driveUrl}` : "",
    post.notes ?? "",
  ].filter(Boolean);
  return lines.join("\n");
}

export default function SocialPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { user: currentUser } = useCurrentUser();
  const { admins, companies, domains } = useReferenceData();
  const { posts, loading, schemaError, loadData, createPosts, updatePost, deletePost } =
    useSocialPosts();

  const [displayMode, setDisplayMode] = useState<DisplayMode>("month");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  // "ALL" = toutes les entités (vue globale)
  const [selectedEntityId, setSelectedEntityId] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [seedScheduledAt, setSeedScheduledAt] = useState<string | null>(null);
  const [isEntityMenuOpen, setIsEntityMenuOpen] = useState(false);
  const [linkedinFollowersCount, setLinkedinFollowersCount] = useState<number | null>(null);
  const [linkedinFollowersFetchedAt, setLinkedinFollowersFetchedAt] = useState<string | null>(null);
  const [linkedinMonthlySeries, setLinkedinMonthlySeries] = useState<LinkedinMonthlyPoint[]>([]);
  const [linkedinMonthDelta, setLinkedinMonthDelta] = useState<LinkedinMonthlyPoint | null>(null);
  const [linkedinHistoricalAvailable, setLinkedinHistoricalAvailable] = useState(false);
  const [linkedinViewsAvailable, setLinkedinViewsAvailable] = useState(false);
  const entityMenuRef = useRef<HTMLDivElement | null>(null);

  const currentMonthStart = useMemo(() => startOfMonth(calendarDate), [calendarDate]);

  const selectedEntity = useMemo(
    () => companies.find((company) => company.id === selectedEntityId) ?? null,
    [companies, selectedEntityId],
  );

  const isAllEntities = selectedEntityId === "ALL";

  const visiblePosts = useMemo(
    () => (isAllEntities ? posts : posts.filter((post) => post.companyId === selectedEntityId)),
    [posts, isAllEntities, selectedEntityId],
  );

  const companyLogoMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const company of companies) {
      map[company.id] = company.logoUrl ?? null;
    }
    return map;
  }, [companies]);

  useEffect(() => {
    if (!isEntityMenuOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (entityMenuRef.current && !entityMenuRef.current.contains(target)) {
        setIsEntityMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isEntityMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    const loadLinkedinFollowers = async () => {
      try {
        const response = await fetch("/api/social/linkedin-followers", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as LinkedinFollowersApiResponse;
        if (cancelled) return;
        if (typeof data.followersCount === "number") {
          setLinkedinFollowersCount(data.followersCount);
          setLinkedinFollowersFetchedAt(data.fetchedAt ?? new Date().toISOString());
        }
        setLinkedinMonthlySeries(Array.isArray(data.monthlySeries) ? data.monthlySeries : []);
        setLinkedinMonthDelta(data.monthDelta ?? null);
        setLinkedinHistoricalAvailable(Boolean(data.historicalStatsAvailable));
        setLinkedinViewsAvailable(Boolean(data.viewsAvailable));
      } catch {
        // No-op: leave widgets in loading/fallback state.
      }
    };

    void loadLinkedinFollowers();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter && post.status !== statusFilter) return false;
      if (!isAllEntities && post.companyId !== selectedEntityId) return false;
      if (networkFilter && !post.targetNetworks.includes(networkFilter)) return false;
      if (responsibleFilter && post.responsibleMemberId !== responsibleFilter) return false;
      if (companyFilter && post.companyId !== companyFilter) return false;
      if (!query) return true;
      const haystack = [
        post.title,
        post.campaignLabel,
        post.notes,
        post.companyName,
        post.responsibleName,
        post.targetNetworks.join(" "),
        post.thematic,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [posts, searchQuery, statusFilter, networkFilter, responsibleFilter, companyFilter, selectedEntityId, isAllEntities]);

  const displayFollowersCount = linkedinFollowersCount;
  const displayFollowersUpdatedAt = linkedinFollowersFetchedAt;
  const displayMonthlySeries = useMemo<DisplayMonthlyPoint[]>(
    () => linkedinMonthlySeries,
    [linkedinMonthlySeries],
  );

  const displayMonthDelta = useMemo<DisplayMonthlyPoint | null>(() => {
    if (linkedinMonthDelta) return linkedinMonthDelta;
    if (displayMonthlySeries.length === 0) return null;
    return displayMonthlySeries[displayMonthlySeries.length - 1];
  }, [linkedinMonthDelta, displayMonthlySeries]);

  const upcomingPosts = useMemo(() => {
    const now = Date.now();
    const base = visiblePosts.filter((post) => post.status !== "Annulé");

    const published = base
      .filter((post) => post.status === "Publié" && new Date(post.scheduledAt).getTime() <= now)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    const source = published.length > 0 ? published : base.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    return source.slice(0, 5);
  }, [visiblePosts]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return filteredPosts.map((post) => {
      const start = new Date(post.scheduledAt);
      const end = post.allDay ? endOfDay(start) : new Date(start.getTime() + 60 * 60 * 1000);
      return {
        id: post.id,
        title: post.title,
        start,
        end,
        allDay: post.allDay,
        resource: post,
      };
    });
  }, [filteredPosts]);

  const CalendarEventContent = ({ event }: { event: CalendarEvent }) => {
    const post = event.resource;
    return (
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {post.visualUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.visualUrl}
            alt="Visuel social"
            className="h-7 w-7 rounded-sm border border-[var(--line)] bg-white object-contain"
          />
        ) : (
          <Building2 className="h-6 w-6 text-[color:var(--foreground)]/40 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold leading-tight">{post.title}</p>
          <p className="truncate text-[10px] font-semibold opacity-80">{post.status}</p>
        </div>
        <button
          type="button"
          title="Supprimer le post"
          aria-label={`Supprimer ${post.title}`}
          onClick={(event) => {
            event.stopPropagation();
            void handleDeletePost(post);
          }}
          className="ui-transition ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const openCreateModal = (scheduledAt?: string) => {
    setEditingPost(null);
    setSeedScheduledAt(scheduledAt ?? new Date().toISOString());
    setIsModalOpen(true);
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const start = slotInfo.start instanceof Date ? slotInfo.start : new Date();
    openCreateModal(start.toISOString());
  };

  const handleSavePost = async (payload: { draft: SocialPostDraft; recurrenceCount: number }) => {
    try {
      if (payload.draft.id) {
        const { id, ...draft } = payload.draft;
        await updatePost(id, draft);
        toastSuccess("Post mis à jour");
        return;
      }

      const baseDraft = payload.draft;
      const items: SocialPostMutation[] = Array.from({ length: payload.recurrenceCount }, (_, index) => {
        const scheduledAt = new Date(baseDraft.scheduledAt);
        scheduledAt.setDate(scheduledAt.getDate() + index * 7);
        return {
          ...baseDraft,
          scheduledAt: scheduledAt.toISOString(),
          status: index === 0 ? baseDraft.status : "Idée",
          timeSpentHours: index === 0 ? baseDraft.timeSpentHours : 0,
        };
      });
      await createPosts(items);
      toastSuccess(payload.recurrenceCount > 1 ? "Série de posts créée" : "Post créé");
    } catch (error) {
      toastError(getSupabaseErrorMessage(error, "Impossible d'enregistrer le post"));
    }
  };

  const handleDeletePost = async (post: SocialPost) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Supprimer le post « ${post.title} » ?`);
      if (!confirmed) return;
    }
    try {
      await deletePost(post.id);
      toastSuccess("Post supprimé");
    } catch (error) {
      toastError(getSupabaseErrorMessage(error, "Impossible de supprimer le post"));
    }
  };

  const handleCreateKanbanTask = async (post: SocialPost) => {
    const adminName =
      post.responsibleName?.trim() ||
      currentUser?.teamMemberName?.trim() ||
      admins[0]?.name?.trim() ||
      "";
    if (!adminName) {
      toastError("Aucun collaborateur : ajoutez-en dans Paramètres ou définissez un responsable sur le post.");
      return;
    }
    const companyName = post.companyName ?? selectedEntity?.name ?? companies[0]?.name ?? "IDENA";
    const domainName = domains.find((item) => item.name.includes("General"))?.name ?? domains[0]?.name ?? "🌎 General";
    const workDate = format(new Date(post.scheduledAt), "yyyy-MM-dd");

    try {
      const { error } = await supabase.from("tasks").insert({
        project_name: `[RS] ${post.title}`,
        company: companyName,
        domain: domainName,
        admin: adminName,
        is_client_request: false,
        client_name: "",
        deadline: workDate,
        budget: "",
        description: toTaskDescription(post),
        column_id: "À faire",
        priority: "Moyenne",
        projected_work: [{ date: workDate, hours: 1 }],
        elapsed_ms: 0,
        is_running: false,
        last_start_time_ms: null,
        is_archived: false,
        estimated_hours: 1,
        estimated_days: 0,
      });
      if (error) throw error;
      toastSuccess("Tâche Kanban créée depuis le post");
    } catch (error) {
      toastError(getSupabaseErrorMessage(error, "Impossible de créer la tâche Kanban"));
    }
  };

  const toolbarRight = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void loadData()}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
      >
        <RefreshCcw className="h-4 w-4" />
        Actualiser
      </button>
      <button
        type="button"
        onClick={() => openCreateModal()}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)]"
      >
        <Plus className="h-4 w-4" />
        Nouveau post
      </button>
    </div>
  );

  const searchSlot = (
    <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <Search className="h-4 w-4 text-[color:var(--foreground)]/45" />
      <input
        type="text"
        placeholder="Rechercher un post, une campagne, un pilier..."
        aria-label="Recherche réseaux sociaux"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="ui-focus-ring w-full rounded-md bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
      />
    </div>
  );

  return (
    <AppShell
      toolbarRight={toolbarRight}
      searchSlot={searchSlot}
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      {!selectedEntityId ? (
        <section className="space-y-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/75">
              <Megaphone className="h-3.5 w-3.5" />
              Réseaux sociaux
            </div>
            <h1 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">Choisir une entité</h1>
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--foreground)]/65">
              Chaque entité dispose de son espace autonome : calendrier éditorial, dashboard et objectif mensuel dédiés.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => setSelectedEntityId(company.id)}
                className="ui-transition rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-[0_8px_24px_rgba(27,23,18,0.04)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]"
              >
                <div className="flex items-center gap-3">
                  <CompanyAvatar
                    name={company.name}
                    logoUrl={company.logoUrl}
                    className="h-10 w-10 rounded-md border border-[var(--line)] bg-white object-contain"
                    fallbackClassName="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/35"
                    iconClassName="h-5 w-5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">Entité</p>
                    <p className="mt-1 truncate text-base font-semibold text-[var(--foreground)]">{company.name}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : (
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/75">
              <Megaphone className="h-3.5 w-3.5" />
              Réseaux sociaux
            </div>
            <h1 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">Calendrier éditorial</h1>
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--foreground)]/65">
              Vue {isAllEntities ? "globale (toutes les entités)" : "spécifique à"}
              {!isAllEntities && (
                <strong className="ml-2 inline-flex items-center gap-2">
                  {selectedEntity?.logoUrl ? (
                    <CompanyAvatar
                      name={selectedEntity.name}
                      logoUrl={selectedEntity.logoUrl}
                      className="h-4 w-4 rounded-sm border border-[var(--line)] bg-white object-contain"
                      fallbackClassName="hidden"
                    />
                  ) : null}
                  {selectedEntity?.name}
                </strong>
              )}
              , avec suivi du volume mensuel, filtres opérationnels et pilotage éditorial complet.
            </p>
            {loading && <p className="mt-2 text-sm text-[color:var(--foreground)]/55">Chargement des données…</p>}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative" ref={entityMenuRef}>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                Entité
              </label>
              <button
                type="button"
                className="ui-transition ui-focus-ring flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/80 hover:bg-[var(--surface-soft)]"
                aria-expanded={isEntityMenuOpen}
                onClick={() => setIsEntityMenuOpen((v) => !v)}
              >
                {isAllEntities ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/35">
                    <Building2 className="h-4 w-4" />
                  </div>
                ) : (
                  <CompanyAvatar
                    name={selectedEntity?.name}
                    logoUrl={selectedEntity?.logoUrl}
                    className="h-8 w-8 rounded-md border border-[var(--line)] bg-white object-contain"
                    fallbackClassName="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/35"
                  />
                )}
                <span className="truncate">
                  {isAllEntities ? "Toutes les entités" : selectedEntity?.name ?? "Entité"}
                </span>
                <ChevronDown className="ml-auto h-4 w-4 text-[color:var(--foreground)]/55" />
              </button>

              {isEntityMenuOpen && (
                <div
                  className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEntityId("ALL");
                      setIsEntityMenuOpen(false);
                    }}
                    className={[
                      "ui-transition flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold",
                      isAllEntities
                        ? "bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
                        : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                    ].join(" ")}
                    role="menuitem"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/35">
                      <Building2 className="h-4 w-4" />
                    </div>
                    Toutes les entités
                  </button>

                  {companies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        setSelectedEntityId(company.id);
                        setIsEntityMenuOpen(false);
                      }}
                      className={[
                        "ui-transition flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold",
                        selectedEntityId === company.id
                          ? "bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
                          : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                      ].join(" ")}
                      role="menuitem"
                    >
                      <CompanyAvatar
                        name={company.name}
                        logoUrl={company.logoUrl}
                        className="h-8 w-8 rounded-md border border-[var(--line)] bg-white object-contain"
                        fallbackClassName="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/35"
                      />
                      <span className="truncate">{company.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-transparent select-none">
                Affichage
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1">
                {[
                  { id: "month" as const, label: "Mois", icon: CalendarDays },
                  { id: "week" as const, label: "Semaine", icon: Target },
                  { id: "list" as const, label: "Liste", icon: List },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDisplayMode(item.id)}
                      className={[
                        "ui-transition inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                        displayMode === item.id
                          ? "bg-[var(--accent)] text-[#fffdf9]"
                          : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {schemaError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Schéma Supabase manquant ou incomplet</p>
                <p className="mt-1">
                  {schemaError} Le fichier à exécuter est <code>SUPABASE_SOCIAL_MIGRATION.sql</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="order-2 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="ui-surface rounded-[24px] p-5">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
                Période analysée
              </p>
              <p className="mt-1 text-lg font-semibold capitalize text-[var(--foreground)]">
                {format(currentMonthStart, "MMMM yyyy", { locale: fr })}
              </p>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
                Tableau orienté statistiques LinkedIn externes (abonnés, historique, variations).
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Vues LinkedIn</p>
              <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
                {linkedinViewsAvailable
                  ? "Les vues sont disponibles."
                  : "Non disponible via la page publique LinkedIn. Il faut l&apos;API officielle LinkedIn (accès partenaire) pour automatiser les vues d&apos;entreprise."}
              </p>
              {!linkedinHistoricalAvailable && (
                <p className="mt-2 text-xs text-[color:var(--foreground)]/55">
                  Pour activer les variations mensuelles persistées, exécutez le script SQL <code>SUPABASE_LINKEDIN_METRICS_MIGRATION.sql</code>.
                </p>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Derniers posts</p>
              <div className="mt-3 space-y-3">
                {upcomingPosts.length === 0 && (
                  <p className="text-sm text-[color:var(--foreground)]/55">Aucun post à afficher.</p>
                )}
                {upcomingPosts.map((post) => (
                  <div key={post.id} className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {post.visualUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.visualUrl}
                          alt={post.title}
                          className="mt-0.5 h-8 w-8 rounded-md border border-[var(--line)] bg-white object-contain"
                        />
                      ) : (
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/35">
                          <Building2 className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{post.title}</p>
                      <p className="text-xs text-[color:var(--foreground)]/55">
                        {format(new Date(post.scheduledAt), post.allDay ? "d MMM yyyy" : "d MMM yyyy 'à' HH:mm", {
                          locale: fr,
                        })}
                      </p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClasses[post.status]}`}>
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ui-surface rounded-[24px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
              Statistiques LinkedIn
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[color:var(--foreground)]/60" />
                <p className="text-sm font-semibold text-[var(--foreground)]">Variation mensuelle abonnés</p>
              </div>
              {displayMonthDelta && !displayMonthDelta.isEstimated ? (
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
                      displayMonthDelta.deltaFollowers >= 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700",
                    ].join(" ")}
                  >
                    {displayMonthDelta.deltaFollowers >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {displayMonthDelta.deltaPercent == null
                      ? "n/a"
                      : `${displayMonthDelta.deltaFollowers >= 0 ? "+" : ""}${displayMonthDelta.deltaPercent.toFixed(1)}%`}
                  </span>
                  <span className="text-sm text-[color:var(--foreground)]/65">
                    {displayMonthDelta.deltaFollowers >= 0 ? "+" : ""}
                    {new Intl.NumberFormat("fr-FR").format(displayMonthDelta.deltaFollowers)} abonné(s) sur{" "}
                    {displayMonthDelta.month}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
                  Le suivi réel a démarré. La variation mensuelle s&apos;affichera automatiquement dès qu&apos;au moins 2
                  mois de snapshots sont disponibles.
                </p>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-100 p-4 shadow-[0_12px_30px_rgba(14,116,220,0.15)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center rounded-full border border-sky-300 bg-white/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800">
                    Abonnés LinkedIn
                  </p>
                  <p className="mt-2 text-5xl font-bold leading-none text-sky-900">
                    {displayFollowersCount != null ? new Intl.NumberFormat("fr-FR").format(displayFollowersCount) : "—"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-sky-900/80">
                    {displayFollowersUpdatedAt
                      ? `Dernière mise à jour : ${format(new Date(displayFollowersUpdatedAt), "d MMM yyyy", {
                          locale: fr,
                        })}`
                      : "Récupération automatique du compteur en cours."}
                  </p>
                </div>
                <a
                  href="https://www.linkedin.com/company/idena-nutritionanimale/"
                  target="_blank"
                  rel="noreferrer"
                  className="ui-transition mt-0.5 inline-flex items-center gap-1.5 self-start rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                >
                  Voir la page
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Historique abonnés (6 mois)</p>
              <div className="mt-3 space-y-2">
                {displayMonthlySeries.length === 0 && (
                  <p className="text-sm text-[color:var(--foreground)]/55">
                    Historique réel en cours de constitution (premier point collecté aujourd&apos;hui).
                  </p>
                )}
                {displayMonthlySeries.map((row) => (
                  <div
                    key={row.month}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2"
                  >
                    <span className="text-sm font-medium text-[var(--foreground)]">{row.month}</span>
                    <span className="text-right text-sm font-semibold text-[var(--foreground)]">
                      {new Intl.NumberFormat("fr-FR").format(row.followersCount)}
                    </span>
                    <span className="min-w-[52px] text-right text-xs text-[color:var(--foreground)]/65">
                      {row.deltaPercent == null
                        ? "n/a"
                        : `${row.deltaFollowers >= 0 ? "+" : ""}${row.deltaPercent.toFixed(1)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 ui-surface rounded-[24px] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarDate((prev) => (displayMode === "week" ? subWeeks(prev, 1) : subMonths(prev, 1)))}
                className="ui-transition flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date())}
                className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-soft)]"
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate((prev) => (displayMode === "week" ? addWeeks(prev, 1) : addMonths(prev, 1)))}
                className="ui-transition flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <p className="ml-2 text-base font-semibold capitalize text-[var(--foreground)]">
                {formatCalendarLabel(calendarDate, displayMode)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">Tous les statuts</option>
                {socialPostStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={networkFilter}
                onChange={(event) => setNetworkFilter(event.target.value)}
                className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">Tous les réseaux</option>
                {Array.from(new Set(posts.flatMap((post) => post.targetNetworks))).map((network) => (
                  <option key={network} value={network}>
                    {network}
                  </option>
                ))}
              </select>
              <select
                value={responsibleFilter}
                onChange={(event) => setResponsibleFilter(event.target.value)}
                className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">Tous les responsables</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
              </select>
              <select
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <option value="">Toutes les sociétés</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {displayMode !== "list" ? (
            <div className="h-[720px]">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                allDayAccessor="allDay"
                selectable
                date={calendarDate}
                onNavigate={setCalendarDate}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={(event) => {
                  setEditingPost((event as CalendarEvent).resource);
                  setSeedScheduledAt(null);
                  setIsModalOpen(true);
                }}
                view={displayMode === "week" ? "week" : "month"}
                views={["month", "week"]}
                toolbar={false}
                components={{ event: CalendarEventContent }}
                culture="fr"
                eventPropGetter={(event) => {
                  const color = statusEventColor[(event as CalendarEvent).resource.status] ?? statusEventColor["Idée"];
                  return {
                    style: {
                      backgroundColor: color.backgroundColor,
                      borderLeft: `4px solid ${color.borderColor}`,
                      borderRadius: "10px",
                      color: color.color,
                      boxShadow: "none",
                      padding: "2px 4px",
                    },
                  };
                }}
                messages={{
                  next: "Suivant",
                  previous: "Précédent",
                  today: "Aujourd'hui",
                  month: "Mois",
                  week: "Semaine",
                  agenda: "Liste",
                  date: "Date",
                  time: "Heure",
                  event: "Événement",
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-[color:var(--foreground)]/55">
                  Aucun post ne correspond aux filtres actuels.
                </div>
              )}
              {filteredPosts
                .slice()
                .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
                .map((post) => (
                  <article
                    key={post.id}
                    className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_rgba(27,23,18,0.04)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-[var(--foreground)]">{post.title}</h3>
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClasses[post.status]}`}>
                            {post.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[color:var(--foreground)]/60">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            {format(new Date(post.scheduledAt), post.allDay ? "d MMMM yyyy" : "d MMMM yyyy 'à' HH:mm", {
                              locale: fr,
                            })}
                          </span>
                          {post.responsibleName && (
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="h-4 w-4" />
                              {post.responsibleName}
                            </span>
                          )}
                          {post.companyName && (
                            <span className="inline-flex items-center gap-1.5">
                              <CompanyAvatar
                                name={post.companyName}
                                logoUrl={post.companyId ? companyLogoMap[post.companyId] : null}
                                className="h-4 w-4 rounded-sm border border-[var(--line)] bg-white object-contain"
                                fallbackClassName="flex h-4 w-4 items-center justify-center text-[color:var(--foreground)]/60"
                              />
                              {post.companyName}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {post.targetNetworks.map((network) => (
                            <span key={network} className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/70">
                              {network}
                            </span>
                          ))}
                          {post.thematic && (
                            <span className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/75">
                              {post.thematic}
                            </span>
                          )}
                        </div>
                        {(post.notes ||
                          post.objective ||
                          post.wording ||
                          post.wordingEn ||
                          post.publicationStatus ||
                          post.reactionsCount != null ||
                          post.engagementRate != null ||
                          post.impressionsCount != null ||
                          post.followersCount != null) && (
                          <div className="mt-3 space-y-1 text-sm text-[color:var(--foreground)]/65">
                            {post.format && <p><strong>Format :</strong> {post.format}</p>}
                            {post.objective && <p><strong>Objectif :</strong> {post.objective}</p>}
                            {post.wording && <p><strong>Wording FR :</strong> {post.wording}</p>}
                            {post.wordingEn && <p><strong>Wording EN :</strong> {post.wordingEn}</p>}
                            {post.publicationStatus && <p><strong>Statut publication :</strong> {post.publicationStatus}</p>}
                            {post.reactionsCount != null && <p><strong>Réactions :</strong> {post.reactionsCount}</p>}
                            {post.engagementRate != null && <p><strong>Taux d&apos;engagement :</strong> {post.engagementRate}%</p>}
                            {post.impressionsCount != null && <p><strong>Impressions :</strong> {post.impressionsCount}</p>}
                            {post.followersCount != null && <p><strong>Nombre d&apos;abonnés :</strong> {post.followersCount}</p>}
                            {post.notes && <p className="whitespace-pre-wrap">{post.notes}</p>}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(post);
                            setSeedScheduledAt(null);
                            setIsModalOpen(true);
                          }}
                          className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCreateKanbanTask(post)}
                          className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
                        >
                          <KanbanSquare className="h-4 w-4" />
                          Créer une tâche
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeletePost(post)}
                          className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </div>
      </section>
      )}

      <SocialPostModal
        open={isModalOpen}
        initialPost={editingPost}
        seedScheduledAt={seedScheduledAt}
        defaultResponsibleMemberId={currentUser?.teamMemberId ?? admins[0]?.id ?? null}
        forcedCompanyId={isAllEntities ? undefined : selectedEntityId}
        forcedCompanyName={isAllEntities ? undefined : selectedEntity?.name}
        admins={admins}
        companies={companies}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPost(null);
          setSeedScheduledAt(null);
        }}
        onSubmit={handleSavePost}
      />
    </AppShell>
  );
}
