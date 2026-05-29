import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../../lib/server/supabaseServer";
import { createSupabaseAdmin } from "../../../../../lib/server/supabaseAdmin";
import { ideaFromRow } from "../../../../../lib/stockIdeasApi";
import type { StockIdeaCategory, StockIdeaStatus } from "../../../../../lib/stockIdeasTypes";

const SELECT = "id, created_at, title, description, category, status";

async function requireAuthenticatedUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise pour modifier une idée." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<{
    title: string;
    description: string;
    category: StockIdeaCategory;
    status: StockIdeaStatus;
  }>;

  const dbPatch: Record<string, unknown> = {};
  if (body.title !== undefined) dbPatch.title = String(body.title).trim();
  if (body.description !== undefined) dbPatch.description = String(body.description).trim() || null;
  if (body.category !== undefined) dbPatch.category = body.category;
  if (body.status !== undefined) dbPatch.status = body.status;

  if (Object.keys(dbPatch).length === 0) {
    return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("stock_ideas")
      .update(dbPatch)
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) {
      console.error("[public/ideas] PATCH", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(ideaFromRow(data));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise pour supprimer une idée." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("stock_ideas").delete().eq("id", id);

    if (error) {
      console.error("[public/ideas] DELETE", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
