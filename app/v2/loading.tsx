export default function V2Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1680px] gap-8">
        <aside className="hidden w-[15.5rem] shrink-0 space-y-3 lg:block" aria-hidden>
          <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--surface-soft)]" />
            ))}
          </div>
        </aside>
        <div className="min-w-0 flex-1 space-y-6 lg:pl-[17rem]">
          <div className="h-12 max-w-md animate-pulse rounded-lg bg-[var(--surface-soft)]" />
          <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-36 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
            <div className="h-36 animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
