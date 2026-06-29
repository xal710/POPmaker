const APP_VERSION_URL = "/api/app-version";
const APP_VERSION_STORAGE_KEY = "pop_app_version";
const VERSION_CHECK_MS = 5 * 60 * 1000;

async function fetchAppVersion(): Promise<string | null> {
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

  const version = await fetchAppVersion();
  if (!version) return;

  const stored = localStorage.getItem(APP_VERSION_STORAGE_KEY);
  if (stored && stored !== version) {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, version);
    options.onDeployDetected?.();
    await refresh();
    return;
  }

  if (!stored) {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, version);
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
