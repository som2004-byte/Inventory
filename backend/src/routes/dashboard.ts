import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (_req, res) => {
  const [itemCount, categoryCount, items] = await Promise.all([
    prisma.item.count(),
    prisma.category.count(),
    prisma.item.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        currentQuantity: true,
        reorderLevel: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const lowStock = items.filter((i) => Number(i.currentQuantity) <= i.reorderLevel);

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const movements = await prisma.stockMovement.findMany({
    where: { occurredAt: { gte: since } },
    select: { delta: true, occurredAt: true },
  });

  const byDay = new Map<string, number>();
  for (const m of movements) {
    const d = m.occurredAt.toISOString().slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + Number(m.delta));
  }
  const movementTrend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, netDelta]) => ({ date, netDelta }));

  const byCategory = await prisma.item.groupBy({
    by: ["categoryId"],
    _sum: { currentQuantity: true },
  });
  const cats = await prisma.category.findMany();
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const stockByCategory = byCategory.map((g) => ({
    categoryId: g.categoryId,
    categoryName: g.categoryId ? catName.get(g.categoryId) ?? "—" : "Uncategorized",
    quantity: Number(g._sum.currentQuantity ?? 0),
  }));

  res.json({
    itemCount,
    categoryCount,
    lowStockCount: lowStock.length,
    lowStockItems: lowStock.slice(0, 10).map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      currentQuantity: Number(i.currentQuantity),
      reorderLevel: i.reorderLevel,
      categoryName: i.category?.name ?? null,
    })),
    movementTrend,
    stockByCategory,
  });
});

export default router;
