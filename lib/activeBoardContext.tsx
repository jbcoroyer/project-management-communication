"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useParams, usePathname } from "next/navigation";
import { useBoardsOptional } from "./boardsContext";
import type { OrgBoard } from "./boards";

type ActiveBoardContextValue = {
  board: OrgBoard | null;
  boardId: string | null;
  /** true si on est sur une route board dédiée ou le kanban legacy (= board défaut). */
  isBoardScoped: boolean;
};

const ActiveBoardContext = createContext<ActiveBoardContextValue>({
  board: null,
  boardId: null,
  isBoardScoped: false,
});

export function ActiveBoardProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const boards = useBoardsOptional();
  const paramId =
    typeof params?.boardId === "string"
      ? params.boardId
      : Array.isArray(params?.boardId)
        ? params.boardId[0]
        : null;

  const value = useMemo<ActiveBoardContextValue>(() => {
    const list = boards?.boards ?? [];
    const defaultBoard = list.find((b) => b.isDefault) ?? list[0] ?? null;

    if (paramId) {
      const board = list.find((b) => b.id === paramId) ?? null;
      return {
        board,
        boardId: board?.id ?? paramId,
        isBoardScoped: true,
      };
    }

    // Kanban legacy /v3/dashboard → board par défaut
    if (pathname?.startsWith("/v3/dashboard") || pathname === "/v3") {
      return {
        board: defaultBoard,
        boardId: defaultBoard?.id ?? null,
        isBoardScoped: Boolean(defaultBoard),
      };
    }

    return { board: null, boardId: null, isBoardScoped: false };
  }, [boards?.boards, paramId, pathname]);

  return (
    <ActiveBoardContext.Provider value={value}>
      {children}
    </ActiveBoardContext.Provider>
  );
}

export function useActiveBoard(): ActiveBoardContextValue {
  return useContext(ActiveBoardContext);
}
