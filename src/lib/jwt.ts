import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";

const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

export interface JWTPayload {
  sub:      string;
  username: string;
}

export const signAccessToken = async (payload: JWTPayload) => {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES || "15m")
    .sign(ACCESS_SECRET);
};

export const signRefreshToken = async (payload: JWTPayload) => {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES || "30d")
    .sign(REFRESH_SECRET);
};

export const verifyAccessToken = async (token: string): Promise<JWTPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = async (token: string): Promise<JWTPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
};

export const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};
