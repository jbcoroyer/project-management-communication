"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "../supabaseBrowser";

export type ProofStatus = "draft" | "in_review" | "changes_requested" | "approved";

export const PROOF_STATUS_LABELS: Record<ProofStatus, string> = {
  draft: "Brouillon",
  in_review: "En relecture",
  changes_requested: "Corrections demandées",
  approved: "Validé",
};

export type ProofVersion = {
  n: number;
  visualUrl: string | null;
  note: string;
  createdAt: string;
};

export type ProofComment = {
  id: string;
  author: string;
  body: string;
  /** Position relative de l'annotation sur le visuel (0-100 %), null = commentaire global. */
  posX: number | null;
  posY: number | null;
  version: number;
  resolved: boolean;
  createdAt: string;
};

export type ProofApprover = {
  name: string;
  decision: "pending" | "approved" | "rejected";
  decidedAt: string | null;
};

export type Proof = {
  id: string;
  createdAt: string;
  title: string;
  companyId: string | null;
  status: ProofStatus;
  currentVersion: number;
  visualUrl: string | null;
  versions: ProofVersion[];
  comments: ProofComment[];
  approvers: ProofApprover[];
};

export type ProofBackend = "supabase" | "local";

const LOCAL_KEY = "v2-proofs";

type ProofRow = {
  id: string;
  created_at: string;
  title: string;
  company_id: string | null;
  status: string | null;
  current_version: number | null;
  visual_url: string | null;
  versions: ProofVersion[] | null;
  comments: ProofComment[] | null;
  approvers: ProofApprover[] | null;
};

function rowToProof(row: ProofRow): Proof {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    companyId: row.company_id,
    status: (row.status as ProofStatus) ?? "draft",
    currentVersion: row.current_version ?? 1,
    visualUrl: row.visual_url,
    versions: Array.isArray(row.versions) ? row.versions : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    approvers: Array.isArray(row.approvers) ? row.approvers : [],
  };
}

function proofToRow(proof: Proof): ProofRow {
  return {
    id: proof.id,
    created_at: proof.createdAt,
    title: proof.title,
    company_id: proof.companyId,
    status: proof.status,
    current_version: proof.currentVersion,
    visual_url: proof.visualUrl,
    versions: proof.versions,
    comments: proof.comments,
    approvers: proof.approvers,
  };
}

function readLocal(): Proof[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Proof[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Proof[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

export function newId(prefix = "proof"): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function detectBackend(supabase: SupabaseClient): Promise<ProofBackend> {
  const { error } = await supabase.from("proofs").select("id").limit(1);
  return error ? "local" : "supabase";
}

/** Recalcule le statut d'une épreuve à partir des décisions d'approbation. */
export function deriveStatus(proof: Proof): ProofStatus {
  if (proof.approvers.length === 0) return proof.status === "draft" ? "draft" : "in_review";
  if (proof.approvers.some((a) => a.decision === "rejected")) return "changes_requested";
  if (proof.approvers.every((a) => a.decision === "approved")) return "approved";
  return "in_review";
}

export function useProofs() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [backend, setBackend] = useState<ProofBackend>("local");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const mode = await detectBackend(supabase);
    setBackend(mode);
    if (mode === "supabase") {
      const { data } = await supabase.from("proofs").select("*").order("created_at", { ascending: false });
      setProofs(((data ?? []) as ProofRow[]).map(rowToProof));
    } else {
      setProofs(readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persist = useCallback(
    async (proof: Proof) => {
      if (backend === "supabase") {
        await supabase.from("proofs").upsert(proofToRow(proof));
      }
    },
    [backend, supabase],
  );

  const createProof = useCallback(
    async (input: { title: string; companyId: string | null; visualUrl: string | null; approvers: string[] }) => {
      const now = new Date().toISOString();
      const proof: Proof = {
        id: newId(),
        createdAt: now,
        title: input.title,
        companyId: input.companyId,
        status: "in_review",
        currentVersion: 1,
        visualUrl: input.visualUrl,
        versions: [{ n: 1, visualUrl: input.visualUrl, note: "Version initiale", createdAt: now }],
        comments: [],
        approvers: input.approvers.map((name) => ({ name, decision: "pending", decidedAt: null })),
      };
      setProofs((prev) => {
        const next = [proof, ...prev];
        if (backend === "local") writeLocal(next);
        return next;
      });
      await persist(proof);
      return proof;
    },
    [backend, persist],
  );

  const updateProof = useCallback(
    async (id: string, mutate: (proof: Proof) => Proof) => {
      let updated: Proof | null = null;
      setProofs((prev) => {
        const next = prev.map((p) => {
          if (p.id !== id) return p;
          updated = mutate(p);
          return updated;
        });
        if (backend === "local") writeLocal(next);
        return next;
      });
      if (updated) await persist(updated);
    },
    [backend, persist],
  );

  const deleteProof = useCallback(
    async (id: string) => {
      setProofs((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (backend === "local") writeLocal(next);
        return next;
      });
      if (backend === "supabase") await supabase.from("proofs").delete().eq("id", id);
    },
    [backend, supabase],
  );

  return { proofs, backend, loading, reload, createProof, updateProof, deleteProof };
}
