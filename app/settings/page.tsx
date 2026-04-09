"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Layers,
  PenLine,
  Plus,
  RefreshCw,
  Trash2,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import AdminAvatar from "../../components/AdminAvatar";
import CompanyAvatar from "../../components/CompanyAvatar";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { toastError, toastSuccess } from "../../lib/toast";
import { useIdenaMark } from "../../lib/idenaMarkContext";
import { getIdenaMarkStaticSrc } from "../../lib/idenaMarkSrc";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { adminSolidColorFor } from "../../lib/kanbanStyles";
import type { AdminId } from "../../lib/types";

/** Couleur unique des badges domaine (bleu IDENA, non personnalisable). */
const DOMAIN_BADGE_COLOR = "#009cdf";

/* ─────────────────────────── Types ─────────────────────────── */
type TeamMemberRow = {
  id: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  avatar_url?: string | null;
};
type CompanyRow = { id: string; name: string; is_active: boolean; sort_order: number; logo_url?: string | null };
type DomainRow = {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  sort_order: number;
};
type ColumnRow = { id: string; name: string; is_active: boolean; sort_order: number };


function splitDomainName(value: string) {
  const name = value.trim();
  const match = name.match(/^(\p{Extended_Pictographic}(?:\uFE0F)?)\s+(.*)$/u);
  if (!match) return { emoji: "", label: name };
  return { emoji: match[1] ?? "", label: (match[2] ?? "").trim() };
}

/* ─────────────────────────── Modale de confirmation ─────────────────────────── */
function ConfirmDeleteModal(props: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_34px_90px_rgba(20,17,13,0.24)]">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
          <Trash2 className="h-6 w-6 text-rose-600" />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">Supprimer cet élément&nbsp;?</h3>
        <p className="mt-1.5 text-sm text-[color:var(--foreground)]/65">
          <span className="font-semibold text-[var(--foreground)]">{props.label}</span> sera définitivement supprimé.
          Cette action est irréversible.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={props.onCancel}
            className="ui-transition flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            className="ui-transition flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Section wrapper ─────────────────────────── */
function Section(props: {
  icon: typeof Users;
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const Icon = props.icon;
  return (
    <div className="ui-surface overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]">
          <Icon className="h-5 w-5 text-[color:var(--foreground)]/50" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-[var(--foreground)]">{props.title}</h2>
          <p className="text-xs text-[color:var(--foreground)]/60">{props.subtitle}</p>
        </div>
        {props.badge && (
          <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--foreground)]/75">
            {props.badge}
          </span>
        )}
      </div>
      <div className="p-5">{props.children}</div>
    </div>
  );
}

