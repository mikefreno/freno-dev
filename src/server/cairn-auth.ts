import { SignJWT, jwtVerify } from "jose";
import { env } from "~/env/server";

const CAIRN_JWT_EXPIRY = "30d";

export type CairnAuthPayload = {
  sub: string;
  exp?: number;
  iat?: number;
};

export async function verifyCairnToken(
  token: string
): Promise<CairnAuthPayload> {
  const secret = new TextEncoder().encode(env.CAIRN_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"]
  });

  if (!payload.sub) {
    throw new Error("Missing subject in Cairn JWT");
  }

  return {
    sub: payload.sub as string,
    exp: payload.exp as number | undefined,
    iat: payload.iat as number | undefined
  };
}

export async function signCairnToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.CAIRN_JWT_SECRET);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(CAIRN_JWT_EXPIRY)
    .sign(secret);
}
