export interface DeviceInfo {
  deviceName?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  os?: string;
}

/**
 * Generate a human-readable device description
 * @param deviceInfo - Device information
 * @returns Formatted device string (e.g., "Chrome on macOS", "iPhone")
 */
export function formatDeviceDescription(deviceInfo: DeviceInfo): string {
  const parts: string[] = [];

  if (deviceInfo.deviceName) {
    parts.push(deviceInfo.deviceName);
  }

  if (deviceInfo.browser) {
    parts.push(deviceInfo.browser);
  }

  if (deviceInfo.os && !deviceInfo.deviceName?.includes(deviceInfo.os)) {
    parts.push(`on ${deviceInfo.os}`);
  }

  return parts.length > 0 ? parts.join(" • ") : "Unknown Device";
}
