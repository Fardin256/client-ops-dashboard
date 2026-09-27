import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export function requireRole(...allowedRoles: Array<"ADMIN" | "PM" | "DEVELOPER">) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }

    next();
  };
}