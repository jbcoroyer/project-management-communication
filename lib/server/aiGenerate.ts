/**
 * Couche IA V2 — utilise OpenRouter si `OPENROUTER_API_KEY` est défini,
 * sinon bascule sur un générateur local déterministe (aucune dépendance réseau).
 *
 * Le repli local permet à toutes les fonctionnalités IA de la V2 de fonctionner
 * immédiatement, sans clé, avec des sorties utiles quoique non « intelligentes ».
 */

export type AiBackend = "openrouter" | "local";

const NETWORK_STYLES: Record<string, { max: number; tone: string; hashtags: number; emoji: boolean }> = {
  LinkedIn: { max: 700, tone: "professionnel et inspirant", hashtags: 3, emoji: false },
  Instagram: { max: 300, tone: "visuel et chaleureux", hashtags: 8, emoji: true },
  Facebook: { max: 400, tone: "convivial et accessible", hashtags: 2, emoji: true },
  X: { max: 240, tone: "percutant et concis", hashtags: 2, emoji: false },
  Twitter: { max: 240, tone: "percutant et concis", hashtags: 2, emoji: false },
};

function keywordsFrom(text: string): string[] {
  const stop = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "à", "au", "aux", "pour", "avec",
    "sur", "dans", "par", "en", "que", "qui", "nos", "notre", "vos", "votre", "ce", "cette",
    "est", "sont", "plus", "the", "and", "for", "with",
  ]);
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.has(w)),
    ),
  ).slice(0, 6);
}

function hashtagify(words: string[], count: number): string {
  return words
    .slice(0, count)
    .map((w) => `#${w.charAt(0).toUpperCase()}${w.slice(1)}`)
    .join(" ");
}

function localRepurpose(source: string, networks: string[]): Record<string, string> {
  const kw = keywordsFrom(source);
  const firstSentence = source.split(/[.!?\n]/)[0]?.trim() || source.trim();
  const out: Record<string, string> = {};

  for (const network of networks) {
    const style = NETWORK_STYLES[network] ?? { max: 400, tone: "clair", hashtags: 3, emoji: false };
    const emoji = style.emoji ? "✨ " : "";
    let body = firstSentence;
    if (body.length > style.max - 60) body = `${body.slice(0, style.max - 63)}…`;
    const cta =
      network === "LinkedIn"
        ? "\n\nQu'en pensez-vous ? Réagissez en commentaire."
        : network === "Instagram"
          ? "\n\n👉 Plus d'infos en bio."
          : "";
    const tags = hashtagify(kw, style.hashtags);
    out[network] = `${emoji}${body}${cta}${tags ? `\n\n${tags}` : ""}`.trim();
  }
  return out;
}

function localSummary(title: string, bullets: string[]): string {
  const lines = bullets.filter(Boolean).slice(0, 8).map((b) => `• ${b}`);
  return `${title}\n\n${lines.join("\n")}`;
}

async function callOpenRouter(prompt: string, system: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function aiRepurpose(input: {
  source: string;
  networks: string[];
}): Promise<{ backend: AiBackend; variants: Record<string, string> }> {
  const networks = input.networks.length > 0 ? input.networks : ["LinkedIn"];
  const system =
    "Tu es le responsable éditorial social media d'IDENA (nutrition animale). Tu adaptes un contenu source en variantes par réseau, en français, en respectant le ton et les contraintes de longueur de chaque plateforme. Réponds en JSON : { \"LinkedIn\": \"…\", … }.";
  const prompt = `Contenu source :\n${input.source}\n\nRéseaux cibles : ${networks.join(", ")}. Génère une variante adaptée par réseau.`;

  const raw = await callOpenRouter(prompt, system);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const variants: Record<string, string> = {};
      for (const n of networks) if (parsed[n]) variants[n] = parsed[n];
      if (Object.keys(variants).length > 0) return { backend: "openrouter", variants };
    } catch {
      // Réponse non-JSON : on retombe sur le local.
    }
  }
  return { backend: "local", variants: localRepurpose(input.source, networks) };
}

export async function aiSummary(input: {
  title: string;
  bullets: string[];
  context?: string;
}): Promise<{ backend: AiBackend; text: string }> {
  const system =
    "Tu es l'assistant de pilotage du service Communication d'IDENA. Tu produis des synthèses courtes, actionnables et factuelles en français à partir des données fournies.";
  const prompt = `Titre : ${input.title}\nDonnées :\n${input.bullets.join("\n")}${input.context ? `\nContexte : ${input.context}` : ""}\n\nRédige une synthèse claire (5-8 puces max) avec, si pertinent, les priorités.`;

  const raw = await callOpenRouter(prompt, system);
  if (raw) return { backend: "openrouter", text: raw.trim() };
  return { backend: "local", text: localSummary(input.title, input.bullets) };
}

export function generateRetexDraft(input: {
  eventName: string;
  allocatedBudget: number;
  consumedTotal: number;
  taskProgressPct: number;
  leads?: number;
  meetings?: number;
}): string {
  const delta = input.consumedTotal - input.allocatedBudget;
  const budgetLine =
    delta > 0
      ? `Dépassement budgétaire de ${delta.toLocaleString("fr-FR")} €.`
      : `Budget respecté (marge de ${Math.abs(delta).toLocaleString("fr-FR")} €).`;
  return [
    `RETEX — ${input.eventName}`,
    "",
    "Objectifs vs résultats :",
    `• Avancement des tâches : ${input.taskProgressPct} %`,
    input.leads != null ? `• Leads générés : ${input.leads}` : "• Leads générés : à renseigner",
    input.meetings != null ? `• Réunions tenues : ${input.meetings}` : "• Réunions tenues : à renseigner",
    "",
    "Budget :",
    `• Alloué : ${input.allocatedBudget.toLocaleString("fr-FR")} €`,
    `• Consommé : ${input.consumedTotal.toLocaleString("fr-FR")} €`,
    `• ${budgetLine}`,
    "",
    "Ce qui a marché :",
    "• …",
    "",
    "À améliorer pour la prochaine édition :",
    "• …",
    "",
    "Actions de suivi :",
    "• …",
  ].join("\n");
}
