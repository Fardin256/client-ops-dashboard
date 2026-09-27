import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/", requireAuth, requireRole("ADMIN", "PM"), async (req: AuthRequest, res: Response) => {
  const clients = await prisma.client.findMany();
  return res.json({ clients });
});

const createClientSchema = z.object({ name: z.string().min(2) });

router.post("/", requireAuth, requireRole("ADMIN", "PM"), async (req: AuthRequest, res: Response) => {
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
  }
  const client = await prisma.client.create({ data: parsed.data });
  return res.status(201).json({ client });
});

export default router;