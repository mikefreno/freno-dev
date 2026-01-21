import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_JWKS = new URL("https://appleid.apple.com/auth/keys");
const appleJwks = createRemoteJWKSet(APPLE_JWKS);

export type AppleNotification = {
  notification_type: string;
  sub: string;
  email?: string;
  event_time: number;
  payload?: Record<string, unknown>;
};

export async function verifyAppleNotification(
  payload: Record<string, unknown>
): Promise<AppleNotification> {
  const signedPayload = payload.signedPayload;

  if (!signedPayload || typeof signedPayload !== "string") {
    throw new Error("Missing signedPayload");
  }

  const { payload: decoded } = await jwtVerify(signedPayload, appleJwks, {
    issuer: "https://appleid.apple.com"
  });

  return {
    notification_type: decoded.notification_type as string,
    sub: decoded.sub as string,
    email: decoded.email as string | undefined,
    event_time: decoded.event_time as number,
    payload: decoded as Record<string, unknown>
  };
}
