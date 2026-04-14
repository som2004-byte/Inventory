import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const zoneBody = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

router.get("/", async (_req, res) => {
  const zones = await prisma.warehouseZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    include: { _count: { select: { items: true } } },
  });
  res.json(
    zones.map((z) => ({
      id: z.id,
      code: z.code,
      name: z.name,
      description: z.description,
      sortOrder: z.sortOrder,
      createdAt: z.createdAt,
      itemCount: z._count.items,
    }))
  );
});

router.post("/", requireAdmin, async (req, res) => {
  const parsed = zoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  try {
    const z = await prisma.warehouseZone.create({ data: parsed.data });
    res.status(201).json(z);
  } catch {
    res.status(409).json({ message: "Zone code must be unique" });
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const parsed = zoneBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  try {
    const z = await prisma.warehouseZone.update({ where: { id }, data: parsed.data });
    res.json(z);
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.warehouseZone.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;
