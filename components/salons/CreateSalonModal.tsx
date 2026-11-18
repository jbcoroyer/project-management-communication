"use client";

import { useState, type FormEvent } from "react";
import type { SalonMode } from "../../lib/salonTypes";
import { SALON_MODE_LABELS } from "../../lib/salonTypes";

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
  }) => Promise<void>;
};

export default function CreateSalonModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<SalonMode>("B");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hall, setHall] = useState("");
  const [standNumber, setStandNumber] = useState("");
  const [surface, setSurface] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

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
      });
      onClose();
      setName("");
      setLocation("");
      setHall("");
      setStandNumber("");
      setSurface("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="ui-surface w-full max-w-lg rounded-2xl p-5 shadow-xl"
        role="dialog"
        aria-labelledby="create-salon-title"
      >
        <h2 id="create-salon-title" className="text-base font-semibold">
          Nouveau salon
        </h2>
        <p className="mt-1 text-xs text-[color:var(--foreground)]/50">
          Le mode préremplit checklist et contacts.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-xs">
            Nom
            <input
              className="ui-input mt-1 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs">
            Mode
            <select
              className="ui-input mt-1 w-full"
              value={mode}
              onChange={(e) => setMode(e.target.value as SalonMode)}
            >
              {(Object.keys(SALON_MODE_LABELS) as SalonMode[]).map((m) => (
                <option key={m} value={m}>
                  {m} — {SALON_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
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
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="ui-btn text-xs" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="ui-btn ui-btn-primary text-xs" disabled={busy}>
            {busy ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
