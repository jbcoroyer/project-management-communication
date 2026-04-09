import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const DEFAULT_FREE_MODELS = [
  "openrouter/free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-3-4b-it:free",
  "openai/gpt-oss-20b:free",
];

type AiRequestBody = {
  prompt?: string;
  context?: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "IA cloud non configurée. Ajoutez OPENROUTER_API_KEY (free-tier) côté serveur.",
          blocked: true,
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as AiRequestBody;
    const prompt = body.prompt?.trim() ?? "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt vide." }, { status: 400 });
    }

    const preferredModel = process.env.OPENROUTER_FREE_MODEL?.trim();
    const discoveredFreeModels: string[] = [];

    try {
      const modelsRes = await fetch(OPENROUTER_MODELS_URL, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "IDENA PM App",
        },
        cache: "no-store",
      });
      if (modelsRes.ok) {
        const modelsJson = (await modelsRes.json()) as {
          data?: Array<{ id?: string }>;
        };
        for (const model of modelsJson.data ?? []) {
          const id = model.id?.trim();
          if (id && id.includes(":free")) discoveredFreeModels.push(id);
        }
      }
    } catch {
      // Silencieux: fallback sur la liste interne.
    }

    const candidateModels = Array.from(
      new Set([
        ...(preferredModel ? [preferredModel] : []),
        ...DEFAULT_FREE_MODELS,
        ...discoveredFreeModels,
      ]),
    );

    let lastStatus = 500;
    let lastDetails = "";

    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "IDENA PM App",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: [
                "Tu réponds en français.",
                "Tu n'inventes rien: tu travailles UNIQUEMENT à partir du bloc DONNEES fourni par l'utilisateur.",
                "Sans bloc DONNEES ou s'il est vide, réponds en une phrase: aucune tâche à analyser.",
                "INTERDIT — phrases génériques sans nom de tâche réelle, par exemple:",
                "'Suivi des tâches Kanban', 'Priorisation des actions', 'Coordination des équipes',",
                "'Vérification des échéances', 'Optimisation des ressources', 'Suivi des objectifs',",
                "'Gestion des blocages', 'Finalisation des tâches', 'Mise à jour des rapports'.",
                "Chaque point du plan DOIT citer le titre exact d'une tâche entre guillemets « ... » copié depuis DONNEES.",
                "Format: multi-lignes, sections **Plan de la semaine**, **A lancer aujourd'hui**, **Risques / blocages**, **Prochaine revue**.",
                "Lignes 1) 2) avec **« titre tâche »** en début de ligne puis action concrète. Pas de tableaux. Pas de symbole |.",
                "Gras ** sur titres de tâches, dates, P1/P2/P3.",
              ].join(" "),
            },
            {
              role: "user",
              content: body.context
                ? [
                    `Question: ${prompt}`,
                    "",
                    "RAPPEL AVANT DE RÉDIGER — Si une ligne ne contient pas « ... » avec un titre présent dans DONNEES en dessous, la réponse est incorrecte.",
                    "",
                    body.context,
                    "",
                    "Réponds maintenant en t'appuyant UNIQUEMENT sur DONNEES ci-dessus.",
                  ].join("\n")
                : prompt,
            },
          ],
          temperature: 0.15,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);

      if (response.status === 429 || response.status === 402) {
        return NextResponse.json(
          {
            error: "Quota gratuit atteint. Réessaie plus tard.",
            blocked: true,
          },
          { status: 429 },
        );
      }

      if (!response.ok) {
        lastStatus = response.status;
        lastDetails = (await response.text()).slice(0, 250);
        // 404/400 sur un modèle -> on tente le suivant.
        if (response.status === 400 || response.status === 404) {
          continue;
        }
        return NextResponse.json(
          { error: `IA indisponible (${response.status})`, details: lastDetails },
          { status: 502 },
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      return NextResponse.json({ content, blocked: false, provider: "openrouter-free", model });
    }

    return NextResponse.json(
      {
        error: `Aucun modèle gratuit disponible actuellement (${lastStatus}).`,
        details: lastDetails,
        blocked: true,
      },
      { status: 503 },
    );
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: isAbort ? "Timeout IA. Réessaie." : "Erreur IA inconnue.",
        blocked: false,
      },
      { status: 500 },
    );
  }
}
