import packageJson from "@/package.json";

/**
 * Single Canonical Source of Truth for AirBharath LMS Application Versioning.
 * Derived directly from package.json without duplication.
 * 
 * ponytail: Directly references package.json version with safe helper functions.
 */
export const APP_VERSION = packageJson.version;
export const APP_NAME = "AirBharath";

export function getAppVersion(): string {
  return APP_VERSION;
}

export function getAppVersionString(): string {
  return `${APP_NAME} v${APP_VERSION}`;
}

export interface AppVersionInfo {
  name: string;
  version: string;
  status: string;
}

export function getAppVersionInfo(): AppVersionInfo {
  return {
    name: APP_NAME,
    version: APP_VERSION,
    status: "operational",
  };
}
