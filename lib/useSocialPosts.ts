"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import type { SocialMonthlyTarget, SocialPost, SocialPostMutation, SocialPostStatus } from "./socialTypes";

const SOCIAL_POST_SELECT = [
  "id",
  "title",
  "scheduled_at",
  "all_day",
  "status",
  "target_networks",
  "format",
  "notes",
  "drive_url",
  "responsible_member_id",
  "company_id",
  "campaign_label",
  "thematic",
  "objective",
  "wording",
  "wording_en",
  "visual_url",
  "publication_status",
  "time_spent_hours",
  "reactions_count",
  "engagement_rate",
  "impressions_count",
  "followers_count",
  "created_at",
  "updated_at",
  "team_members:responsible_member_id(display_name)",
  "companies:company_id(name)",
].join(",");

type SocialPostRow = {
  id: string;
  title: string | null;
  scheduled_at: string;
  all_day: boolean | null;
  status: string;
  target_networks: string[] | null;
  format: string | null;
  notes: string | null;
  drive_url: string | null;
  responsible_member_id: string | null;
  company_id: string | null;
  campaign_label: string | null;
  thematic: string | null;
  objective: string | null;
  wording: string | null;
  wording_en: string | null;
  visual_url: string | null;
  publication_status: string | null;
  time_spent_hours: number | null;
  reactions_count: number | null;
  engagement_rate: number | null;
  impressions_count: number | null;
  followers_count: number | null;
  created_at?: string;
  updated_at?: string;
  team_members?: { display_name?: string | null } | null;
  companies?: { name?: string | null } | null;
};

type SocialTargetRow = {
  company_id: string;
  year: number;
  month: number;
  target_count: number;
};

function normalizeStatus(raw: string): SocialPostStatus {
  switch (raw) {
    case "Idée":
    case "Rédaction":
    case "À valider":
    case "Planifié":
    case "Publié":
    case "Annulé":
      return raw;
    default:
      return "Idée";
  }
}

