import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/low-stock", async (_req, res) => {
  const items = await prisma.item.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const low = items
    .filter((i) => Number(i.currentQuantity) <= i.reorderLevel)
    .map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      currentQuantity: Number(i.currentQuantity),
      reorderLevel: i.reorderLevel,
      categoryName: i.category?.name ?? null,
    }));
  res.json(low);
});

export default router;
