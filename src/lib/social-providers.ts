export interface SocialProviderSettings {
  external?: { google?: boolean; apple?: boolean };
}

export function socialProviderAvailability(settings: SocialProviderSettings, platform: string) {
  const appleEnabled = settings.external?.apple === true;
  return {
    appleEnabled,
    // Keep an equivalent Apple option alongside Google in the iOS application.
    googleEnabled: settings.external?.google === true && (platform !== "ios" || appleEnabled),
  };
}
