"use client";

import { Heart, MessageCircle, MoreHorizontal, Repeat2, Send, ThumbsUp } from "lucide-react";

type SocialPreviewProps = {
  network: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
  visualUrl?: string | null;
};

function Avatar({ name, url }: { name: string; url?: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="h-10 w-10 rounded-full border border-[var(--line)] object-cover" />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
      {initials || "?"}
    </div>
  );
}

function VisualBlock({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-xs text-[color:var(--foreground)]/45">
        Aperçu visuel
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Visuel" className="w-full rounded-lg border border-[var(--line)] object-cover" />
  );
}

/** Rend un post tel qu'il apparaîtra approximativement sur le réseau ciblé. */
export default function SocialPreview({
  network,
  authorName,
  authorAvatarUrl,
  text,
  visualUrl,
}: SocialPreviewProps) {
  const displayText = text.trim() || "Votre texte apparaîtra ici…";

  if (network === "Instagram") {
    return (
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-[var(--line)] bg-white text-slate-900 shadow-sm">
        <div className="flex items-center gap-2 p-3">
          <Avatar name={authorName} url={authorAvatarUrl} />
          <span className="text-sm font-semibold">{authorName}</span>
          <MoreHorizontal className="ml-auto h-4 w-4 text-slate-400" />
        </div>
        <VisualBlock url={visualUrl} />
        <div className="flex items-center gap-4 p-3 text-slate-700">
          <Heart className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </div>
        <p className="whitespace-pre-wrap px-3 pb-3 text-sm">
          <span className="font-semibold">{authorName}</span> {displayText}
        </p>
      </div>
    );
  }

  if (network === "X" || network === "Twitter") {
    return (
      <div className="mx-auto w-full max-w-md rounded-xl border border-[var(--line)] bg-white p-3 text-slate-900 shadow-sm">
        <div className="flex gap-2">
          <Avatar name={authorName} url={authorAvatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">{authorName}</span>{" "}
              <span className="text-slate-500">@{authorName.toLowerCase().replace(/\s+/g, "")}</span>
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{displayText}</p>
            {visualUrl ? <div className="mt-2"><VisualBlock url={visualUrl} /></div> : null}
            <div className="mt-3 flex max-w-xs items-center justify-between text-slate-500">
              <MessageCircle className="h-4 w-4" />
              <Repeat2 className="h-4 w-4" />
              <Heart className="h-4 w-4" />
              <Send className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (network === "Facebook") {
    return (
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-[var(--line)] bg-white text-slate-900 shadow-sm">
        <div className="flex items-center gap-2 p-3">
          <Avatar name={authorName} url={authorAvatarUrl} />
          <div>
            <p className="text-sm font-semibold">{authorName}</p>
            <p className="text-xs text-slate-500">À l'instant · 🌎</p>
          </div>
        </div>
        <p className="whitespace-pre-wrap px-3 pb-3 text-sm">{displayText}</p>
        <VisualBlock url={visualUrl} />
        <div className="flex items-center justify-around border-t border-slate-100 p-2 text-slate-600">
          <span className="flex items-center gap-1 text-xs"><ThumbsUp className="h-4 w-4" /> J'aime</span>
          <span className="flex items-center gap-1 text-xs"><MessageCircle className="h-4 w-4" /> Commenter</span>
          <span className="flex items-center gap-1 text-xs"><Send className="h-4 w-4" /> Partager</span>
        </div>
      </div>
    );
  }

  // LinkedIn (par défaut)
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-[var(--line)] bg-white text-slate-900 shadow-sm">
      <div className="flex items-center gap-2 p-3">
        <Avatar name={authorName} url={authorAvatarUrl} />
        <div>
          <p className="text-sm font-semibold">{authorName}</p>
          <p className="text-xs text-slate-500">Service Communication · À l'instant</p>
        </div>
        <MoreHorizontal className="ml-auto h-4 w-4 text-slate-400" />
      </div>
      <p className="whitespace-pre-wrap px-3 pb-3 text-sm">{displayText}</p>
      <VisualBlock url={visualUrl} />
      <div className="flex items-center justify-around border-t border-slate-100 p-2 text-slate-600">
        <span className="flex items-center gap-1 text-xs"><ThumbsUp className="h-4 w-4" /> J'aime</span>
        <span className="flex items-center gap-1 text-xs"><MessageCircle className="h-4 w-4" /> Commenter</span>
        <span className="flex items-center gap-1 text-xs"><Repeat2 className="h-4 w-4" /> Republier</span>
        <span className="flex items-center gap-1 text-xs"><Send className="h-4 w-4" /> Envoyer</span>
      </div>
    </div>
  );
}
