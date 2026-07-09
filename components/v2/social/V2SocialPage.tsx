"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Megaphone, PencilLine, Recycle, Sparkles, ThumbsUp, TrendingUp, XCircle } from "lucide-react";
import SocialPreview from "./SocialPreview";
import RepurposePanel from "./RepurposePanel";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useReferenceData } from "../../../lib/useReferenceData";
import { getSupabaseErrorMessage, useSocialPosts } from "../../../lib/useSocialPosts";
import type { SocialPost, SocialPostMutation } from "../../../lib/socialTypes";
import { toastError, toastSuccess } from "../../../lib/toast";
import { bestDays, bestHours, bestTimeRecommendation, engagementScore, topPerformingPosts } from "../../../lib/v2/socialInsights";

type Tab = "validation" | "studio" | "insights" | "recyclage";

function toMutation(post: SocialPost): SocialPostMutation {
  return {
    title: post.title,
    scheduledAt: post.scheduledAt,
    allDay: post.allDay,
    status: post.status,
    targetNetworks: post.targetNetworks,
    format: post.format,
    notes: post.notes,
    driveUrl: post.driveUrl,
    responsibleMemberId: post.responsibleMemberId,
    companyId: post.companyId ?? "",
    campaignLabel: post.campaignLabel,
    thematic: post.thematic,
    objective: post.objective,
    wording: post.wording,
    wordingEn: post.wordingEn,
    visualUrl: post.visualUrl,
    publicationStatus: post.publicationStatus,
    timeSpentHours: post.timeSpentHours,
    reactionsCount: post.reactionsCount,
    engagementRate: post.engagementRate,
    impressionsCount: post.impressionsCount,
    followersCount: post.followersCount,
  };
}

