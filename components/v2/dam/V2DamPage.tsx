"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FolderOpen, ImageIcon, Plus, Search, Tag, Trash2, Upload } from "lucide-react";
import { useReferenceData } from "../../../lib/useReferenceData";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { DAM_TYPES, searchAssets, useDamAssets, type DamType } from "../../../lib/v2/dam";
import V2PageHeader from "../V2PageHeader";

export default function V2DamPage() {
  const pathname = usePathname();
  const isModernUi = pathname.startsWith("/v2") || pathname.startsWith("/v3");
  const { companies } = useReferenceData();
  const { user } = useCurrentUser();
  const { assets, add, remove, backend } = useDamAssets();
  const fileRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [company, setCompany] = useState(companies[0]?.name ?? "IDENA");
  const [type, setType] = useState<DamType>("Logo");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => searchAssets(assets, query), [assets, query]);

  const addAsset = async () => {
    if (!name.trim()) return;
    if (!file && !url.trim()) return;
    setBusy(true);
    await add({
      name: name.trim(),
      url: url.trim() || undefined,
      company,
      type,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      file,
    });
    setBusy(false);
    setName("");
    setUrl("");
    setFile(null);
    setTags("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const isImage = (u: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u) || u.includes("token=");

  return (
      <div className="space-y-5">
        {isModernUi ? (
          <V2PageHeader
            kicker="Contenu"
            icon={FolderOpen}
            title="Médias"
            description={
              backend === "supabase"
                ? "Bibliothèque partagée (Storage privé + URLs signées)."
                : "Mode local — appliquez la migration V3 pour partager l’équipe."
            }
          />
        ) : (
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <FolderOpen className="h-3.5 w-3.5" /> Bibliothèque d&apos;assets · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">DAM léger multi-marques</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Centralisez logos, visuels et templates par marque, avec recherche par tags.
          </p>
        </header>
        )}

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <section className="ui-surface rounded-2xl p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Ajouter un asset</h2>
            <div className="space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf,video/mp4,video/webm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-[color:var(--foreground)]/60 file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--surface-soft)] file:px-2 file:py-1.5 file:text-xs file:font-semibold"
              />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ou URL externe (Drive…)" className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={company} onChange={(e) => setCompany(e.target.value)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm">
                  {companies.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select value={type} onChange={(e) => setType(e.target.value as DamType)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm">
                  {DAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (séparés par des virgules)" className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
              <button
                type="button"
                disabled={busy || !name.trim() || (!file && !url.trim()) || !user}
                onClick={() => void addAsset()}
                className="ui-transition inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                {file ? <Upload className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {busy ? "Enregistrement…" : "Ajouter"}
              </button>
            </div>
          </section>

          <section className="ui-surface rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
              <Search className="h-4 w-4 text-[color:var(--foreground)]/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par nom, marque ou tag…"
                className="ui-focus-ring w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
                {assets.length === 0 ? "Aucun asset. Ajoutez vos premiers visuels." : "Aucun résultat pour cette recherche."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filtered.map((a) => (
                  <div key={a.id} className="group overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                    <a href={a.url || undefined} target="_blank" rel="noreferrer" className="block aspect-video bg-[var(--surface-soft)]">
                      {a.url && isImage(a.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[color:var(--foreground)]/30">
                          <ImageIcon className="h-8 w-8" />
                        </span>
                      )}
                    </a>
                    <div className="p-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <p className="truncate text-xs font-semibold text-[var(--foreground)]">{a.name}</p>
                        <button type="button" onClick={() => void remove(a.id)} className="ui-transition shrink-0 text-[color:var(--foreground)]/40 hover:text-[var(--danger)]" aria-label="Supprimer">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[10px] text-[color:var(--foreground)]/50">{a.company} · {a.type}</p>
                      {a.tags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {a.tags.slice(0, 3).map((t) => (
                            <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-[var(--surface-soft)] px-1.5 py-0.5 text-[9px] text-[color:var(--foreground)]/55">
                              <Tag className="h-2 w-2" /> {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
  );
}
