import type { Request, Response, NextFunction } from "express";
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
