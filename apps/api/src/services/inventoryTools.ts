import { prisma } from "../lib/prisma.js";

const capLimit = (n: unknown, fallback: number, max: number) => {
  const v = typeof n === "number" && !Number.isNaN(n) ? Math.floor(n) : fallback;
  return Math.min(max, Math.max(1, v));
};

export async function toolListLowStock(args: Record<string, unknown>) {
  const limit = capLimit(args.limit, 15, 50);
  const items = await prisma.item.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const low = items
    .filter((i) => Number(i.currentQuantity) <= i.reorderLevel)
    .slice(0, limit)
    .map((i) => ({
      sku: i.sku,
      name: i.name,
      quantity: Number(i.currentQuantity),
      reorderLevel: i.reorderLevel,
      category: i.category?.name ?? null,
    }));
  return { count: low.length, items: low };
}

export async function toolSearchItems(args: Record<string, unknown>) {
  const q = typeof args.query === "string" ? args.query.trim() : "";
  const limit = capLimit(args.limit, 10, 30);
  if (!q) return { items: [] as { sku: string; name: string; quantity: number }[] };
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
    include: { category: true },
  });
  return {
    items: items.map((i) => ({
      sku: i.sku,
      name: i.name,
      quantity: Number(i.currentQuantity),
      category: i.category?.name ?? null,
    })),
  };
}

export async function toolGetItemBySku(args: Record<string, unknown>) {
  const sku = typeof args.sku === "string" ? args.sku.trim() : "";
  if (!sku) return { found: false as const, message: "sku required" };
  const item = await prisma.item.findFirst({
    where: { sku: { equals: sku, mode: "insensitive" } },
    include: { category: true },
  });
  if (!item) return { found: false as const, sku };
  return {
    found: true as const,
    sku: item.sku,
    name: item.name,
    description: item.description,
    quantity: Number(item.currentQuantity),
    unit: item.unit,
    reorderLevel: item.reorderLevel,
    unitCost: item.unitCost != null ? Number(item.unitCost) : null,
    category: item.category?.name ?? null,
  };
}

export async function toolGetCatalogStats(_args: Record<string, unknown>) {
  const [itemCount, categoryCount, items] = await Promise.all([
    prisma.item.count(),
    prisma.category.count(),
    prisma.item.findMany({ select: { currentQuantity: true, reorderLevel: true } }),
  ]);
  const lowStockCount = items.filter((i) => Number(i.currentQuantity) <= i.reorderLevel).length;
  const totalUnits = items.reduce((s, i) => s + Number(i.currentQuantity), 0);
  return { itemCount, categoryCount, lowStockCount, totalUnitsRounded: Math.round(totalUnits * 100) / 100 };
}

export async function toolListCategories(_args: Record<string, unknown>) {
  const rows = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return {
    categories: rows.map((c) => ({
      name: c.name,
      description: c.description,
      itemCount: c._count.items,
    })),
  };
}

export async function dispatchInventoryTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_low_stock":
      return toolListLowStock(args);
    case "search_items":
      return toolSearchItems(args);
    case "get_item_by_sku":
      return toolGetItemBySku(args);
    case "get_catalog_stats":
      return toolGetCatalogStats(args);
    case "list_categories":
      return toolListCategories(args);
    default:
      return { error: "unknown_tool", name };
  }
}
