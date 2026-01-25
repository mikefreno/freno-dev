import { SignJWT, jwtVerify } from "jose";
import { env } from "~/env/server";

const NESSA_JWT_EXPIRY = "30d";

export type NessaAuthPayload = {
  sub: string;
  exp?: number;
  iat?: number;
};

export async function verifyNessaToken(
  token: string
): Promise<NessaAuthPayload> {
  const secret = new TextEncoder().encode(env.NESSA_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"]
  });

  if (!payload.sub) {
    throw new Error("Missing subject in Nessa JWT");
  }

  return {
    sub: payload.sub as string,
    exp: payload.exp as number | undefined,
    iat: payload.iat as number | undefined
  };
}

export async function signNessaToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.NESSA_JWT_SECRET);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(NESSA_JWT_EXPIRY)
    .sign(secret);
}
