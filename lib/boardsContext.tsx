"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useWorkspaceOptional } from "./workspaceContext";
import { useServicesOptional } from "./servicesContext";
import {
  parseBoardCapabilities,
  type BoardCapabilities,
  type BoardField,
  type BoardFieldType,
  type OrgBoard,
} from "./boards";

type BoardsContextValue = {
  boards: OrgBoard[];
  loading: boolean;
  reload: () => Promise<void>;
  createBoard: (input: {
    name: string;
    capabilities: BoardCapabilities;
    serviceId?: string | null;
    description?: string;
    fields?: { label: string; key?: string; fieldType?: BoardFieldType }[];
  }) => Promise<OrgBoard>;
  getBoard: (id: string) => OrgBoard | undefined;
  loadBoardFields: (boardId: string) => Promise<BoardField[]>;
  /** Boards visibles selon le service actif (soft). */
  visibleBoards: OrgBoard[];
};

const BoardsContext = createContext<BoardsContextValue | null>(null);

type BoardRow = {
  id: string;
  organization_id: string;
  service_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  capabilities: unknown;
  is_default: boolean;
  sort_order: number;
};

function mapBoard(row: BoardRow): OrgBoard {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    serviceId: row.service_id ? String(row.service_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ?? null,
    icon: row.icon ?? null,
    capabilities: parseBoardCapabilities(row.capabilities),
    isDefault: Boolean(row.is_default),
    sortOrder: Number(row.sort_order) || 0,
  };
}

export function BoardsProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspaceOptional();
  const services = useServicesOptional();
  const workspaceId = workspace?.workspaceId ?? null;
  const activeServiceId = services?.activeServiceId ?? null;
  const activeServiceIds = useMemo(
    () => new Set((services?.services ?? []).map((s) => s.id)),
    [services?.services],
  );
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [boards, setBoards] = useState<OrgBoard[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setBoards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("boards")
        .select(
          "id, organization_id, service_id, name, slug, description, icon, capabilities, is_default, sort_order",
        )
        .eq("organization_id", workspaceId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setBoards(((data ?? []) as BoardRow[]).map(mapBoard));
    } catch (err) {
      console.error("boards reload failed", err);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createBoard = useCallback(
    async (input: {
      name: string;
      capabilities: BoardCapabilities;
      serviceId?: string | null;
      description?: string;
      fields?: { label: string; key?: string; fieldType?: BoardFieldType }[];
    }) => {
      if (!workspaceId) throw new Error("Aucun espace actif");
      const { data, error } = await supabase.rpc("create_board", {
        p_org_id: workspaceId,
        p_name: input.name,
        p_capabilities: input.capabilities,
        p_service_id: input.serviceId ?? null,
        p_description: input.description ?? null,
        p_icon: null,
        p_fields: (input.fields ?? []).map((f) => ({
          label: f.label,
          key: f.key ?? null,
          field_type: f.fieldType ?? "text",
        })),
      });
      if (error) throw error;
      const board = mapBoard(data as BoardRow);
      await reload();
      return board;
    },
    [reload, supabase, workspaceId],
  );

  const getBoard = useCallback(
    (id: string) => boards.find((b) => b.id === id),
    [boards],
  );

  const loadBoardFields = useCallback(
    async (boardId: string): Promise<BoardField[]> => {
      const { data, error } = await supabase
        .from("board_fields")
        .select("id, board_id, key, label, field_type, config, sort_order")
        .eq("board_id", boardId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as {
        id: string;
        board_id: string;
        key: string;
        label: string;
        field_type: string;
        config: Record<string, unknown> | null;
        sort_order: number;
      }[]).map((row) => ({
        id: String(row.id),
        boardId: String(row.board_id),
        key: String(row.key),
        label: String(row.label),
        fieldType: (["text", "number", "date", "select"].includes(row.field_type)
          ? row.field_type
          : "text") as BoardFieldType,
        config: row.config ?? {},
        sortOrder: Number(row.sort_order) || 0,
      }));
    },
    [supabase],
  );

  const visibleBoards = useMemo(() => {
    // Masque les tableaux liés à un service désactivé (ADV, R&D, GdP…).
    const kept = boards.filter(
      (b) =>
        b.isDefault ||
        b.serviceId == null ||
        activeServiceIds.size === 0 ||
        activeServiceIds.has(b.serviceId),
    );
    if (!activeServiceId) return kept;
    return kept.filter(
      (b) => b.serviceId == null || b.serviceId === activeServiceId || b.isDefault,
    );
  }, [activeServiceId, activeServiceIds, boards]);

  const value = useMemo<BoardsContextValue>(
    () => ({
      boards,
      loading,
      reload,
      createBoard,
      getBoard,
      loadBoardFields,
      visibleBoards,
    }),
    [boards, loading, reload, createBoard, getBoard, loadBoardFields, visibleBoards],
  );

  return (
    <BoardsContext.Provider value={value}>{children}</BoardsContext.Provider>
  );
}

export function useBoards(): BoardsContextValue {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error("useBoards doit être utilisé sous BoardsProvider.");
  return ctx;
}

export function useBoardsOptional(): BoardsContextValue | null {
  return useContext(BoardsContext);
}
