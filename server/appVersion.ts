export function getAppVersion(): string {
  return process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? "dev";
}
