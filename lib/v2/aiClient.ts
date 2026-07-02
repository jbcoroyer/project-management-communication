"use client";

export type AiBackend = "openrouter" | "local";

export async function repurposeContent(
  source: string,
  networks: string[],
): Promise<{ backend: AiBackend; variants: Record<string, string> }> {
  const res = await fetch("/api/v2/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "repurpose", source, networks }),
  });
  if (!res.ok) throw new Error("Génération impossible");
  return (await res.json()) as { backend: AiBackend; variants: Record<string, string> };
}

export async function summarize(
  title: string,
  bullets: string[],
  context?: string,
): Promise<{ backend: AiBackend; text: string }> {
  const res = await fetch("/api/v2/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "summary", title, bullets, context }),
  });
  if (!res.ok) throw new Error("Synthèse impossible");
  return (await res.json()) as { backend: AiBackend; text: string };
}
