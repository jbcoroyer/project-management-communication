"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "../supabaseBrowser";
import { toastError, toastSuccess } from "../toast";
import { useWorkspace } from "../workspaceContext";

export const DAM_TYPES = ["Logo", "Visuel", "Template", "Document", "Vidéo", "Autre"] as const;
export type DamType = (typeof DAM_TYPES)[number];

export const DAM_BUCKET = "dam-assets";
export const DAM_MAX_BYTES = 20 * 1024 * 1024;
export const DAM_SIGNED_URL_SECONDS = 60 * 60;

export type DamAsset = {
  id: string;
  name: string;
  url: string;
  company: string;
  type: DamType;
  tags: string[];
  createdAt: string;
  storagePath: string | null;
  createdBy: string | null;
};

type DamRow = {
  id: string;
  created_at: string;
  name: string;
  company: string;
  asset_type: string;
  tags: string[] | null;
  storage_path: string | null;
  external_url: string | null;
  created_by: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
};

const LOCAL_KEY = "v2-dam-assets";

function readLocal(): DamAsset[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as DamAsset[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(list: DamAsset[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

async function signDamUrl(
  supabase: SupabaseClient,
  storagePath: string | null,
  externalUrl: string | null,
): Promise<string> {
  if (storagePath) {
    const { data } = await supabase.storage
      .from(DAM_BUCKET)
      .createSignedUrl(storagePath, DAM_SIGNED_URL_SECONDS);
    if (data?.signedUrl) return data.signedUrl;
  }
  return externalUrl ?? "";
}

function mapDamRow(row: DamRow, url: string): DamAsset {
  const type = (DAM_TYPES as readonly string[]).includes(row.asset_type)
    ? (row.asset_type as DamType)
    : "Autre";
  return {
    id: row.id,
    name: row.name,
    url,
    company: row.company ?? "",
    type,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    storagePath: row.storage_path,
    createdBy: row.created_by,
  };
}

async function detectBackend(supabase: SupabaseClient): Promise<"supabase" | "local"> {
  const { error } = await supabase.from("dam_assets").select("id").limit(1);
  return error ? "local" : "supabase";
}

export function useDamAssets() {
  const supabase = getSupabaseBrowser();
  const { workspaceId } = useWorkspace();
  const [assets, setAssets] = useState<DamAsset[]>([]);
  const [backend, setBackend] = useState<"supabase" | "local">("local");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    if (!workspaceId) {
      setAssets([]);
      setLoading(false);
      return;
    }
    const mode = await detectBackend(supabase);
    setBackend(mode);
    if (mode === "local") {
      setAssets(readLocal());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("dam_assets")
      .select("*")
      .eq("organization_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      toastError(`Médias indisponibles : ${error.message}`);
      setAssets([]);
    } else {
      const rows = (data ?? []) as DamRow[];
      const mapped = await Promise.all(
        rows.map(async (row) => mapDamRow(row, await signDamUrl(supabase, row.storage_path, row.external_url))),
      );
      setAssets(mapped);
    }
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(
    async (asset: {
      name: string;
      url?: string;
      company: string;
      type: DamType;
      tags: string[];
      file?: File | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (backend === "local" || !user) {
        const next: DamAsset = {
          id: globalThis.crypto?.randomUUID?.() ?? `dam-${Date.now()}`,
          name: asset.name,
          url: asset.url ?? "",
          company: asset.company,
          type: asset.type,
          tags: asset.tags,
          createdAt: new Date().toISOString(),
          storagePath: null,
          createdBy: user?.id ?? null,
        };
        setAssets((prev) => {
          const list = [next, ...prev];
          writeLocal(list);
          return list;
        });
        toastSuccess("Asset ajouté (local)");
        return next;
      }

      let storagePath: string | null = null;
      let fileName: string | null = null;
      let fileMime: string | null = null;
      let fileSizeBytes: number | null = null;
      let externalUrl: string | null = asset.url?.trim() || null;

      if (asset.file) {
        if (asset.file.size > DAM_MAX_BYTES) {
          toastError("Fichier trop volumineux (max. 20 Mo).");
          return null;
        }
        const ext = (asset.file.name.split(".").pop() ?? "bin").replace(/[^a-zA-Z0-9]/g, "");
        storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(DAM_BUCKET)
          .upload(storagePath, asset.file, {
            upsert: false,
            contentType: asset.file.type || undefined,
          });
        if (upErr) {
          toastError(upErr.message);
          return null;
        }
        fileName = asset.file.name;
        fileMime = asset.file.type || null;
        fileSizeBytes = asset.file.size;
        externalUrl = null;
      }

      if (!storagePath && !externalUrl) {
        toastError("Ajoutez un fichier ou une URL.");
        return null;
      }

      if (!workspaceId) {
        toastError("Aucun espace actif.");
        return null;
      }

      const { data, error } = await supabase
        .from("dam_assets")
        .insert({
          name: asset.name.trim(),
          company: asset.company,
          asset_type: asset.type,
          tags: asset.tags,
          storage_path: storagePath,
          external_url: externalUrl,
          file_name: fileName,
          file_mime: fileMime,
          file_size_bytes: fileSizeBytes,
          created_by: user.id,
          organization_id: workspaceId,
        })
        .select("*")
        .single();

      if (error || !data) {
        toastError(error?.message ?? "Enregistrement impossible");
        return null;
      }
      const row = data as DamRow;
      const mapped = mapDamRow(row, await signDamUrl(supabase, row.storage_path, row.external_url));
      setAssets((prev) => [mapped, ...prev]);
      toastSuccess("Asset enregistré");
      return mapped;
    },
    [backend, supabase, workspaceId],
  );

  const remove = useCallback(
    async (id: string) => {
      if (backend === "local") {
        setAssets((prev) => {
          const next = prev.filter((a) => a.id !== id);
          writeLocal(next);
          return next;
        });
        return;
      }
      const target = assets.find((a) => a.id === id);
      if (target?.storagePath) {
        await supabase.storage.from(DAM_BUCKET).remove([target.storagePath]);
      }
      const { error } = await supabase.from("dam_assets").delete().eq("id", id);
      if (error) {
        toastError(error.message);
        return;
      }
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toastSuccess("Asset supprimé");
    },
    [assets, backend, supabase],
  );

  return { assets, add, remove, loading, backend, reload };
}

/** Recherche simple par mot-clé sur nom, tags, société et type. */
export function searchAssets(assets: DamAsset[], query: string): DamAsset[] {
  const q = query.trim().toLowerCase();
  if (!q) return assets;
  const terms = q.split(/\s+/);
  return assets.filter((a) => {
    const haystack = [a.name, a.company, a.type, ...a.tags].join(" ").toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
