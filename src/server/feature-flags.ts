export interface FeatureFlags {
  [key: string]: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    // TODO: Add feature flags here
    "beta-features": process.env.ENABLE_BETA_FEATURES === "true",
    "new-editor": false,
    "premium-content": true,
    "seasonal-event": false,
    "maintenance-mode": false
  };
}

export function isFeatureEnabled(featureName: string): boolean {
  const flags = getFeatureFlags();
  return flags[featureName] === true;
}
