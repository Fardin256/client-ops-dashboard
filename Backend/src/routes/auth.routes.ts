import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma";
import { hashPassword } from "../utils/password";
import { comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import { hashToken } from "../utils/hashToken";
import { verifyRefreshToken } from "../utils/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware";
const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "DEVELOPER", // self-registration always creates a Developer
    },
  });

  return res.status(201).json({
    message: "User registered successfully",
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
router.post("/refresh", async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const tokenHash = hashToken(token);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    return res.status(401).json({ error: "Refresh token no longer valid" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return res.status(401).json({ error: "User no longer exists" });
  }

  const newAccessToken = signAccessToken({ userId: user.id, role: user.role });

  return res.json({ accessToken: newAccessToken });
});
router.post("/logout", async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    const tokenHash = hashToken(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  res.clearCookie("refreshToken");
  return res.json({ message: "Logged out successfully" });
});
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
export default router;