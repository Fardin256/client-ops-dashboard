import { Router, Response } from "express";
import prisma from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, userId } = req.user!;

  let taskWhere: any = {};
  if (role === "PM") {
    taskWhere = { project: { creatorId: userId } };
  } else if (role === "DEVELOPER") {
    taskWhere = { assigneeId: userId };
  }

  const [statusBreakdown, priorityBreakdown, overdueCount, totalTasks] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: taskWhere,
      _count: true,
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: taskWhere,
      _count: true,
    }),
    prisma.task.count({ where: { ...taskWhere, isOverdue: true } }),
    prisma.task.count({ where: taskWhere }),
  ]);

  // Upcoming due dates this week (PM-relevant, but computed for all roles cheaply)
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingThisWeek = await prisma.task.findMany({
    where: { ...taskWhere, dueDate: { gte: now, lte: weekFromNow }, status: { not: "DONE" } },
    orderBy: { dueDate: "asc" },
    include: { assignee: { select: { name: true } }, project: { select: { name: true } } },
  });

  return res.json({
    statusBreakdown,
    priorityBreakdown,
    overdueCount,
    totalTasks,
    upcomingThisWeek,
  });
});

export default router;