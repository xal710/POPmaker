const APP_VERSION_URL = "/api/app-version";
const APP_BUILD_STORAGE_KEY = "pop_app_build_id";
const LEGACY_APP_VERSION_STORAGE_KEY = "pop_app_version";
const VERSION_CHECK_MS = 5 * 60 * 1000;

function getStoredBuildId(): string | null {
  return (
    localStorage.getItem(APP_BUILD_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_APP_VERSION_STORAGE_KEY)
  );
}

function saveBuildId(buildId: string): void {
  localStorage.setItem(APP_BUILD_STORAGE_KEY, buildId);
  localStorage.removeItem(LEGACY_APP_VERSION_STORAGE_KEY);
}

function getClientBuildId(): string {
  return typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "dev";
}

async function fetchServerBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`${APP_VERSION_URL}?t=${Date.now()}`);
    if (!response.ok) return null;

    const json = (await response.json()) as { version?: string };
    return typeof json.version === "string" ? json.version : null;
  } catch {
    return null;
  }
}

export async function checkAppVersionAndMaybeRefresh(
  refresh: () => Promise<void>,
  options: { isRefreshing: () => boolean; onDeployDetected?: () => void },
): Promise<void> {
  if (options.isRefreshing()) return;

  const clientBuildId = getClientBuildId();
  const serverBuildId = await fetchServerBuildId();
  const currentBuildId = serverBuildId ?? clientBuildId;
  const stored = getStoredBuildId();

  if (stored && stored !== currentBuildId) {
    saveBuildId(currentBuildId);
    options.onDeployDetected?.();
    await refresh();
    return;
  }

  if (!stored) {
    saveBuildId(currentBuildId);
  }
}

export function startAppVersionWatcher(
  refresh: () => Promise<void>,
  options: { isRefreshing: () => boolean; onDeployDetected?: () => void },
): () => void {
  const run = () => {
    void checkAppVersionAndMaybeRefresh(refresh, options);
  };

  run();

  const intervalId = window.setInterval(run, VERSION_CHECK_MS);
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      run();
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
