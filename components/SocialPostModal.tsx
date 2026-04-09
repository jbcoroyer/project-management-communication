"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Trash2, X } from "lucide-react";
import type { ReferenceRecord } from "../lib/referenceData";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import { toastError } from "../lib/toast";
import CompanyAvatar from "./CompanyAvatar";
import {
  socialFormatOptions,
  socialThematicOptions,
  socialPostStatuses,
  type SocialPost,
  type SocialPostDraft,
  type SocialPostStatus,
} from "../lib/socialTypes";

type SocialPostModalProps = {
  open: boolean;
  initialPost: SocialPost | null;
  seedScheduledAt?: string | null;
  defaultResponsibleMemberId?: string | null;
  forcedCompanyId?: string;
  forcedCompanyName?: string;
  admins: ReferenceRecord[];
  companies: ReferenceRecord[];
  onClose: () => void;
  onSubmit: (payload: { draft: SocialPostDraft; recurrenceCount: number }) => Promise<void> | void;
};

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDatetimeInputValue(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildScheduledAt(value: string, allDay: boolean): string {
  if (allDay) {
    return new Date(`${value}T12:00:00`).toISOString();
  }
  return new Date(value).toISOString();
}

export default function SocialPostModal(props: SocialPostModalProps) {
  const {
    open,
    initialPost,
    seedScheduledAt,
    defaultResponsibleMemberId,
    forcedCompanyId,
    forcedCompanyName,
    admins,
    companies,
    onClose,
    onSubmit,
  } = props;
  const isEditing = !!initialPost?.id;
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [status, setStatus] = useState<SocialPostStatus>("Idée");
  const [targetNetworks, setTargetNetworks] = useState<string[]>([]);
  const [timeSpentHoursInput, setTimeSpentHoursInput] = useState("");
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [visualPreviewUrl, setVisualPreviewUrl] = useState<string | null>(null);
  const [format, setFormat] = useState("");
  const [notes, setNotes] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [responsibleMemberId, setResponsibleMemberId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [campaignLabel, setCampaignLabel] = useState("");
  const [thematic, setThematic] = useState("");
  const [objective, setObjective] = useState("");
  const [wording, setWording] = useState("");
  const [wordingEn, setWordingEn] = useState("");
  const [visualUrl, setVisualUrl] = useState("");
  const [publicationStatus, setPublicationStatus] = useState("");
  const [reactionsCount, setReactionsCount] = useState("");
  const [engagementRate, setEngagementRate] = useState("");
  const [impressionsCount, setImpressionsCount] = useState("");
  const [followersCount, setFollowersCount] = useState("");
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  const forcedCompanyRecord = useMemo(
    () => (forcedCompanyId ? companies.find((c) => c.id === forcedCompanyId) ?? null : null),
    [forcedCompanyId, companies],
  );

  const selectedCompanyRecord = useMemo(
    () => (companyId ? companies.find((c) => c.id === companyId) ?? null : null),
    [companyId, companies],
  );

  const defaultDraft = useMemo(() => {
    const now = seedScheduledAt ? new Date(seedScheduledAt) : new Date();
    now.setMinutes(0, 0, 0);
    return {
      title: "",
      scheduledAt: now.toISOString(),
      allDay: true,
      status: "Idée" as SocialPostStatus,
      targetNetworks: [],
      timeSpentHours: 0,
      format: null,
      notes: null,
      driveUrl: null,
      responsibleMemberId: defaultResponsibleMemberId ?? null,
      companyId: forcedCompanyId ?? null,
      campaignLabel: null,
      thematic: null,
      objective: null,
      wording: null,
      wordingEn: null,
      visualUrl: null,
      publicationStatus: null,
      reactionsCount: null,
      engagementRate: null,
      impressionsCount: null,
      followersCount: null,
    };
  }, [defaultResponsibleMemberId, forcedCompanyId, seedScheduledAt]);

  useEffect(() => {
    if (!open) return;
    const source = initialPost ?? defaultDraft;
    setTitle(source.title);
    setAllDay(source.allDay);
    setDateValue(toDateInputValue(source.scheduledAt));
    setTimeValue(toDatetimeInputValue(source.scheduledAt));
    setStatus(source.status);
    setTargetNetworks(source.targetNetworks);
    setTimeSpentHoursInput(source.timeSpentHours != null ? String(source.timeSpentHours) : "");
    setFormat(source.format ?? "");
    setNotes(source.notes ?? "");
    setDriveUrl(source.driveUrl ?? "");
    setResponsibleMemberId(source.responsibleMemberId ?? defaultResponsibleMemberId ?? "");
    setCompanyId(forcedCompanyId ?? source.companyId ?? companies[0]?.id ?? "");
    setCampaignLabel(source.campaignLabel ?? "");
    setThematic(source.thematic ?? "");
    setObjective(source.objective ?? "");
    setWording(source.wording ?? "");
    setWordingEn(source.wordingEn ?? "");
    setVisualUrl(source.visualUrl ?? "");
    setPublicationStatus(source.publicationStatus ?? "");
    setReactionsCount(source.reactionsCount != null ? String(source.reactionsCount) : "");
    setEngagementRate(source.engagementRate != null ? String(source.engagementRate) : "");
    setImpressionsCount(source.impressionsCount != null ? String(source.impressionsCount) : "");
    setFollowersCount(source.followersCount != null ? String(source.followersCount) : "");
    setEnableRecurrence(false);
    setRecurrenceCount(4);
  }, [open, initialPost, defaultDraft, defaultResponsibleMemberId, forcedCompanyId, companies]);

  if (!open) return null;

  const handleVisualFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Le fichier doit être une image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toastError("L'image doit faire moins de 2 Mo.");
      return;
    }
    // Révoquer l'ancienne preview pour éviter de garder des blobs en mémoire.
    if (visualPreviewUrl) URL.revokeObjectURL(visualPreviewUrl);
    setVisualFile(file);
    setVisualPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toastError("Le titre du post est obligatoire.");
      return;
    }
    const resolvedCompanyId = (forcedCompanyId ?? companyId ?? "").trim();
    if (!resolvedCompanyId) {
      toastError("Choisissez une entité avant de créer le post.");
      return;
    }
    if (!dateValue && allDay) {
      toastError("Choisissez une date de publication.");
      return;
    }
    if (!timeValue && !allDay) {
      toastError("Choisissez une date et une heure de publication.");
      return;
    }
    const resolvedResponsibleMemberId = (responsibleMemberId || defaultResponsibleMemberId || "").trim();
    if (!resolvedResponsibleMemberId) {
      toastError("Choisissez un responsable pour comptabiliser la charge.");
      return;
    }
    const scheduledAt = buildScheduledAt(allDay ? dateValue : timeValue, allDay);
    const timeSpentHours =
      timeSpentHoursInput.trim() === "" ? 0 : Number(timeSpentHoursInput.replace(",", ".")) || 0;
    setSubmitting(true);
    try {
      let resolvedVisualUrl: string | null = visualUrl.trim() || null;
      if (visualFile) {
        const extRaw = visualFile.name.split(".").pop() ?? "png";
        const ext = extRaw.trim().toLowerCase() || "png";
        const path = `${resolvedCompanyId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("social-post-visuals")
          .upload(path, visualFile, { upsert: true, contentType: visualFile.type });
        if (upErr) {
          toastError(`Upload visuel impossible : ${upErr.message}`);
          return;
        }
        const { data: urlData } = supabase.storage.from("social-post-visuals").getPublicUrl(path);
        resolvedVisualUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      }
      await onSubmit({
        draft: {
          id: initialPost?.id,
          title: trimmedTitle,
          scheduledAt,
          allDay,
          status,
          targetNetworks,
          format: format || null,
          notes: notes.trim() || null,
          driveUrl: driveUrl.trim() || null,
          responsibleMemberId: resolvedResponsibleMemberId,
          companyId: resolvedCompanyId,
          campaignLabel: campaignLabel.trim() || null,
          thematic: thematic || null,
          objective: objective.trim() || null,
          wording: wording.trim() || null,
          wordingEn: wordingEn.trim() || null,
          visualUrl: resolvedVisualUrl,
          publicationStatus: publicationStatus.trim() || null,
          timeSpentHours,
          reactionsCount: reactionsCount.trim() === "" ? null : Math.max(0, Number(reactionsCount) || 0),
          engagementRate: engagementRate.trim() === "" ? null : Number(engagementRate.replace(",", ".")) || 0,
          impressionsCount: impressionsCount.trim() === "" ? null : Math.max(0, Number(impressionsCount) || 0),
          followersCount: followersCount.trim() === "" ? null : Math.max(0, Number(followersCount) || 0),
        },
        recurrenceCount: enableRecurrence && !isEditing ? Math.max(1, recurrenceCount) : 1,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="ui-surface max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
              Réseaux sociaux
            </p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {isEditing ? "Modifier le post" : "Nouveau post"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Charge de travail estimée (heures)
              </label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={timeSpentHoursInput}
                onChange={(event) => setTimeSpentHoursInput(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Titre court
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Ex. Carrousel nutrition du mois"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Statut
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as SocialPostStatus)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                {socialPostStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Format
              </label>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                <option value="">Non renseigné</option>
                {socialFormatOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 md:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <input
                  id="social-all-day"
                  type="checkbox"
                  checked={allDay}
                  onChange={(event) => setAllDay(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--line-strong)]"
                />
                <label htmlFor="social-all-day" className="text-sm font-semibold text-[var(--foreground)]">
                  Publication à la journée
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                    className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                    required
                  />
                </div>
                {!allDay && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                      Date et heure
                    </label>
                    <input
                      type="datetime-local"
                      value={timeValue}
                      onChange={(event) => setTimeValue(event.target.value)}
                      className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                      required={!allDay}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Réseaux cibles retiré de la modale (ajout + édition unifiés). */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Thématique
              </label>
              <select
                value={thematic}
                onChange={(event) => setThematic(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                <option value="">Non renseignée</option>
                {socialThematicOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Responsable
              </label>
              <select
                value={responsibleMemberId}
                onChange={(event) => setResponsibleMemberId(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                <option value="">Non attribué</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Société
              </label>
              {forcedCompanyId ? (
                <div className="flex items-center gap-3">
                  <CompanyAvatar
                    name={forcedCompanyRecord?.name}
                    logoUrl={forcedCompanyRecord?.logoUrl}
                    className="h-8 w-8 rounded-md border border-[var(--line)] bg-white object-contain"
                    fallbackClassName="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/35"
                  />
                  <input
                    value={forcedCompanyName ?? "Entité sélectionnée"}
                    disabled
                    className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[color:var(--foreground)]/65"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CompanyAvatar
                    name={selectedCompanyRecord?.name}
                    logoUrl={selectedCompanyRecord?.logoUrl}
                    className="h-8 w-8 rounded-md border border-[var(--line)] bg-white object-contain"
                    fallbackClassName="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/35"
                  />
                  <select
                    value={companyId}
                    onChange={(event) => setCompanyId(event.target.value)}
                    className="ui-focus-ring flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                  >
                    <option value="">Non renseignée</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Champs supprimés côté UI (Projet/Campagne, lien de travail). */}

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Objectif du post
              </label>
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Ex. Notoriété"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Wording (FR)
              </label>
              <textarea
                value={wording}
                onChange={(event) => setWording(event.target.value)}
                className="ui-focus-ring min-h-[110px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Wording (EN)
              </label>
              <textarea
                value={wordingEn}
                onChange={(event) => setWordingEn(event.target.value)}
                className="ui-focus-ring min-h-[110px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Visuel (image)
              </label>
              <div
                className={[
                  "ui-transition flex cursor-pointer flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4",
                  "hover:bg-[var(--surface-soft)]",
                ].join(" ")}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const el = document.getElementById("social-visual-input");
                  el?.click();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const el = document.getElementById("social-visual-input");
                    el?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0] ?? null;
                  handleVisualFile(file);
                }}
              >
                <input
                  id="social-visual-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleVisualFile(e.target.files?.[0] ?? null)}
                />

                <div className="flex items-center gap-3">
                  {(visualPreviewUrl || visualUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={visualPreviewUrl ?? visualUrl}
                      alt="Aperçu visuel"
                      className="h-16 w-16 rounded-md border border-[var(--line)] bg-white object-contain"
                    />
                  )}
                  {!visualPreviewUrl && !visualUrl && (
                    <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/40">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]/80">
                      Glissez-déposez une image (ou cliquez)
                    </p>
                    <p className="text-xs text-[color:var(--foreground)]/55">Taille max : 2 Mo</p>
                  </div>
                  {visualPreviewUrl && (
                    <button
                      type="button"
                      title="Retirer l'image"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (visualPreviewUrl) URL.revokeObjectURL(visualPreviewUrl);
                        setVisualFile(null);
                        setVisualPreviewUrl(null);
                      }}
                      className="ui-transition inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {visualFile && (
                  <div className="text-xs text-[color:var(--foreground)]/55">
                    {visualFile.name} ({(visualFile.size / 1024 / 1024).toFixed(2)} Mo)
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Statut publication
              </label>
              <input
                value={publicationStatus}
                onChange={(event) => setPublicationStatus(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Ex. Republication / Publié"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Réactions
              </label>
              <input
                type="number"
                min="0"
                value={reactionsCount}
                onChange={(event) => setReactionsCount(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Taux d&apos;engagement (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={engagementRate}
                onChange={(event) => setEngagementRate(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Impressions
              </label>
              <input
                type="number"
                min="0"
                value={impressionsCount}
                onChange={(event) => setImpressionsCount(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Nombre d&apos;abonnés
              </label>
              <input
                type="number"
                min="0"
                value={followersCount}
                onChange={(event) => setFollowersCount(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Brief / notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="ui-focus-ring min-h-[120px] w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Angle, message clé, CTA, contraintes créa..."
              />
            </div>

            {!isEditing && (
              <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)]/45 p-4 md:col-span-2">
                <div className="mb-3 flex items-center gap-2">
                  <input
                    id="social-recurrence"
                    type="checkbox"
                    checked={enableRecurrence}
                    onChange={(event) => setEnableRecurrence(event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--line-strong)]"
                  />
                  <label htmlFor="social-recurrence" className="text-sm font-semibold text-[var(--foreground)]">
                    Générer une série hebdomadaire
                  </label>
                </div>
                {enableRecurrence && (
                  <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                        Nombre d&apos;occurrences
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="24"
                        value={recurrenceCount}
                        onChange={(event) => setRecurrenceCount(Number(event.target.value) || 2)}
                        className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                      />
                    </div>
                    <p className="self-end text-xs text-[color:var(--foreground)]/65">
                      La première occurrence reprend les informations saisies. Les suivantes sont générées à 7 jours
                      d&apos;intervalle et passent automatiquement au statut <strong>Idée</strong> pour être ajustées une
                      par une.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {submitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer le post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
