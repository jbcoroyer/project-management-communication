"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import {
  clearInvalidSupabaseSession,
  isInvalidRefreshTokenError,
} from "./supabaseAuthRecovery";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string | null;
  teamMemberId: string | null;
  teamMemberName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  role: "admin" | "user";
  isAdmin: boolean;
};

type CurrentUserContextValue = {
  user: CurrentUser | null;
  loading: boolean;
  reload: () => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

async function fetchProfile(
  supabase: ReturnType<typeof getSupabaseBrowser>,
  authUser: { id: string; email?: string | null },
): Promise<CurrentUser> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, team_member_id, role, team_members(display_name, job_title, avatar_url)")
    .eq("id", authUser.id)
    .maybeSingle();

  const member = (profile?.team_members as {
    display_name?: string;
    job_title?: string | null;
    avatar_url?: string | null;
  } | null) ?? null;

  const role = (profile?.role as string | null) === "admin" ? "admin" : "user";

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    displayName: (profile?.display_name as string | null) ?? null,
    teamMemberId: (profile?.team_member_id as string | null) ?? null,
    teamMemberName: member?.display_name ?? null,
    jobTitle: member?.job_title ?? null,
    avatarUrl: member?.avatar_url ?? null,
    role,
    isAdmin: role === "admin",
  };
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<CurrentUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const loadUser = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent && !userRef.current) {
        setLoading(true);
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError && isInvalidRefreshTokenError(sessionError)) {
        const redirected = await clearInvalidSupabaseSession(supabase);
        if (!redirected) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const sessionUser = session?.user;
      if (!sessionUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const nextUser = await fetchProfile(supabase, sessionUser);
        setUser(nextUser);
      } catch {
        if (!userRef.current) setUser(null);
      } finally {
        setLoading(false);
      }

      // Validation serveur en arrière-plan (sans bloquer l'UI).
      void supabase.auth.getUser().then(({ error: authError }: { error: Error | null }) => {
        if (authError && isInvalidRefreshTokenError(authError)) {
          void clearInvalidSupabaseSession(supabase);
        }
      });
    },
    [supabase],
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await loadUser();
    };

    void run();

    const { data: listener } = supabase.auth.onAuthStateChange((event: string) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        void loadUser({ silent: event === "TOKEN_REFRESHED" });
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUser, supabase]);

  const reload = useCallback(() => {
    void loadUser();
  }, [loadUser]);

  const value = useMemo(
    () => ({ user, loading, reload }),
    [user, loading, reload],
  );

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser doit être utilisé sous CurrentUserProvider.");
  }
  return ctx;
}
