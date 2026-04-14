import jwt from "jsonwebtoken";
import { config } from "../config.js";
const TTL = "12h";
export function signAccessToken(user) {
    return jwt.sign({ sub: user.id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: TTL });
}
export function verifyAccessToken(token) {
    try {
        const p = jwt.verify(token, config.jwtSecret);
        if (!p.sub || !p.role || !p.email)
            return null;
        return { id: p.sub, role: p.role, email: p.email };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map