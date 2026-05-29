/**
 * Detect a stale-chunk load failure (common after a fresh deploy) and reload
 * the page once to pull the current build. A sessionStorage guard prevents an
 * infinite reload loop if the error is not actually chunk-related.
 *
 * Returns true if a reload was triggered (caller should render nothing useful).
 */
export function recoverFromChunkError(error: Error): boolean {
  if (typeof window === "undefined") return false;

  const msg = `${error?.name ?? ""} ${error?.message ?? ""}`;
  const isChunkError = /ChunkLoadError|Loading chunk|Failed to load chunk|Loading CSS chunk|error loading dynamically imported module/i.test(msg);
  if (!isChunkError) return false;

  const KEY = "pulse-chunk-reload-at";
  const last = Number(sessionStorage.getItem(KEY) ?? "0");
  // Avoid loops: only auto-reload if we haven't done so in the last 10s.
  if (Date.now() - last < 10_000) return false;

  sessionStorage.setItem(KEY, String(Date.now()));
  window.location.reload();
  return true;
}
