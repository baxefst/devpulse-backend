import type { JWTPayload } from "./jwt.js";

export type HonoEnv = {
    Variables: {
        jwtPayload: JWTPayload;
    };
};
