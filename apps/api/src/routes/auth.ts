import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { signAccessToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});
const googleBody = z.object({
  idToken: z.string().min(20),
});
const googleClient = new OAuth2Client();

router.post("/register", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "user" },
  });
  const token = signAccessToken({
    id: user.id,
    role: user.role,
    email: user.email,
  });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }
  const token = signAccessToken({
    id: user.id,
    role: user.role,
    email: user.email,
  });
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.post("/google", async (req, res) => {
  const parsed = googleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  if (!config.googleClientId) {
    res.status(400).json({ message: "Google auth is not configured on server" });
    return;
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const googleId = payload?.sub;
    if (!email || !googleId) {
      res.status(401).json({ message: "Invalid Google token payload" });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { googleId },
      create: {
        email,
        googleId,
        role: "user",
      },
    });

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(401).json({
      message: "Google sign-in failed",
      detail: e instanceof Error ? e.message : undefined,
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json(user);
});

export default router;
