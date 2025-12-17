/**
 * Cookie utilities for SolidStart
 * Provides client and server-side cookie management
 */

import { getCookie as getServerCookie, setCookie as setServerCookie } from "vinxi/http";
import type { H3Event } from "vinxi/http";

/**
 * Get cookie value on the server
 */
export function getCookie(event: H3Event, name: string): string | undefined {
  return getServerCookie(event, name);
}

/**
 * Set cookie on the server
 */
export function setCookie(
  event: H3Event,
  name: string,
  value: string,
  options?: {
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    path?: string;
  }
) {
  setServerCookie(event, name, value, options);
}

/**
 * Delete cookie on the server
 */
export function deleteCookie(event: H3Event, name: string) {
  setServerCookie(event, name, "", {
    maxAge: 0,
    expires: new Date("2016-10-05"),
  });
}

/**
 * Get cookie value on the client (browser)
 */
export function getClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  
  return undefined;
}

/**
 * Set cookie on the client (browser)
 */
export function setClientCookie(
  name: string,
  value: string,
  options?: {
    maxAge?: number;
    expires?: Date;
    path?: string;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
  }
) {
  if (typeof document === "undefined") return;
  
  let cookieString = `${name}=${value}`;
  
  if (options?.maxAge) {
    cookieString += `; max-age=${options.maxAge}`;
  }
  
  if (options?.expires) {
    cookieString += `; expires=${options.expires.toUTCString()}`;
  }
  
  if (options?.path) {
    cookieString += `; path=${options.path}`;
  } else {
    cookieString += "; path=/";
  }
  
  if (options?.secure) {
    cookieString += "; secure";
  }
  
  if (options?.sameSite) {
    cookieString += `; samesite=${options.sameSite}`;
  }
  
  document.cookie = cookieString;
}

/**
 * Delete cookie on the client (browser)
 */
export function deleteClientCookie(name: string) {
  if (typeof document === "undefined") return;
  
  document.cookie = `${name}=; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
