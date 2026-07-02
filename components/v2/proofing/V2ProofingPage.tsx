"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Database,
  HardDrive,
  ImagePlus,
  Layers,
  MessageSquarePlus,
  Plus,
  Stamp,
  Trash2,
  XCircle,
} from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useReferenceData } from "../../../lib/useReferenceData";
import {
  deriveStatus,
  newId,
  PROOF_STATUS_LABELS,
  useProofs,
  type Proof,
  type ProofStatus,
} from "../../../lib/v2/proofing";
import { toastSuccess } from "../../../lib/toast";

const STATUS_STYLE: Record<ProofStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-sky-100 text-sky-800",
  changes_requested: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
};

export default function V2ProofingPage() {
  const { user } = useCurrentUser();
  const { companies } = useReferenceData();
  const { proofs, backend, loading, createProof, updateProof, deleteProof } = useProofs();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newVisual, setNewVisual] = useState("");
  const [newApprovers, setNewApprovers] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  const authorName = user?.teamMemberName ?? user?.displayName ?? user?.email ?? "Relecteur";

  const selected = useMemo(
    () => proofs.find((p) => p.id === selectedId) ?? proofs[0] ?? null,
    [proofs, selectedId],
  );

  const visibleComments = useMemo(
    () => (selected ? selected.comments.filter((c) => c.version === selected.currentVersion) : []),
    [selected],
  );

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const approvers = newApprovers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const proof = await createProof({
      title: newTitle.trim(),
      companyId: newCompany || null,
      visualUrl: newVisual.trim() || null,
      approvers,
    });
    setSelectedId(proof.id);
    setShowCreate(false);
    setNewTitle("");
    setNewCompany("");
    setNewVisual("");
    setNewApprovers("");
    toastSuccess("Épreuve créée");
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x: Math.round(x), y: Math.round(y) });
  };

  const addComment = async () => {
    if (!selected || !commentBody.trim()) return;
    const comment = {
      id: newId("cmt"),
      author: authorName,
      body: commentBody.trim(),
      posX: pendingPin?.x ?? null,
      posY: pendingPin?.y ?? null,
      version: selected.currentVersion,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    await updateProof(selected.id, (p) => ({ ...p, comments: [...p.comments, comment] }));
    setCommentBody("");
    setPendingPin(null);
  };

  const toggleResolved = async (commentId: string) => {
    if (!selected) return;
    await updateProof(selected.id, (p) => ({
      ...p,
      comments: p.comments.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c)),
    }));
  };

  const addVersion = async () => {
    if (!selected) return;
    const url = window.prompt("URL du nouveau visuel (laisser vide pour conserver) :", selected.visualUrl ?? "");
    if (url === null) return;
    await updateProof(selected.id, (p) => {
      const n = p.currentVersion + 1;
      return {
        ...p,
        currentVersion: n,
        visualUrl: url.trim() || p.visualUrl,
        status: "in_review",
        approvers: p.approvers.map((a) => ({ ...a, decision: "pending", decidedAt: null })),
        versions: [
          ...p.versions,
          { n, visualUrl: url.trim() || p.visualUrl, note: `Version ${n}`, createdAt: new Date().toISOString() },
        ],
      };
    });
    toastSuccess("Nouvelle version ajoutée");
  };

  const decide = async (approverName: string, decision: "approved" | "rejected") => {
    if (!selected) return;
    await updateProof(selected.id, (p) => {
      const approvers = p.approvers.map((a) =>
        a.name === approverName ? { ...a, decision, decidedAt: new Date().toISOString() } : a,
      );
      const next = { ...p, approvers };
      return { ...next, status: deriveStatus(next) };
    });
  };

  const setCurrentVersion = async (n: number) => {
    if (!selected) return;
    const version = selected.versions.find((v) => v.n === n);
    await updateProof(selected.id, (p) => ({
      ...p,
      currentVersion: n,
      visualUrl: version?.visualUrl ?? p.visualUrl,
    }));
  };

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <div className="space-y-5">
        <header className="ui-surface flex flex-wrap items-start justify-between gap-4 rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              <Stamp className="h-3.5 w-3.5" /> Proofing créatif · V2
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Validations créatives</h1>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Annotations sur visuel, versions et chaîne d'approbation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60">
              {backend === "supabase" ? <Database className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
              {backend === "supabase" ? "Partagé" : "Local"}
            </span>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
            >
              <Plus className="h-4 w-4" /> Nouvelle épreuve
            </button>
          </div>
        </header>

        {showCreate ? (
          <section className="ui-surface grid gap-3 rounded-2xl p-5 sm:grid-cols-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titre de l'épreuve (ex : Affiche salon 2026)"
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">Entité (optionnel)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={newVisual}
              onChange={(e) => setNewVisual(e.target.value)}
              placeholder="URL du visuel (image)"
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <input
              value={newApprovers}
              onChange={(e) => setNewApprovers(e.target.value)}
              placeholder="Approbateurs, séparés par des virgules"
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm sm:col-span-2"
            />
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                Créer
              </button>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="ui-surface rounded-2xl p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Épreuves</h2>
            {loading ? (
              <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
            ) : proofs.length === 0 ? (
              <p className="text-sm text-[color:var(--foreground)]/55">Aucune épreuve pour le moment.</p>
            ) : (
              <ul className="space-y-1.5">
                {proofs.map((proof) => {
                  const active = selected?.id === proof.id;
                  const open = proof.comments.filter((c) => !c.resolved).length;
                  return (
                    <li key={proof.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(proof.id)}
                        className={[
                          "ui-transition w-full rounded-xl border px-3 py-2 text-left",
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--line)] hover:border-[var(--line-strong)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--foreground)]">{proof.title}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[proof.status]}`}>
                            {PROOF_STATUS_LABELS[proof.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[color:var(--foreground)]/55">
                          v{proof.currentVersion} · {open} annotation(s) ouverte(s)
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {selected ? (
            <section className="space-y-4">
              <div className="ui-surface rounded-2xl p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[var(--foreground)]">{selected.title}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[selected.status]}`}>
                      {PROOF_STATUS_LABELS[selected.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {selected.versions.map((v) => (
                      <button
                        key={v.n}
                        type="button"
                        onClick={() => void setCurrentVersion(v.n)}
                        className={[
                          "ui-transition rounded-lg border px-2.5 py-1 text-xs font-semibold",
                          v.n === selected.currentVersion
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "border-[var(--line)] text-[color:var(--foreground)]/60",
                        ].join(" ")}
                      >
                        v{v.n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => void addVersion()}
                      className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line-strong)] px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
                    >
                      <Layers className="h-3.5 w-3.5" /> Version
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteProof(selected.id)}
                      className="ui-transition rounded-lg border border-[var(--line-strong)] p-1.5 text-[color:var(--foreground)]/50 hover:text-[var(--danger)]"
                      aria-label="Supprimer l'épreuve"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  ref={imageRef}
                  onClick={handleImageClick}
                  className="relative w-full cursor-crosshair overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]"
                  style={{ minHeight: "320px" }}
                >
                  {selected.visualUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.visualUrl} alt={selected.title} className="w-full object-contain" />
                  ) : (
                    <div className="flex h-[320px] flex-col items-center justify-center text-[color:var(--foreground)]/40">
                      <ImagePlus className="h-8 w-8" />
                      <p className="mt-2 text-sm">Aucun visuel — cliquez pour annoter une zone</p>
                    </div>
                  )}

                  {visibleComments
                    .filter((c) => c.posX != null && c.posY != null)
                    .map((c, idx) => (
                      <span
                        key={c.id}
                        title={c.body}
                        className={[
                          "absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold text-white shadow",
                          c.resolved ? "bg-[var(--success)]" : "bg-[var(--accent)]",
                        ].join(" ")}
                        style={{ left: `${c.posX}%`, top: `${c.posY}%` }}
                      >
                        {idx + 1}
                      </span>
                    ))}

                  {pendingPin ? (
                    <span
                      className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white bg-[var(--warning)] shadow"
                      style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                    />
                  ) : null}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void addComment()}
                    placeholder={pendingPin ? `Annotation à (${pendingPin.x}%, ${pendingPin.y}%)…` : "Commentaire global…"}
                    className="ui-focus-ring flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void addComment()}
                    disabled={!commentBody.trim()}
                    className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-50"
                  >
                    <MessageSquarePlus className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="ui-surface rounded-2xl p-5">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                    Annotations (v{selected.currentVersion})
                  </h3>
                  {visibleComments.length === 0 ? (
                    <p className="text-sm text-[color:var(--foreground)]/55">Aucune annotation sur cette version.</p>
                  ) : (
                    <ul className="space-y-2">
                      {visibleComments.map((c, idx) => (
                        <li
                          key={c.id}
                          className="flex items-start gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5"
                        >
                          <span
                            className={[
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                              c.resolved ? "bg-[var(--success)]" : "bg-[var(--accent)]",
                            ].join(" ")}
                          >
                            {c.posX != null ? idx + 1 : "•"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${c.resolved ? "text-[color:var(--foreground)]/45 line-through" : "text-[var(--foreground)]"}`}>
                              {c.body}
                            </p>
                            <p className="text-[11px] text-[color:var(--foreground)]/50">{c.author}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void toggleResolved(c.id)}
                            className="ui-transition rounded-md border border-[var(--line)] p-1 text-[color:var(--foreground)]/50 hover:text-[var(--success)]"
                            aria-label="Marquer résolu"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="ui-surface rounded-2xl p-5">
                  <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Chaîne d'approbation</h3>
                  {selected.approvers.length === 0 ? (
                    <p className="text-sm text-[color:var(--foreground)]/55">
                      Aucun approbateur défini pour cette épreuve.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selected.approvers.map((a) => (
                        <li
                          key={a.name}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">{a.name}</p>
                            <p className="text-[11px] text-[color:var(--foreground)]/50">
                              {a.decision === "pending"
                                ? "En attente"
                                : a.decision === "approved"
                                  ? "Validé"
                                  : "Corrections demandées"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => void decide(a.name, "approved")}
                              className={[
                                "ui-transition rounded-md border p-1.5",
                                a.decision === "approved"
                                  ? "border-[var(--success)] bg-emerald-50 text-[var(--success)]"
                                  : "border-[var(--line)] text-[color:var(--foreground)]/50 hover:text-[var(--success)]",
                              ].join(" ")}
                              aria-label={`${a.name} valide`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void decide(a.name, "rejected")}
                              className={[
                                "ui-transition rounded-md border p-1.5",
                                a.decision === "rejected"
                                  ? "border-[var(--danger)] bg-rose-50 text-[var(--danger)]"
                                  : "border-[var(--line)] text-[color:var(--foreground)]/50 hover:text-[var(--danger)]",
                              ].join(" ")}
                              aria-label={`${a.name} demande des corrections`}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="ui-surface flex items-center justify-center rounded-2xl p-10 text-sm text-[color:var(--foreground)]/55">
              Créez une épreuve pour démarrer une validation créative.
            </section>
          )}
        </div>
      </div>
    </V2AppShell>
  );
}
