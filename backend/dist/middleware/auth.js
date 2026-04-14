import { verifyAccessToken } from "../utils/jwt.js";
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const user = verifyAccessToken(token);
    if (!user) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
    req.user = user;
    next();
}
export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        res.status(403).json({ message: "Admin only" });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map