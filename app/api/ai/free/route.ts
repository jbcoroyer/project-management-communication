import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const FALLBACK_FREE_MODEL = "openai/gpt-oss-20b:free";

type Body = { prompt?: string; context?: string };

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      {
        error:
          "IA cloud non configurée. Ajoutez OPENROUTER_API_KEY (free-tier) côté serveur.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const prompt = body.prompt?.trim() ?? "";
  const context = body.context?.trim() ?? "";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt vide." }, { status: 400 });
  }

  let model = process.env.OPENROUTER_FREE_MODEL?.trim() ?? "";

  if (!model) {
    try {
      const modelsRes = await fetch(OPENROUTER_MODELS_URL, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (modelsRes.ok) {
        const data = (await modelsRes.json()) as { data?: { id: string }[] };
        const free = data.data?.find((m) => m.id.includes(":free"))?.id;
        model = free ?? FALLBACK_FREE_MODEL;
      } else {
        model = FALLBACK_FREE_MODEL;
      }
    } catch {
      model = FALLBACK_FREE_MODEL;
    }
  }

  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "Service Communication IDENA",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Tu réponds en français. Tu t'appuies uniquement sur le contexte fourni (tâches réelles). Pour mentionner une tâche, cite son titre exact entre guillemets français « et ». Reste concis et actionnable.",
        },
        {
          role: "user",
          content: context ? `${context}\n\n---\n\nQuestion : ${prompt}` : prompt,
        },
      ],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = "Erreur fournisseur IA.";
    try {
      const j = JSON.parse(errText) as { error?: { message?: string } };
      message = j.error?.message ?? message;
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      { error: message },
      { status: response.status >= 500 ? 502 : 400 },
    );
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ error: "Réponse vide du modèle." }, { status: 502 });
  }

  return NextResponse.json({
    content,
    blocked: false,
    provider: "openrouter-free",
    model,
  });
}
