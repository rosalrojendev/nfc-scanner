// Streamed instantly by Next.js while the matching page.tsx is still
// resolving its async server work (auth, DB queries, etc.). Without this
// file, the browser stares at a blank screen for the full server roundtrip
// — which on a cold function start can be 1–3 seconds.
export default function AppLoading() {
  return (
    <div className="grid gap-4" aria-label="Loading page" aria-busy="true">
      <span className="skeleton block h-32 rounded-2xl" />
      <span className="skeleton block h-24 rounded-2xl" aria-hidden />
      <span className="skeleton block h-24 rounded-2xl" aria-hidden />
    </div>
  );
}
