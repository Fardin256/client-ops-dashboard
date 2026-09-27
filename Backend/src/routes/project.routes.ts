import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  clientId: z.string().uuid(),
});

// Create a project — Admin or PM only
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "PM"),
  async (req: AuthRequest, res: Response) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, description, clientId } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        clientId,
        creatorId: req.user!.userId,
      },
    });

    return res.status(201).json({ project });
  }
);

// List projects — role-scoped
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, userId } = req.user!;

  let projects;

  if (role === "ADMIN") {
    projects = await prisma.project.findMany({ include: { client: true } });
  } else if (role === "PM") {
    projects = await prisma.project.findMany({
      where: { creatorId: userId },
      include: { client: true },
    });
  } else {
    // DEVELOPER — only projects where they have at least one assigned task
    projects = await prisma.project.findMany({
      where: { tasks: { some: { assigneeId: userId } } },
      include: { client: true },
    });
  }

  return res.json({ projects });
});
// Get single project — role-scoped
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, userId } = req.user!;
  const { id } = req.params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true, tasks: true },
  });

  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  if (role === "PM" && project.creatorId !== userId) {
    return res.status(403).json({ error: "You do not have access to this project" });
  }

  if (role === "DEVELOPER") {
    const hasAssignedTask = project.tasks.some((t) => t.assigneeId === userId);
    if (!hasAssignedTask) {
      return res.status(403).json({ error: "You do not have access to this project" });
    }
  }

  return res.json({ project });
});

// Update project — Admin or the PM who created it
const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "PM"),
  async (req: AuthRequest, res: Response) => {
    const { role, userId } = req.user!;
    const { id } = req.params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (role === "PM" && project.creatorId !== userId) {
      return res.status(403).json({ error: "You can only edit projects you created" });
    }

    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: parsed.data,
    });

    return res.json({ project: updated });
  }
);

// Delete project — Admin or the PM who created it
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "PM"),
  async (req: AuthRequest, res: Response) => {
    const { role, userId } = req.user!;
    const { id } = req.params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (role === "PM" && project.creatorId !== userId) {
      return res.status(403).json({ error: "You can only delete projects you created" });
    }

    await prisma.project.delete({ where: { id } });
    return res.json({ message: "Project deleted" });
  }
);

export default router;