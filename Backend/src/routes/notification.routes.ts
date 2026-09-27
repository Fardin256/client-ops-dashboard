import { Router, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

// Get my notifications
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return res.json({ notifications });
});

// Mark one as read
router.patch("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return res.json({ notification: updated });
});

// Mark all as read
router.patch("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  const { userId } = req.user!;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return res.json({ message: "All notifications marked as read" });
});

export default router;