/* ─────────────────────────── Ligne générique ─────────────────────────── */
function EntityRow(props: {
  isActive: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onSave: () => void;
  onToggle: () => void;
  onDelete: () => void;
  prefix?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-xl border p-2.5",
        props.isActive ? "border-[var(--line)] bg-[var(--surface)]" : "border-dashed border-[var(--line)] bg-[var(--surface-soft)] opacity-60",
      ].join(" ")}
    >
      {props.prefix}
      <input
        value={props.editValue}
        onChange={(e) => props.onEditChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && props.onSave()}
        className="ui-focus-ring min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--line)] focus:bg-[var(--surface-soft)]"
      />
      {props.extra}
      <button
        type="button"
        onClick={props.onSave}
        title="Enregistrer"
        className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] text-emerald-600 hover:bg-emerald-50"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={props.onToggle}
        title={props.isActive ? "Désactiver" : "Activer"}
        className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]"
      >
        {props.isActive ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={props.onDelete}
        title="Supprimer"
        className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─────────────────────────── Page principale ─────────────────────────── */
export default function SettingsPage() {
  const { user: currentUser, reload: reloadUser } = useCurrentUser();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [admins, setAdmins] = useState<TeamMemberRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [columns, setColumns] = useState<ColumnRow[]>([]);

  // Champs "draft" (édition inline)
  const [draftAdminNames, setDraftAdminNames] = useState<Record<string, string>>({});
  const [draftCompanyNames, setDraftCompanyNames] = useState<Record<string, string>>({});
  const [draftDomainLabels, setDraftDomainLabels] = useState<Record<string, string>>({});
  const [draftDomainEmojis, setDraftDomainEmojis] = useState<Record<string, string>>({});
  const [draftColumnNames, setDraftColumnNames] = useState<Record<string, string>>({});

  // Champs "ajout"
  const [newAdminName, setNewAdminName] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newDomainLabel, setNewDomainLabel] = useState("");
  const [newDomainEmoji, setNewDomainEmoji] = useState("🖥️");
  const [newColumnName, setNewColumnName] = useState("");

  // Modale de confirmation
  const [pendingDelete, setPendingDelete] = useState<{
    label: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Sélecteur "Mon profil"
  const [profileMemberId, setProfileMemberId] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);

  const { reload: reloadIdenaMark } = useIdenaMark();
  const [idenaMarkUrl, setIdenaMarkUrl] = useState<string | null>(null);
  const [idenaMarkUploading, setIdenaMarkUploading] = useState(false);

  /* ─── Chargement ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [adminsRes, companiesRes, domainsRes, columnsRes, settingsRes] = await Promise.all([
      supabase.from("team_members").select("id, display_name, is_active, sort_order, avatar_url").order("sort_order"),
      supabase.from("companies").select("id, name, is_active, sort_order, logo_url").order("sort_order"),
      supabase.from("domains").select("id, name, color, is_active, sort_order").order("sort_order"),
      supabase.from("workflow_columns").select("id, name, is_active, sort_order").order("sort_order"),
      supabase.from("app_settings").select("idena_mark_url").eq("id", "default").maybeSingle(),
    ]);

    const errors: string[] = [];
    if (adminsRes.error) errors.push(`Collaborateurs: ${adminsRes.error.message}`);
    if (companiesRes.error) errors.push(`Sociétés: ${companiesRes.error.message}`);
    if (domainsRes.error) errors.push(`Domaines: ${domainsRes.error.message}`);
    if (columnsRes.error) errors.push(`Colonnes: ${columnsRes.error.message}`);
    if (settingsRes.error) errors.push(`Paramètres application: ${settingsRes.error.message}`);
    setLoadErrors(errors);
    if (errors.length > 0) toastError("Chargement partiel. Vérifiez les droits Supabase.");

    const nextAdmins = (adminsRes.data ?? []) as TeamMemberRow[];
    const nextCompanies = (companiesRes.data ?? []) as CompanyRow[];
    const nextDomains = (domainsRes.data ?? []) as DomainRow[];
    const nextColumns = (columnsRes.data ?? []) as ColumnRow[];

    setAdmins(nextAdmins);
    setCompanies(nextCompanies);
    setDomains(nextDomains);
    setColumns(nextColumns);
    setDraftAdminNames(Object.fromEntries(nextAdmins.map((r) => [r.id, r.display_name])));
    setDraftCompanyNames(Object.fromEntries(nextCompanies.map((r) => [r.id, r.name])));
    setDraftDomainLabels(Object.fromEntries(nextDomains.map((r) => [r.id, splitDomainName(r.name).label])));
    setDraftDomainEmojis(Object.fromEntries(nextDomains.map((r) => [r.id, splitDomainName(r.name).emoji])));
    setDraftColumnNames(Object.fromEntries(nextColumns.map((r) => [r.id, r.name])));
    const rawUrl = settingsRes.data?.idena_mark_url;
    setIdenaMarkUrl(typeof rawUrl === "string" && rawUrl.trim() !== "" ? rawUrl.trim() : null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAll]);

  /* ─── Sort order ─── */
  const updateSortOrder = async (
    table: "workflow_columns" | "team_members" | "companies" | "domains",
    rows: Array<{ id: string }>,
  ) => {
    const results = await Promise.all(
      rows.map((row, idx) => supabase.from(table).update({ sort_order: idx }).eq("id", row.id)),
    );
    if (results.some((r) => r.error)) { toastError("Impossible de mettre à jour l'ordre."); return false; }
    return true;
  };

  /* ─── Profil utilisateur ─── */
  const saveProfile = async () => {
    const resolvedProfileMemberId = profileMemberId || currentUser?.teamMemberId || "";
    if (!currentUser || !resolvedProfileMemberId) return;
    setSavingProfile(true);
    const member = admins.find((a) => a.id === resolvedProfileMemberId);
    const { error } = await supabase
      .from("profiles")
      .update({ team_member_id: resolvedProfileMemberId, display_name: member?.display_name ?? null })
      .eq("id", currentUser.id);
    if (error) { toastError("Impossible de mettre à jour votre profil."); setSavingProfile(false); return; }
    reloadUser();
    toastSuccess("Profil mis à jour !");
    setSavingProfile(false);
  };

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    admins: admins.filter((r) => r.is_active).length,
    companies: companies.filter((r) => r.is_active).length,
    domains: domains.filter((r) => r.is_active).length,
    columns: columns.filter((r) => r.is_active).length,
  }), [admins, companies, domains, columns]);

  /* ─── Helper : demander confirmation avant delete ─── */
  const askDelete = (label: string, onConfirm: () => Promise<void>) => {
    setPendingDelete({ label, onConfirm });
  };

  /* ══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <AppShell
      currentUserName={currentUser?.teamMemberName ?? currentUser?.displayName ?? undefined}
      currentUserEmail={currentUser?.email}
    >
      {pendingDelete && (
        <ConfirmDeleteModal
          label={pendingDelete.label}
          onConfirm={async () => {
            await pendingDelete.onConfirm();
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <section className="space-y-4">
        {/* ─── En-tête ─── */}
        <div className="ui-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground)]/50">
              Administration
            </p>
            <h1 className="ui-heading mt-0.5 text-3xl font-semibold text-[var(--foreground)]">
              Paramètres
            </h1>
            <p className="mt-1.5 text-sm text-[color:var(--foreground)]/65">
              {loading
                ? "Chargement..."
                : `${stats.admins} collaborateurs · ${stats.companies} sociétés · ${stats.domains} domaines · ${stats.columns} colonnes`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            className="ui-transition flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)] disabled:opacity-40"
          >
            <RefreshCw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
            Rafraîchir
          </button>
        </div>

        {loadErrors.length > 0 && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-0.5">
              {loadErrors.map((msg) => (
                <p key={msg} className="text-sm text-amber-800">{msg}</p>
              ))}
            </div>
          </div>
        )}

        {/* ─── Pictogramme IDENA ─── */}
        <Section
          icon={ImageIcon}
          title="Identité visuelle"
          subtitle="Pictogramme affiché dans la barre latérale et sur la page de connexion."
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL Supabase ou fallback */}
              <img
                src={idenaMarkUrl ?? getIdenaMarkStaticSrc()}
                alt="Pictogramme IDENA"
                className="h-16 w-16 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm text-[color:var(--foreground)]/70">
                Envoyez une image PNG, WebP, JPG ou SVG. Elle remplace le fichier par défaut et la variable{" "}
                <code className="rounded bg-[var(--surface-soft)] px-1 text-xs">NEXT_PUBLIC_IDENA_MARK_SRC</code>{" "}
                lorsqu’elle est définie en base.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="ui-transition inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/80 hover:bg-[var(--surface)]">
                  <ImageIcon className="h-4 w-4" />
                  {idenaMarkUploading ? "Envoi…" : "Choisir une image"}
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg,image/gif,image/svg+xml"
                    className="sr-only"
                    disabled={idenaMarkUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
                      const allowed = ["png", "webp", "jpg", "jpeg", "gif", "svg"];
                      if (!allowed.includes(ext)) {
                        toastError("Utilisez PNG, WebP, JPG, GIF ou SVG.");
                        e.target.value = "";
                        return;
                      }
                      setIdenaMarkUploading(true);
                      const path = `idena-mark-${Date.now()}.${ext}`;
                      const { error: upErr } = await supabase.storage.from("idena-mark").upload(path, file, {
                        upsert: true,
                        contentType: file.type || undefined,
                      });
                      if (upErr) {
                        toastError(`Envoi impossible : ${upErr.message}`);
                        setIdenaMarkUploading(false);
                        e.target.value = "";
                        return;
                      }
                      const {
                        data: { publicUrl },
                      } = supabase.storage.from("idena-mark").getPublicUrl(path);
                      const { error: dbErr } = await supabase.from("app_settings").upsert(
                        { id: "default", idena_mark_url: publicUrl, updated_at: new Date().toISOString() },
                        { onConflict: "id" },
                      );
                      if (dbErr) {
                        toastError(`Enregistrement impossible : ${dbErr.message}`);
                        setIdenaMarkUploading(false);
                        e.target.value = "";
                        return;
                      }
                      setIdenaMarkUrl(publicUrl);
                      await reloadIdenaMark();
                      await loadAll();
                      toastSuccess("Pictogramme mis à jour.");
                      setIdenaMarkUploading(false);
                      e.target.value = "";
                    }}
                  />
                </label>
                {idenaMarkUrl ? (
                  <button
                    type="button"
                    disabled={idenaMarkUploading}
                    onClick={async () => {
                      setIdenaMarkUploading(true);
                      const { error } = await supabase
                        .from("app_settings")
                        .update({ idena_mark_url: null, updated_at: new Date().toISOString() })
                        .eq("id", "default");
                      if (error) {
                        toastError(`Réinitialisation impossible : ${error.message}`);
                        setIdenaMarkUploading(false);
                        return;
                      }
                      setIdenaMarkUrl(null);
                      await reloadIdenaMark();
                      await loadAll();
                      toastSuccess("Pictogramme réinitialisé (fichier local ou .env).");
                      setIdenaMarkUploading(false);
                    }}
                    className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)] disabled:opacity-50"
                  >
                    Réinitialiser
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Mon profil ─── */}
        <Section
          icon={UserCircle2}
          title="Mon profil"
          subtitle="Lier votre compte à un membre de l'équipe pour personnaliser votre expérience."
        >
          {currentUser ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
                {currentUser.teamMemberName && (
                  <AdminAvatar admin={currentUser.teamMemberName as AdminId} size="md" />
                )}
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {currentUser.teamMemberName ?? currentUser.displayName ?? "Profil non configuré"}
                  </p>
                  <p className="text-xs text-[color:var(--foreground)]/55">{currentUser.email}</p>
                </div>
                {currentUser.teamMemberName && (
                  <span
                    className="ml-auto h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        adminSolidColorFor(currentUser.teamMemberName ?? ""),
                    }}
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
                  Changer mon identité
                </label>
                <div className="flex gap-2">
                  <select
                    value={profileMemberId || currentUser?.teamMemberId || ""}
                    onChange={(e) => setProfileMemberId(e.target.value)}
                    className="ui-focus-ring flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                  >
                    <option value="">— Sélectionnez un profil —</option>
                    {admins.filter((a) => a.is_active).map((a) => (
                      <option key={a.id} value={a.id}>{a.display_name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void saveProfile()}
                    disabled={!(profileMemberId || currentUser?.teamMemberId) || savingProfile}
                    className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:opacity-50"
                  >
                    {savingProfile ? "..." : "Enregistrer"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[color:var(--foreground)]/50">Connexion requise.</p>
          )}
        </Section>

        {/* ─── Collaborateurs ─── */}
        <Section
          icon={Users}
          title="Collaborateurs"
          subtitle="Membres de l'équipe disponibles dans le formulaire de création de tâche."
          badge={`${stats.admins} actifs`}
        >
          {/* Ajout */}
          <div className="mb-4 flex gap-2">
            <input
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const name = newAdminName.trim();
                  if (!name) return;
                  void (async () => {
                    const { error } = await supabase.from("team_members").insert({ display_name: name, is_active: true });
                    if (error) { toastError(`Ajout impossible: ${error.message}`); return; }
                    setNewAdminName("");
                    await loadAll();
                    toastSuccess("Collaborateur ajouté.");
                  })();
                }
              }}
              placeholder="Prénom Nom du collaborateur"
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                const name = newAdminName.trim();
                if (!name) return;
                const { error } = await supabase.from("team_members").insert({ display_name: name, is_active: true });
                if (error) { toastError(`Ajout impossible: ${error.message}`); return; }
                setNewAdminName("");
                await loadAll();
                toastSuccess("Collaborateur ajouté.");
              }}
              className="ui-transition flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {admins.map((row) => {
              const color = adminSolidColorFor(row.display_name);
              return (
                <EntityRow
                  key={row.id}
                  isActive={row.is_active}
                  editValue={draftAdminNames[row.id] ?? row.display_name}
                  onEditChange={(v) => setDraftAdminNames((p) => ({ ...p, [row.id]: v }))}
                  onSave={async () => {
                    const nextName = (draftAdminNames[row.id] ?? "").trim();
                    if (!nextName) return;
                    const { error } = await supabase.from("team_members").update({ display_name: nextName }).eq("id", row.id);
                    if (error) { toastError("Modification impossible."); return; }
                    await loadAll();
                    toastSuccess("Collaborateur mis à jour.");
                  }}
                  onToggle={async () => {
                    const { error } = await supabase.from("team_members").update({ is_active: !row.is_active }).eq("id", row.id);
                    if (error) { toastError("Mise à jour impossible."); return; }
                    await loadAll();
                    toastSuccess(row.is_active ? "Désactivé." : "Activé.");
                  }}
                  onDelete={() =>
                    askDelete(row.display_name, async () => {
                      const { error } = await supabase.from("team_members").delete().eq("id", row.id);
                      if (error) { toastError(`Suppression impossible: ${error.message}`); return; }
                      await loadAll();
                      toastSuccess("Collaborateur supprimé.");
                    })
                  }
                  prefix={
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Avatar avec upload */}
                      <label className="relative cursor-pointer group" title="Changer la photo">
                        <AdminAvatar admin={row.display_name as AdminId} size="md" avatarUrl={row.avatar_url ?? null} />
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                          <ImageIcon className="h-3 w-3 text-white" />
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const ext = file.name.split(".").pop() ?? "jpg";
                            const path = `${row.id}.${ext}`;
                            const { error: upErr } = await supabase.storage
                              .from("member-avatars")
                              .upload(path, file, { upsert: true });
                            if (upErr) { toastError(`Upload impossible: ${upErr.message}`); return; }
                            const { data: { publicUrl } } = supabase.storage.from("member-avatars").getPublicUrl(path);
                            const { error: dbErr } = await supabase.from("team_members").update({ avatar_url: publicUrl }).eq("id", row.id);
                            if (dbErr) { toastError("Impossible de sauvegarder l'avatar."); return; }
                            await loadAll();
                            toastSuccess("Photo mise à jour !");
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {color && (
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: color }}
                          title={`Couleur : ${color}`}
                        />
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-[color:var(--foreground)]/45">
            Les couleurs sont assignées automatiquement par l&apos;application selon l&apos;ordre des collaborateurs.
          </p>
        </Section>

        {/* ─── Sociétés ─── */}
        <Section
          icon={Building2}
          title="Sociétés / Filiales"
          subtitle="Liste alimentant le menu déroulant du formulaire de création de tâche."
          badge={`${stats.companies} actives`}
        >
          <div className="mb-4 flex gap-2">
            <input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const name = newCompanyName.trim();
                if (!name) return;
                void (async () => {
                  const { error } = await supabase.from("companies").insert({ name, is_active: true });
                  if (error) { toastError(`Ajout impossible: ${error.message}`); return; }
                  setNewCompanyName("");
                  await loadAll();
                  toastSuccess("Société ajoutée.");
                })();
              }}
              placeholder="Nom de la société"
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                const name = newCompanyName.trim();
                if (!name) return;
                const { error } = await supabase.from("companies").insert({ name, is_active: true });
                if (error) { toastError(`Ajout impossible: ${error.message}`); return; }
                setNewCompanyName("");
                await loadAll();
                toastSuccess("Société ajoutée.");
              }}
              className="ui-transition flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {companies.map((row) => (
              <div key={row.id} className="space-y-1.5">
                {/* Logo upload + miniature */}
                <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2">
                  <CompanyAvatar
                    name={row.name}
                    logoUrl={row.logo_url}
                    className="h-8 w-8 rounded-md border border-[var(--line)] bg-white object-contain"
                    fallbackClassName="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/35"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--foreground)] truncate">{row.name}</p>
                    <p className="text-[10px] text-[color:var(--foreground)]/50">Logo de la société</p>
                  </div>
                  <label className="ui-transition cursor-pointer flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]">
                    <ImageIcon className="h-3.5 w-3.5" />
                    {row.logo_url ? "Changer" : "Ajouter"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const ext = file.name.split(".").pop() ?? "png";
                        const path = `${row.id}.${ext}`;
                        // Utiliser le client SSR qui transmet la session Auth
                        const { error: upErr } = await supabase.storage
                          .from("company-logos")
                          .upload(path, file, { upsert: true, contentType: file.type });
                        if (upErr) { toastError(`Upload impossible: ${upErr.message}`); return; }
                        const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(path);
                        const publicUrl = urlData.publicUrl + `?v=${Date.now()}`;
                        const { error: dbErr } = await supabase.from("companies").update({ logo_url: publicUrl }).eq("id", row.id);
                        if (dbErr) { toastError("Mise à jour impossible."); return; }
                        await loadAll();
                        toastSuccess("Logo mis à jour.");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {row.logo_url && (
                    <button
                      type="button"
                      title="Supprimer le logo"
                      onClick={async () => {
                        const { error } = await supabase.from("companies").update({ logo_url: null }).eq("id", row.id);
                        if (error) { toastError("Impossible de supprimer le logo."); return; }
                        await loadAll();
                        toastSuccess("Logo supprimé.");
                      }}
                      className="ui-transition flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-400 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <EntityRow
                  isActive={row.is_active}
                  editValue={draftCompanyNames[row.id] ?? row.name}
                  onEditChange={(v) => setDraftCompanyNames((p) => ({ ...p, [row.id]: v }))}
                  onSave={async () => {
                    const nextName = (draftCompanyNames[row.id] ?? "").trim();
                    if (!nextName) return;
                    const { error } = await supabase.from("companies").update({ name: nextName }).eq("id", row.id);
                    if (error) { toastError("Modification impossible."); return; }
                    await loadAll();
                    toastSuccess("Société mise à jour.");
                  }}
                  onToggle={async () => {
                    const { error } = await supabase.from("companies").update({ is_active: !row.is_active }).eq("id", row.id);
                    if (error) { toastError("Mise à jour impossible."); return; }
                    await loadAll();
                    toastSuccess(row.is_active ? "Désactivée." : "Activée.");
                  }}
                  onDelete={() =>
                    askDelete(row.name, async () => {
                      const { error } = await supabase.from("companies").delete().eq("id", row.id);
                      if (error) { toastError(`Suppression impossible: ${error.message}`); return; }
                      await loadAll();
                      toastSuccess("Société supprimée.");
                    })
                  }
                />
              </div>
            ))}
          </div>
        </Section>

        {/* ─── Domaines ─── */}
        <Section
          icon={Layers}
          title="Domaines d'action"
          subtitle="Pôles / familles de tâches (Print, Digital, Event…)."
          badge={`${stats.domains} actifs`}
        >
          {/* Ajout */}
          <div className="mb-4 grid gap-2 sm:grid-cols-[80px_1fr_auto]">
            <input
              value={newDomainEmoji}
              onChange={(e) => setNewDomainEmoji(e.target.value)}
              placeholder="🖥️"
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-center text-sm"
            />
            <input
              value={newDomainLabel}
              onChange={(e) => setNewDomainLabel(e.target.value)}
              placeholder="Nom du domaine"
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                const label = newDomainLabel.trim();
                if (!label) return;
                const name = `${newDomainEmoji.trim()} ${label}`.trim();
                const { error } = await supabase
                  .from("domains")
                  .insert({ name, color: DOMAIN_BADGE_COLOR, is_active: true });
                if (error) { toastError(`Ajout impossible: ${error.message}`); return; }
                setNewDomainLabel("");
                await loadAll();
                toastSuccess("Domaine ajouté.");
              }}
              className="ui-transition flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {domains.map((row) => (
              <EntityRow
                key={row.id}
                isActive={row.is_active}
                editValue={`${draftDomainEmojis[row.id] ?? ""} ${draftDomainLabels[row.id] ?? ""}`.trim()}
                onEditChange={(v) => {
                  const match = v.match(/^(\p{Extended_Pictographic}(?:\uFE0F)?)\s*(.*)?$/u);
                  if (match) {
                    setDraftDomainEmojis((p) => ({ ...p, [row.id]: match[1] ?? "" }));
                    setDraftDomainLabels((p) => ({ ...p, [row.id]: (match[2] ?? "").trim() }));
                  } else {
                    setDraftDomainLabels((p) => ({ ...p, [row.id]: v.trim() }));
                  }
                }}
                onSave={async () => {
                  const label = (draftDomainLabels[row.id] ?? "").trim();
                  if (!label) return;
                  const emoji = (draftDomainEmojis[row.id] ?? "").trim();
                  const name = `${emoji} ${label}`.trim();
                  const { error } = await supabase
                    .from("domains")
                    .update({ name, color: DOMAIN_BADGE_COLOR })
                    .eq("id", row.id);
                  if (error) { toastError("Modification impossible."); return; }
                  await loadAll();
                  toastSuccess("Domaine mis à jour.");
                }}
                onToggle={async () => {
                  const { error } = await supabase.from("domains").update({ is_active: !row.is_active }).eq("id", row.id);
                  if (error) { toastError("Mise à jour impossible."); return; }
                  await loadAll();
                  toastSuccess(row.is_active ? "Désactivé." : "Activé.");
                }}
                onDelete={() =>
                  askDelete(row.name, async () => {
                    const { error } = await supabase.from("domains").delete().eq("id", row.id);
                    if (error) { toastError(`Suppression impossible: ${error.message}`); return; }
                    await loadAll();
                    toastSuccess("Domaine supprimé.");
                  })
                }
              />
            ))}
          </div>
        </Section>

        {/* ─── Colonnes ─── */}
        <Section
          icon={PenLine}
          title="Colonnes / Statuts"
          subtitle="Ordre d'affichage de gauche à droite dans le Kanban."
          badge={`${stats.columns} actives`}
        >
          <div className="mb-4 flex gap-2">
            <input
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Nom de la nouvelle colonne"
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                const name = newColumnName.trim();
                if (!name) return;
                const { error } = await supabase.from("workflow_columns").insert({ name, is_active: true });
                if (error) { toastError(`Ajout impossible: ${error.message}`); return; }
                setNewColumnName("");
                await loadAll();
                toastSuccess("Colonne ajoutée.");
              }}
              className="ui-transition flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {columns.map((row, index) => (
              <div
                key={row.id}
                className={[
                  "flex items-center gap-2 rounded-xl border p-2.5",
                  row.is_active
                    ? "border-[var(--line)] bg-[var(--surface)]"
                    : "border-dashed border-[var(--line)] bg-[var(--surface-soft)] opacity-60",
                ].join(" ")}
              >
                {/* Badge numéro */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-soft)] text-[11px] font-bold text-[color:var(--foreground)]/50">
                  {index + 1}
                </span>

                <input
                  value={draftColumnNames[row.id] ?? row.name}
                  onChange={(e) => setDraftColumnNames((p) => ({ ...p, [row.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const nextName = (draftColumnNames[row.id] ?? "").trim();
                    if (!nextName) return;
                    void (async () => {
                      const { error } = await supabase.from("workflow_columns").update({ name: nextName }).eq("id", row.id);
                      if (error) { toastError("Renommage impossible."); return; }
                      await loadAll();
                      toastSuccess("Colonne renommée.");
                    })();
                  }}
                  className="ui-focus-ring min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--line)] focus:bg-[var(--surface-soft)]"
                />

                {/* Sauvegarder */}
                <button type="button" title="Enregistrer"
                  onClick={async () => {
                    const nextName = (draftColumnNames[row.id] ?? "").trim();
                    if (!nextName) return;
                    const { error } = await supabase.from("workflow_columns").update({ name: nextName }).eq("id", row.id);
                    if (error) { toastError("Renommage impossible."); return; }
                    await loadAll();
                    toastSuccess("Colonne renommée.");
                  }}
                  className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] text-emerald-600 hover:bg-emerald-50"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>

                {/* Monter */}
                <button type="button" title="Monter" disabled={index === 0}
                  onClick={async () => {
                    const reordered = [...columns];
                    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
                    const ok = await updateSortOrder("workflow_columns", reordered);
                    if (ok) { await loadAll(); toastSuccess("Ordre mis à jour."); }
                  }}
                  className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface)] disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>

                {/* Descendre */}
                <button type="button" title="Descendre" disabled={index === columns.length - 1}
                  onClick={async () => {
                    const reordered = [...columns];
                    [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]];
                    const ok = await updateSortOrder("workflow_columns", reordered);
                    if (ok) { await loadAll(); toastSuccess("Ordre mis à jour."); }
                  }}
                  className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface)] disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                {/* Activer/Désactiver */}
                <button type="button" title={row.is_active ? "Désactiver" : "Activer"}
                  onClick={async () => {
                    const { error } = await supabase.from("workflow_columns").update({ is_active: !row.is_active }).eq("id", row.id);
                    if (error) { toastError("Mise à jour impossible."); return; }
                    await loadAll();
                    toastSuccess(row.is_active ? "Désactivée." : "Activée.");
                  }}
                  className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]"
                >
                  {row.is_active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}
                </button>

                {/* Supprimer */}
                <button type="button" title="Supprimer"
                  onClick={() =>
                    askDelete(row.name, async () => {
                      const { error } = await supabase.from("workflow_columns").delete().eq("id", row.id);
                      if (error) { toastError(`Suppression impossible: ${error.message}`); return; }
                      await loadAll();
                      toastSuccess("Colonne supprimée.");
                    })
                  }
                  className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* ─── Archivage ─── */}
        <Section
          icon={Archive}
          title="Archivage automatique"
          subtitle="Les tâches passées en 'Terminé' depuis plus de 24h sont automatiquement archivées."
        >
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="text-lg">✅</span>
            <p className="text-sm text-emerald-800">
              <strong>Délai fixe : 24 heures.</strong> Toute tâche dans la colonne &quot;Terminé&quot; depuis plus d&apos;un jour est automatiquement déplacée dans les Archives. Ce comportement n&apos;est pas configurable.
            </p>
          </div>
        </Section>
      </section>
    </AppShell>
  );
}
