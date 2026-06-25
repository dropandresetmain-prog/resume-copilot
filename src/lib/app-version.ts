/** Product version label — keep in sync with package.json. */
export const APP_VERSION = "0.9.15E";

export function pageMilestone(section: string): string {
  return `v${APP_VERSION} · ${section}`;
}
