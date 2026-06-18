export type LandingCtaTarget = "/setup" | "/generate";

export function resolveLandingCtaHref(options: {
  cloudEnabled: boolean;
  isSignedIn: boolean;
  hasInventory: boolean;
}): LandingCtaTarget {
  if (options.cloudEnabled && options.isSignedIn && options.hasInventory) {
    return "/generate";
  }
  return "/setup";
}
