"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { SalonMode } from "../../lib/salonTypes";
import { SALON_MODE_LABELS } from "../../lib/salonTypes";
import {
  SALON_CATALOG,
  editionName,
  getCatalogEntry,
  suggestEditionDates,
  type SalonCatalogEntry,
} from "../../lib/salonCatalog";
import SalonLogo from "./SalonLogo";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    mode: SalonMode;
    location: string;
    startDate: string;
    endDate: string;
    hall: string;
    standNumber: string;
    surfaceM2: number | null;
    catalogSlug?: string | null;
    notes?: string;
  }) => Promise<void>;
};

type Step = "pick" | "details";

export default function CreateSalonModal({ open, onClose, onCreate }: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [catalogSlug, setCatalogSlug] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [year, setYear] = useState(2027);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<SalonMode>("B");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hall, setHall] = useState("");
  const [standNumber, setStandNumber] = useState("");
  const [surface, setSurface] = useState("");
  const [busy, setBusy] = useState(false);

  const entry = useMemo(
    () => (catalogSlug ? getCatalogEntry(catalogSlug) : undefined),
    [catalogSlug],
  );

  if (!open) return null;

  const pickCatalog = (e: SalonCatalogEntry) => {
    setCustom(false);
    setCatalogSlug(e.slug);
    setMode(e.mode);
    setLocation(e.defaultLocation);
    const dates = suggestEditionDates(e, year);
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
    setName(editionName(e, year));
    setStep("details");
  };

  const pickCustom = () => {
    setCustom(true);
    setCatalogSlug(null);
    setName("");
    setLocation("");
    setStartDate("");
    setEndDate("");
    setMode("C");
    setStep("details");
  };

  const applyYear = (y: number) => {
    setYear(y);
    if (entry) {
      setName(editionName(entry, y));
      const dates = suggestEditionDates(entry, y);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  };

  const reset = () => {
    setStep("pick");
    setCatalogSlug(null);
    setCustom(false);
    setName("");
    setHall("");
    setStandNumber("");
    setSurface("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        mode,
        location: location.trim(),
        startDate,
        endDate,
        hall: hall.trim(),
        standNumber: standNumber.trim(),
        surfaceM2: surface ? Number(surface) : null,
        catalogSlug,
        notes: entry?.blurb ?? "",
      });
      onClose();
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="ui-surface max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] p-5 shadow-xl"
        role="dialog"
        aria-labelledby="create-salon-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
              {step === "pick" ? "Étape 1 · Catalogue" : "Étape 2 · Édition"}
            </p>
            <h2 id="create-salon-title" className="mt-1 text-lg font-semibold tracking-tight">
              {step === "pick" ? "Quel salon ?" : "Affiner cette édition"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              {step === "pick"
                ? "Choisis un salon connu (ex. SPACE) — on préremplit le mode, le lieu et la checklist."
                : "Vérifie l’année, les dates et le stand. La checklist partira aussi sur le tableau."}
            </p>
          </div>
          <button type="button" className="ui-btn text-xs" onClick={() => { onClose(); reset(); }} disabled={busy}>
            Fermer
          </button>
        </div>

        {step === "pick" ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {SALON_CATALOG.map((e) => (
              <button
                key={e.slug}
                type="button"
                onClick={() => pickCatalog(e)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--surface)]"
              >
                <SalonLogo slug={e.slug} size={44} />
                <div>
                  <p className="text-sm font-semibold">{e.shortName}</p>
                  <p className="text-[11px] text-[color:var(--foreground)]/50">
                    {SALON_MODE_LABELS[e.mode]} · {e.defaultLocation}
                  </p>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={pickCustom}
              className="flex flex-col items-start justify-center gap-1 rounded-2xl border border-dashed border-[var(--line-strong)] p-3 text-left text-sm hover:bg-[var(--surface-soft)]"
            >
              <span className="font-semibold">Autre salon</span>
              <span className="text-[11px] text-[color:var(--foreground)]/50">
                Création libre (mode A/B/C)
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            {entry && (
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-soft)] px-3 py-2.5">
                <SalonLogo slug={entry.slug} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{entry.name}</p>
                  <p className="truncate text-[11px] text-[color:var(--foreground)]/50">{entry.blurb}</p>
                </div>
                <button type="button" className="ui-btn text-[11px]" onClick={() => setStep("pick")}>
                  Changer
                </button>
              </div>
            )}

            {!custom && entry && (
              <label className="block text-xs">
                Année / édition
                <select
                  className="ui-input mt-1 w-full"
                  value={year}
                  onChange={(e) => applyYear(Number(e.target.value))}
                >
                  {[2026, 2027, 2028, 2029].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-xs">
              Nom de l’édition
              <input
                className="ui-input mt-1 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            {(custom || !entry) && (
              <label className="block text-xs">
                Organisation du stand
                <select
                  className="ui-input mt-1 w-full"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as SalonMode)}
                >
                  {(Object.keys(SALON_MODE_LABELS) as SalonMode[]).map((m) => (
                    <option key={m} value={m}>
                      {SALON_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                Début
                <input
                  type="date"
                  className="ui-input mt-1 w-full"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label className="block text-xs">
                Fin
                <input
                  type="date"
                  className="ui-input mt-1 w-full"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="block text-xs">
              Lieu
              <input
                className="ui-input mt-1 w-full"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="block text-xs">
                Hall
                <input className="ui-input mt-1 w-full" value={hall} onChange={(e) => setHall(e.target.value)} />
              </label>
              <label className="block text-xs">
                Stand
                <input
                  className="ui-input mt-1 w-full"
                  value={standNumber}
                  onChange={(e) => setStandNumber(e.target.value)}
                />
              </label>
              <label className="block text-xs">
                m²
                <input
                  type="number"
                  min={0}
                  className="ui-input mt-1 w-full"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                />
              </label>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button type="button" className="ui-btn text-xs" onClick={() => setStep("pick")} disabled={busy}>
                Retour catalogue
              </button>
              <button type="submit" className="ui-btn ui-btn-primary text-xs" disabled={busy}>
                {busy ? "Création…" : "Créer le salon"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
