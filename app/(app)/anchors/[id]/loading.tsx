// Higher-fidelity skeleton for the anchor detail route. NFC tags written
// by the in-app writer point at /anchors/<id>, so this is the most-likely
// cold-start landing surface — the skeleton should hint at the same shape
// (back button, hero, metadata grid, test history) so the layout doesn't
// jump when the real page swaps in.
export default function AnchorDetailLoading() {
  return (
    <div className="grid gap-4" aria-label="Loading anchor" aria-busy="true">
      <span
        className="skeleton block h-4 w-16 rounded-full"
        aria-hidden
      />

      {/* Hero metadata card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2 flex-1">
            <span className="skeleton block h-3 w-24" />
            <span className="skeleton block h-6 w-2/3" />
            <span className="skeleton block h-4 w-1/2" />
          </div>
          <span className="skeleton block h-6 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="skeleton block h-14 rounded-xl"
              aria-hidden
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="skeleton inline-block h-11 w-32 rounded-2xl" />
          <span className="skeleton inline-block h-11 w-32 rounded-2xl" />
        </div>
      </div>

      {/* Test history card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 grid gap-3">
        <span className="skeleton block h-3 w-20" />
        <span className="skeleton block h-5 w-40" />
        <span className="skeleton block h-20 rounded-2xl" />
        <span className="skeleton block h-20 rounded-2xl" aria-hidden />
      </div>
    </div>
  );
}
