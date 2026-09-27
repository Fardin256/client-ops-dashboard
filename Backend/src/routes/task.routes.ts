import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getIO } from "../socket";

const router = Router();

const createTaskSchema = z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    projectId: z.string().uuid(),
    assigneeId: z.string().uuid(),
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    dueDate: z.string().datetime(),
});

// Create task — Admin or PM (must own the project)
router.post(
    "/",
    requireAuth,
    requireRole("ADMIN", "PM"),
    async (req: AuthRequest, res: Response) => {
        const parsed = createTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
        }

        const { title, description, projectId, assigneeId, status, priority, dueDate } = parsed.data;
        const { role, userId } = req.user!;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (role === "PM" && project.creatorId !== userId) {
            return res.status(403).json({ error: "You can only add tasks to projects you created" });
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                projectId,
                assigneeId,
                status: status || "TODO",
                priority: priority || "MEDIUM",
                dueDate: new Date(dueDate),
            },
        });

        // Log creation as an activity event
        await prisma.taskActivity.create({
            data: {
                action: "TASK_CREATED",
                newStatus: task.status,
                taskId: task.id,
                projectId: task.projectId,
                userId: userId,
            },
        });

        // Create notification for the assigned developer
        const assignNotification = await prisma.notification.create({
            data: {
                message: `You've been assigned to task: ${task.title}`,
                userId: assigneeId,
                taskId: task.id,
            },
        });
        getIO().to(`user-${assigneeId}`).emit("notification", assignNotification);

        return res.status(201).json({ task });
    }
);
const updateStatusSchema = z.object({
    status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
});

router.patch(
    "/:id/status",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
        const { id } = req.params;
        const { role, userId } = req.user!;

        const parsed = updateStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
        }

        const task = await prisma.task.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        if (role === "DEVELOPER" && task.assigneeId !== userId) {
            return res.status(403).json({ error: "You can only update your own tasks" });
        }
        if (role === "PM" && task.project.creatorId !== userId) {
            return res.status(403).json({ error: "You can only update tasks in your own projects" });
        }

        const oldStatus = task.status;
        const newStatus = parsed.data.status;

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { status: newStatus },
        });

        await prisma.taskActivity.create({
            data: {
                action: "STATUS_CHANGE",
                oldStatus,
                newStatus,
                taskId: task.id,
                projectId: task.projectId,
                userId: userId,
            },
        });

        // Broadcast the activity to relevant rooms
        const activityPayload = {
            taskId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            userName: (await prisma.user.findUnique({ where: { id: userId } }))?.name,
            oldStatus,
            newStatus,
            timestamp: new Date(),
        };

        const io = getIO();
        io.to("admin-global").emit("activity", activityPayload);
        io.to(`project-${task.projectId}`).emit("activity", activityPayload);
        io.to(`developer-${task.assigneeId}`).emit("activity", activityPayload);

        if (newStatus === "IN_REVIEW") {
            const reviewNotification = await prisma.notification.create({
                data: {
                    message: `Task "${task.title}" was moved to In Review`,
                    userId: task.project.creatorId,
                    taskId: task.id,
                },
            });
            // Notify the PM directly via their personal room
            getIO().to(`user-${task.project.creatorId}`).emit("notification", reviewNotification);
        }

        return res.json({ task: updatedTask });
    }
);
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
    const { role, userId } = req.user!;
    const { status, priority, dueBefore, dueAfter, projectId } = req.query;

    const where: any = {};

    // Role-based scoping
    if (role === "PM") {
        where.project = { creatorId: userId };
    } else if (role === "DEVELOPER") {
        where.assigneeId = userId;
    }
    // Admin — no restriction, sees all

    // Query-param filters (shareable as URLs, per spec)
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (projectId) where.projectId = projectId as string;
    if (dueBefore || dueAfter) {
        where.dueDate = {};
        if (dueBefore) where.dueDate.lte = new Date(dueBefore as string);
        if (dueAfter) where.dueDate.gte = new Date(dueAfter as string);
    }

    const tasks = await prisma.task.findMany({
        where,
        include: { assignee: { select: { id: true, name: true } }, project: true },
        orderBy: { dueDate: "asc" },
    });

    return res.json({ tasks });
});

export default router;