function mapSocialPostRow(row: SocialPostRow): SocialPost {
  return {
    id: row.id,
    title: row.title ?? "",
    scheduledAt: row.scheduled_at,
    allDay: row.all_day ?? true,
    status: normalizeStatus(row.status),
    targetNetworks: Array.isArray(row.target_networks) ? row.target_networks : [],
    format: row.format ?? null,
    notes: row.notes ?? null,
    driveUrl: row.drive_url ?? null,
    responsibleMemberId: row.responsible_member_id,
    responsibleName: row.team_members?.display_name ?? null,
    companyId: row.company_id,
    companyName: row.companies?.name ?? null,
    campaignLabel: row.campaign_label ?? null,
    thematic: row.thematic ?? null,
    objective: row.objective ?? null,
    wording: row.wording ?? null,
    wordingEn: row.wording_en ?? null,
    visualUrl: row.visual_url ?? null,
    publicationStatus: row.publication_status ?? null,
    timeSpentHours: row.time_spent_hours ?? 0,
    reactionsCount: row.reactions_count ?? null,
    engagementRate: row.engagement_rate ?? null,
    impressionsCount: row.impressions_count ?? null,
    followersCount: row.followers_count ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSocialTargetRow(row: SocialTargetRow): SocialMonthlyTarget {
  return {
    companyId: row.company_id,
    year: row.year,
    month: row.month,
    targetCount: row.target_count,
  };
}

function formatSupabaseErrorMessage(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null;
  if (error.code === "42P01") {
    return "Les tables Réseaux sociaux n'existent pas encore. Exécutez le fichier SUPABASE_SOCIAL_MIGRATION.sql dans Supabase.";
  }
  return error.message ?? "Une erreur Supabase est survenue.";
}

export function getSupabaseErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string };
    if (candidate.message?.toLowerCase().includes("row-level security")) {
      return "Accès refusé par la sécurité Supabase (RLS). Reconnectez-vous puis réessayez.";
    }
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (value): value is string => Boolean(value && value.trim()),
    );
    if (parts.length > 0) {
      return parts.join(" ");
    }
    if (candidate.code === "PGRST301" || candidate.code === "401") {
      return "Session Supabase non reconnue pour l'écriture. Reconnectez-vous puis réessayez.";
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function useSocialPosts() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [targets, setTargets] = useState<SocialMonthlyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    const result = await supabase
      .from("social_posts")
      .select(SOCIAL_POST_SELECT)
      .order("scheduled_at", { ascending: true })
      .limit(1000);
    return result;
  }, [supabase]);

  const fetchTargets = useCallback(async () => {
    const result = await supabase
      .from("social_monthly_targets")
      .select("company_id, year, month, target_count")
      .order("year", { ascending: true })
      .order("month", { ascending: true });
    return result;
  }, [supabase]);

  const upsertPost = useCallback((nextPost: SocialPost) => {
    setPosts((prev) => {
      const index = prev.findIndex((post) => post.id === nextPost.id);
      if (index === -1) {
        return [...prev, nextPost].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      }
      const next = [...prev];
      next[index] = nextPost;
      return next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    });
  }, []);

  const replaceTargets = useCallback((rows: SocialTargetRow[]) => {
    setTargets(rows.map(mapSocialTargetRow));
  }, []);

  const loadPostById = useCallback(
    async (id: string) => {
      const { data, error } = await supabase
        .from("social_posts")
        .select(SOCIAL_POST_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setPosts((prev) => prev.filter((post) => post.id !== id));
        return null;
      }
      const mapped = mapSocialPostRow(data as SocialPostRow);
      upsertPost(mapped);
      return mapped;
    },
    [supabase, upsertPost],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [postsRes, targetsRes] = await Promise.all([fetchPosts(), fetchTargets()]);
      const nextError = formatSupabaseErrorMessage(postsRes.error ?? targetsRes.error);
      setSchemaError(nextError);

      if (!postsRes.error && !targetsRes.error) {
        const socialRows = ((postsRes.data ?? []) as unknown as SocialPostRow[]).map(mapSocialPostRow);
        const targetRows = (targetsRes.data ?? []) as SocialTargetRow[];
        setPosts(socialRows);
        replaceTargets(targetRows);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchPosts, fetchTargets, replaceTargets]);

  useEffect(() => {
    let active = true;
    void loadData().catch(() => {
      if (!active) return;
      setSchemaError("Impossible de charger les données Réseaux sociaux.");
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("social-shared-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_posts" },
        (payload: { eventType?: string; old?: { id?: string }; new?: unknown }) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id as string | undefined;
            if (!deletedId) return;
            setPosts((prev) => prev.filter((post) => post.id !== deletedId));
            return;
          }

          const rowId =
            typeof payload.new === "object" && payload.new !== null && "id" in payload.new
              ? String((payload.new as { id?: string }).id ?? "")
              : "";
          if (!rowId) return;
          void loadPostById(rowId).catch(() => {});
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "social_monthly_targets" }, () => {
        void fetchTargets()
          .then((targetsRes) => {
            const nextError = formatSupabaseErrorMessage(targetsRes.error);
            setSchemaError(nextError);
            if (!targetsRes.error) {
              replaceTargets((targetsRes.data ?? []) as SocialTargetRow[]);
            }
          })
          .catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTargets, loadPostById, replaceTargets, supabase]);

  const createPosts = useCallback(async (payloads: SocialPostMutation[]) => {
    const rows = payloads.map((item) => ({
      title: item.title.trim(),
      scheduled_at: item.scheduledAt,
      all_day: item.allDay,
      status: item.status,
      target_networks: item.targetNetworks,
      format: item.format?.trim() || null,
      notes: item.notes?.trim() || null,
      drive_url: item.driveUrl?.trim() || null,
      responsible_member_id: item.responsibleMemberId,
      company_id: item.companyId,
      campaign_label: item.campaignLabel?.trim() || null,
      thematic: item.thematic?.trim() || null,
      objective: item.objective?.trim() || null,
      wording: item.wording?.trim() || null,
      wording_en: item.wordingEn?.trim() || null,
      visual_url: item.visualUrl?.trim() || null,
      publication_status: item.publicationStatus?.trim() || null,
      time_spent_hours: item.timeSpentHours,
      reactions_count: item.reactionsCount,
      engagement_rate: item.engagementRate,
      impressions_count: item.impressionsCount,
      followers_count: item.followersCount,
    }));

    const { data, error } = await supabase.from("social_posts").insert(rows).select(SOCIAL_POST_SELECT);
    if (error) throw error;
    for (const row of (data ?? []) as SocialPostRow[]) {
      upsertPost(mapSocialPostRow(row));
    }
    return true;
  }, [supabase, upsertPost]);

  const updatePost = useCallback(async (id: string, payload: SocialPostMutation) => {
    const { data, error } = await supabase
      .from("social_posts")
      .update({
        title: payload.title.trim(),
        scheduled_at: payload.scheduledAt,
        all_day: payload.allDay,
        status: payload.status,
        target_networks: payload.targetNetworks,
        format: payload.format?.trim() || null,
        notes: payload.notes?.trim() || null,
        drive_url: payload.driveUrl?.trim() || null,
        responsible_member_id: payload.responsibleMemberId,
        company_id: payload.companyId,
        campaign_label: payload.campaignLabel?.trim() || null,
        thematic: payload.thematic?.trim() || null,
        objective: payload.objective?.trim() || null,
        wording: payload.wording?.trim() || null,
        wording_en: payload.wordingEn?.trim() || null,
        visual_url: payload.visualUrl?.trim() || null,
        publication_status: payload.publicationStatus?.trim() || null,
        time_spent_hours: payload.timeSpentHours,
        reactions_count: payload.reactionsCount,
        engagement_rate: payload.engagementRate,
        impressions_count: payload.impressionsCount,
        followers_count: payload.followersCount,
      })
      .eq("id", id)
      .select(SOCIAL_POST_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      upsertPost(mapSocialPostRow(data as SocialPostRow));
    } else {
      await loadPostById(id);
    }
    return true;
  }, [loadPostById, supabase, upsertPost]);

  const deletePost = useCallback(async (id: string) => {
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) throw error;
    setPosts((prev) => prev.filter((post) => post.id !== id));
  }, [supabase]);

  const saveMonthlyTarget = useCallback(async (companyId: string, year: number, month: number, targetCount: number) => {
    const { error } = await supabase
      .from("social_monthly_targets")
      .upsert({ company_id: companyId, year, month, target_count: targetCount }, { onConflict: "company_id,year,month" });
    if (error) throw error;
    setTargets((prev) => {
      const existing = prev.find((item) => item.companyId === companyId && item.year === year && item.month === month);
      if (existing) {
        return prev.map((item) =>
          item.companyId === companyId && item.year === year && item.month === month
            ? { companyId, year, month, targetCount }
            : item,
        );
      }
      return [...prev, { companyId, year, month, targetCount }].sort(
        (a, b) => a.companyId.localeCompare(b.companyId) || a.year - b.year || a.month - b.month,
      );
    });
  }, [supabase]);

  return {
    posts,
    targets,
    loading,
    schemaError,
    loadData,
    createPosts,
    updatePost,
    deletePost,
    saveMonthlyTarget,
  };
}
