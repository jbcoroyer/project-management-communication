import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import { ideaFromRow } from "../../../../lib/stockIdeasApi";
import type { StockIdeaCategory } from "../../../../lib/stockIdeasTypes";

const SELECT = "id, created_at, title, description, category, status";

export async function GET() {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("stock_ideas")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[public/ideas] GET", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map(ideaFromRow));
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

    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from("stock_ideas")
      .insert({
        title,
        description: String(body.description ?? "").trim() || null,
        category,
        status: "nouveau",
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
