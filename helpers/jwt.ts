import { decode, sign } from "hono/jwt";
import { JWT_SECRET } from "./constants.ts";

export type JwtPayload = {
  userId: number;
  exp: number;
};

export async function createJwt(userId: number): Promise<string> {
  const payload = {
    userId: userId,
    // Token expires in 15 minutes
    exp: Math.floor(Date.now() / 1000) + 60 * 15,
  };

  const token = await sign(payload, JWT_SECRET, "HS256");

  return token;
}

export function getJwtPayload(tokenToDecode: string): JwtPayload {
  const { payload } = decode(tokenToDecode);

  return payload as JwtPayload;
}
