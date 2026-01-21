import { jwtVerify } from "jose";
import { env } from "~/env/server";

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

  return {
    sub: payload.sub as string,
    exp: payload.exp as number | undefined,
    iat: payload.iat as number | undefined
  };
}
