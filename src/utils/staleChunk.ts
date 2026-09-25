const RELOAD_KEY = 'ej-chunk-reload';
let reloading = false;

export function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    msg
  );
}

/** Egy deploy után a nyitott lap még a régi hashű chunkot kéri. Egyszer újratölt. */
export function reloadOnceForStaleChunk(): boolean {
  if (reloading) return true;
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch {
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}

export function clearStaleChunkReload(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* privát mód */
  }
}
