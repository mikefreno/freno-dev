import type { H3Event } from "vinxi/http";
import { UAParser } from "ua-parser-js";

export interface DeviceInfo {
  deviceName?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  browser?: string;
  os?: string;
}

/**
 * Parse user agent string to extract device information
 * @param userAgent - User agent string from request headers
 * @returns Parsed device information
 */
export function parseDeviceInfo(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (result.device.type === "mobile") {
    deviceType = "mobile";
  } else if (result.device.type === "tablet") {
    deviceType = "tablet";
  }

  // Build device name (e.g., "iPhone 14", "Windows PC", "iPad Pro")
  let deviceName: string | undefined;
  if (result.device.vendor && result.device.model) {
    deviceName = `${result.device.vendor} ${result.device.model}`;
  } else if (result.os.name) {
    deviceName = `${result.os.name} ${deviceType === "desktop" ? "Computer" : deviceType}`;
  }

  // Browser info (e.g., "Chrome 120")
  const browser =
    result.browser.name && result.browser.version
      ? `${result.browser.name} ${result.browser.version.split(".")[0]}`
      : result.browser.name;

  // OS info (e.g., "macOS 14.1", "Windows 11", "iOS 17")
  const os =
    result.os.name && result.os.version
      ? `${result.os.name} ${result.os.version}`
      : result.os.name;

  return {
    deviceName,
    deviceType,
    browser,
    os
  };
}

/**
 * Extract device information from H3Event
 * @param event - H3Event
 * @returns Device information
 */
export function getDeviceInfo(event: H3Event): DeviceInfo {
  const userAgent = event.node.req.headers["user-agent"] || "";
  return parseDeviceInfo(userAgent);
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

/**
 * Create a short device fingerprint for comparison
 * Not cryptographic, just for grouping similar sessions
 * @param deviceInfo - Device information
 * @returns Short fingerprint string
 */
export function createDeviceFingerprint(deviceInfo: DeviceInfo): string {
  const parts = [
    deviceInfo.deviceType || "unknown",
    deviceInfo.os?.split(" ")[0] || "unknown",
    deviceInfo.browser?.split(" ")[0] || "unknown"
  ];
  return parts.join("-").toLowerCase();
}
