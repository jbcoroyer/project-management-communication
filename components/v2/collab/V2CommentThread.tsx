"use client";

import { useMemo, useState } from "react";
import { AtSign, MessageCircle, Send } from "lucide-react";
import { useEntityComments } from "../../../lib/v2/comments";

function renderWithMentions(text: string) {
  const parts = text.split(/(@[\wÀ-ÿ'’-]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-[var(--accent)]">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function V2CommentThread({
  channelKey,
  currentUser,
  knownNames = [],
  title = "Discussion",
}: {
  channelKey: string;
  currentUser: { id: string | null; name: string };
  knownNames?: string[];
  title?: string;
}) {
  const { comments, post } = useEntityComments(channelKey, currentUser, knownNames);
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);

  const filteredNames = useMemo(() => {
    const m = text.match(/@([\wÀ-ÿ'’-]*)$/);
    if (!m) return [];
    const q = m[1].toLowerCase();
    return knownNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 5);
  }, [text, knownNames]);

  const submit = () => {
    post(text);
    setText("");
    setShowMentions(false);
  };

  const insertMention = (name: string) => {
    setText((prev) => prev.replace(/@([\wÀ-ÿ'’-]*)$/, `@${name} `));
    setShowMentions(false);
  };

  return (
    <section className="ui-surface flex flex-col rounded-2xl p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
        <MessageCircle className="h-4 w-4 text-[var(--accent)]" /> {title}
        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--foreground)]/55">
          {comments.length}
        </span>
      </h2>

      <div className="mb-3 max-h-[360px] space-y-2 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-[color:var(--foreground)]/55">
            Aucun message. Lancez la discussion (temps réel via Broadcast).
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--foreground)]">{c.authorName}</span>
                <span className="text-[10px] text-[color:var(--foreground)]/45">
                  {new Date(c.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[color:var(--foreground)]/80">{renderWithMentions(c.text)}</p>
            </div>
          ))
        )}
      </div>

      <div className="relative">
        {showMentions && filteredNames.length > 0 ? (
          <div className="absolute bottom-full mb-1 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-2)]">
            {filteredNames.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => insertMention(n)}
                className="ui-transition flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
              >
                <AtSign className="h-3.5 w-3.5 text-[var(--accent)]" /> {n}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setShowMentions(/@([\wÀ-ÿ'’-]*)$/.test(e.target.value));
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Écrire un message… (@ pour mentionner)"
            className="ui-focus-ring flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={submit}
            className="ui-transition inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)]"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
