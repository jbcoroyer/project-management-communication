"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const loadUser = useCallback(async () => {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError && isInvalidRefreshTokenError(authError)) {
      const redirected = await clearInvalidSupabaseSession(supabase);
      if (!redirected) {
        setUser(null);
        setLoading(false);
      }
      return;
    }

    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, team_member_id, team_members(display_name, job_title, avatar_url)")
      .eq("id", authUser.id)
      .maybeSingle();

    const member = (profile?.team_members as {
      display_name?: string;
      job_title?: string | null;
      avatar_url?: string | null;
    } | null) ?? null;

    setUser({
      id: authUser.id,
      email: authUser.email ?? "",
      displayName: (profile?.display_name as string | null) ?? null,
      teamMemberId: (profile?.team_member_id as string | null) ?? null,
      teamMemberName: member?.display_name ?? null,
      jobTitle: member?.job_title ?? null,
      avatarUrl: member?.avatar_url ?? null,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await loadUser();
    };

    void run();

    const { data: listener } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        if (mounted) setUser(null);
      } else if (event === "SIGNED_IN") {
        void loadUser();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadUser]);

  const reload = useCallback(() => {
    setLoading(true);
    void loadUser();
  }, [loadUser]);

  return { user, loading, reload };
}
