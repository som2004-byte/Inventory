import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
const router = Router();
router.use(requireAuth);
router.get("/", async (_req, res) => {
    const rows = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json(rows);
});
const categoryBody = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional().nullable(),
});
router.post("/", requireAdmin, async (req, res) => {
    const parsed = categoryBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
    }
    try {
        const cat = await prisma.category.create({ data: parsed.data });
        res.status(201).json(cat);
    }
    catch {
        res.status(409).json({ message: "Category name already exists" });
    }
});
router.patch("/:id", requireAdmin, async (req, res) => {
    const id = String(req.params.id);
    const parsed = categoryBody.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
    }
    try {
        const cat = await prisma.category.update({
            where: { id },
            data: parsed.data,
        });
        res.json(cat);
    }
    catch {
        res.status(404).json({ message: "Category not found" });
    }
});
router.delete("/:id", requireAdmin, async (req, res) => {
    const id = String(req.params.id);
    try {
        await prisma.category.delete({ where: { id } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ message: "Category not found" });
    }
});
export default router;
//# sourceMappingURL=categories.js.map