export default function V2SocialPage() {
  const { user } = useCurrentUser();
  const { companies } = useReferenceData();
  const { posts, loading, schemaError, updatePost, createPosts } = useSocialPosts();

  const [tab, setTab] = useState<Tab>("validation");
  const [entityId, setEntityId] = useState<string>("ALL");
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const [previewNetwork, setPreviewNetwork] = useState<string | null>(null);

  const authorName =
    user?.teamMemberName ?? user?.displayName ?? "Service Communication IDENA";

  const visiblePosts = useMemo(
    () => (entityId === "ALL" ? posts : posts.filter((p) => p.companyId === entityId)),
    [posts, entityId],
  );

  const toValidate = useMemo(
    () => visiblePosts.filter((p) => p.status === "À valider" || p.status === "Rédaction"),
    [visiblePosts],
  );

  const previewPost = useMemo(
    () => visiblePosts.find((p) => p.id === previewPostId) ?? toValidate[0] ?? null,
    [visiblePosts, previewPostId, toValidate],
  );

  const activeNetwork = previewNetwork ?? previewPost?.targetNetworks[0] ?? "LinkedIn";

  const changeStatus = async (post: SocialPost, status: SocialPost["status"], label: string) => {
    try {
      await updatePost(post.id, { ...toMutation(post), status });
      toastSuccess(label);
    } catch (error) {
      toastError(getSupabaseErrorMessage(error, "Impossible de mettre à jour le post"));
    }
  };

  const daysStat = useMemo(() => bestDays(posts), [posts]);
  const hoursStat = useMemo(() => bestHours(posts), [posts]);
  const recommendation = useMemo(() => bestTimeRecommendation(posts), [posts]);
  const topPosts = useMemo(() => topPerformingPosts(visiblePosts), [visiblePosts]);

  const recyclePost = async (post: SocialPost) => {
    try {
      const scheduled = new Date();
      scheduled.setDate(scheduled.getDate() + 30);
      await createPosts([
        {
          ...toMutation(post),
          title: `♻️ ${post.title}`,
          scheduledAt: scheduled.toISOString(),
          status: "Idée",
          publicationStatus: null,
          reactionsCount: null,
          engagementRate: null,
          impressionsCount: null,
        },
      ]);
      toastSuccess("Post recyclé (nouvelle idée planifiée à +30 j)");
    } catch (error) {
      toastError(getSupabaseErrorMessage(error, "Impossible de recycler le post"));
    }
  };

  return (
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                <Megaphone className="h-3.5 w-3.5" /> Réseaux sociaux · V2
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Studio &amp; validations</h1>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
                Aperçu « comme en vrai », circuit d'approbation et repurposing IA.
              </p>
            </div>
            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
            >
              <option value="ALL">Toutes les entités</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        <nav className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          {[
            { id: "validation" as const, label: "Validation visuelle", icon: ThumbsUp },
            { id: "studio" as const, label: "Studio IA", icon: Sparkles },
            { id: "insights" as const, label: "Meilleur moment", icon: Clock },
            { id: "recyclage" as const, label: "Recyclage", icon: Recycle },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "ui-transition inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.id === "validation" && toValidate.length > 0 ? (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-contrast)]">
                    {toValidate.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {schemaError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {schemaError}
          </div>
        ) : null}

        {tab === "validation" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
                À valider &amp; en rédaction
              </h2>
              {loading ? (
                <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
              ) : toValidate.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--success)]" />
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Rien à valider</p>
                  <p className="mt-1 text-xs text-[color:var(--foreground)]/55">
                    Les posts « À valider » ou « Rédaction » apparaîtront ici.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {toValidate.map((post) => {
                    const active = previewPost?.id === post.id;
                    return (
                      <li key={post.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewPostId(post.id);
                            setPreviewNetwork(post.targetNetworks[0] ?? "LinkedIn");
                          }}
                          className={[
                            "ui-transition w-full rounded-xl border px-3 py-2.5 text-left",
                            active
                              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                              : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-[var(--foreground)]">
                              {post.title}
                            </span>
                            <span className="shrink-0 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/60">
                              {post.status}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11px] text-[color:var(--foreground)]/55">
                            {post.companyName ?? "—"} · {post.targetNetworks.join(", ") || "aucun réseau"}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="ui-surface rounded-2xl p-5">
              {previewPost ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    {(previewPost.targetNetworks.length > 0
                      ? previewPost.targetNetworks
                      : ["LinkedIn"]
                    ).map((network) => (
                      <button
                        key={network}
                        type="button"
                        onClick={() => setPreviewNetwork(network)}
                        className={[
                          "ui-transition rounded-full border px-3 py-1 text-xs font-semibold",
                          activeNetwork === network
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--line)] text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]",
                        ].join(" ")}
                      >
                        {network}
                      </button>
                    ))}
                  </div>

                  <SocialPreview
                    network={activeNetwork}
                    authorName={previewPost.companyName ?? authorName}
                    authorAvatarUrl={previewPost.visualUrl ? null : user?.avatarUrl}
                    text={previewPost.wording ?? previewPost.notes ?? previewPost.title}
                    visualUrl={previewPost.visualUrl}
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void changeStatus(previewPost, "Planifié", "Post approuvé et planifié")}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => void changeStatus(previewPost, "Rédaction", "Renvoyé en rédaction")}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
                    >
                      <PencilLine className="h-4 w-4" /> Demander des modifs
                    </button>
                    <button
                      type="button"
                      onClick={() => void changeStatus(previewPost, "Annulé", "Post rejeté")}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:text-[var(--danger)]"
                    >
                      <XCircle className="h-4 w-4" /> Rejeter
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[color:var(--foreground)]/55">
                  Sélectionnez un post à gauche pour le prévisualiser.
                </p>
              )}
            </section>
          </div>
        ) : tab === "studio" ? (
          <RepurposePanel />
        ) : tab === "insights" ? (
          <div className="space-y-5">
            {recommendation ? (
              <div className="ui-surface flex items-center gap-3 rounded-2xl border-l-4 border-l-[var(--accent)] p-4">
                <TrendingUp className="h-5 w-5 text-[var(--accent)]" />
                <p className="text-sm font-medium text-[var(--foreground)]">{recommendation}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-[color:var(--foreground)]/55">
                Pas encore assez de posts publiés avec des métriques d'engagement pour recommander un créneau.
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="ui-surface rounded-2xl p-5">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                  <Clock className="h-4 w-4 text-[var(--accent)]" /> Meilleurs jours
                </h2>
                {daysStat.length === 0 ? (
                  <p className="text-sm text-[color:var(--foreground)]/55">Aucune donnée.</p>
                ) : (
                  <ul className="space-y-2">
                    {daysStat.map((s) => {
                      const max = daysStat[0].avgScore || 1;
                      return (
                        <li key={s.key} className="flex items-center gap-3">
                          <span className="w-20 shrink-0 text-xs font-semibold text-[var(--foreground)]">{s.label}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round((s.avgScore / max) * 100)}%` }} />
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] text-[color:var(--foreground)]/55">{s.avgScore.toFixed(1)} ({s.count})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section className="ui-surface rounded-2xl p-5">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                  <Clock className="h-4 w-4 text-[var(--accent)]" /> Meilleures heures
                </h2>
                {hoursStat.length === 0 ? (
                  <p className="text-sm text-[color:var(--foreground)]/55">Aucune donnée.</p>
                ) : (
                  <ul className="space-y-2">
                    {hoursStat.slice(0, 8).map((s) => {
                      const max = hoursStat[0].avgScore || 1;
                      return (
                        <li key={s.key} className="flex items-center gap-3">
                          <span className="w-16 shrink-0 text-xs font-semibold text-[var(--foreground)]">{s.label}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round((s.avgScore / max) * 100)}%` }} />
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] text-[color:var(--foreground)]/55">{s.avgScore.toFixed(1)} ({s.count})</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </div>
        ) : (
          <section className="ui-surface rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <Recycle className="h-4 w-4 text-[var(--accent)]" /> Bibliothèque de posts performants
            </h2>
            {topPosts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
                Aucun post publié avec métriques pour l'instant. Les meilleurs contenus apparaîtront ici pour recyclage evergreen.
              </p>
            ) : (
              <ul className="space-y-2">
                {topPosts.map((post, idx) => (
                  <li key={post.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{post.title}</p>
                      <p className="truncate text-[11px] text-[color:var(--foreground)]/55">
                        {post.companyName ?? "—"} · engagement {engagementScore(post).toFixed(1)} · {post.targetNetworks.join(", ") || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void recyclePost(post)}
                      className="ui-transition inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      <Recycle className="h-3.5 w-3.5" /> Recycler
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
  );
}
