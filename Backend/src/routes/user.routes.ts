import { Router, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { onlineUsers } from "../socket";

const router = Router();

// List developers — for assignee dropdowns (Admin/PM only)
router.get("/developers", requireAuth, requireRole("ADMIN", "PM"), async (req: AuthRequest, res: Response) => {
  const developers = await prisma.user.findMany({
    where: { role: "DEVELOPER" },
    select: { id: true, name: true, email: true },
  });
  return res.json({ developers });
});
router.get("/online-count", requireAuth, requireRole("ADMIN"), async (req, res) => {
  return res.json({ count: onlineUsers.size });
});
export default router;