"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/server/supabaseServer";
import { getCurrentWorkspaceId } from "../../lib/server/currentWorkspace";
import { createSalon } from "../../lib/salonData";
import { matchCatalogFromName } from "../../lib/salonCatalog";

export type CreateSalonFromCalendarInput = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  mode?: "A" | "B" | "C";
  catalogSlug?: string | null;
};

export type CreateSalonResult = { ok: true; salonId: string } | { ok: false; error: string };

/** Création salon depuis l’agenda — pousse checklist + tâches board. */
export async function createSalonFromCalendar(
  input: CreateSalonFromCalendarInput,
): Promise<CreateSalonResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Le nom du salon est obligatoire." };
  if (!input.startDate || !input.endDate) {
    return { ok: false, error: "Dates obligatoires." };
  }

  const supabase = await createServerSupabase();
  const organizationId = await getCurrentWorkspaceId(supabase);
  if (!organizationId) return { ok: false, error: "Aucun espace actif." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const matched = matchCatalogFromName(name);
  const mode = input.mode ?? matched?.mode ?? "C";
  const catalogSlug = input.catalogSlug ?? matched?.slug ?? null;

  try {
    const salon = await createSalon(supabase, organizationId, user?.id ?? null, {
      name,
      mode,
      location: input.location.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      catalogSlug,
      adminName: user?.email ?? "",
    });
    revalidatePath("/v3/salons");
    revalidatePath(`/v3/salons/${salon.id}`);
    revalidatePath("/v3/dashboard/calendar");
    revalidatePath("/v2/dashboard/calendar");
    return { ok: true, salonId: salon.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Création salon impossible",
    };
  }
}
