import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "../../../../lib/server/currentWorkspace";
import { createSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import { ideaFromRow } from "../../../../lib/stockIdeasApi";
import type { StockIdeaCategory } from "../../../../lib/stockIdeasTypes";
import { SERVICE_COMMUNICATION_ORG_ID } from "../../../../lib/workspaceModules";

const SELECT = "id, created_at, title, description, category, status";

/** Espace cible : workspace actif si connecté, sinon Service Communication (parcours public). */
async function resolveIdeasOrganizationId(): Promise<string> {
  const supabase = await createServerSupabase();
  const workspaceId = await getCurrentWorkspaceId(supabase);
  return workspaceId ?? SERVICE_COMMUNICATION_ORG_ID;
}

export async function GET() {
  try {
    const organizationId = await resolveIdeasOrganizationId();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("stock_ideas")
      .select(SELECT)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[public/ideas] GET", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const res = NextResponse.json((data ?? []).map(ideaFromRow));
    // Réponse dépendante de la session / de l'espace — pas de cache CDN public.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      category?: StockIdeaCategory;
      status?: string;
    };

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    }

    const validCategories = new Set<StockIdeaCategory>(["materiel", "process", "communication", "autre"]);
    const category = validCategories.has(body.category as StockIdeaCategory)
      ? (body.category as StockIdeaCategory)
      : "autre";

    const organizationId = await resolveIdeasOrganizationId();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("stock_ideas")
      .insert({
        title,
        description: String(body.description ?? "").trim() || null,
        category,
        status: "nouveau",
        organization_id: organizationId,
      })
      .select(SELECT)
      .single();

    if (error) {
      console.error("[public/ideas] POST", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(ideaFromRow(data), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
