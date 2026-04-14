import { Router } from "express";
import { z } from "zod";
import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { mapItem } from "../utils/itemMap.js";
const router = Router();
router.use(requireAuth);
const itemCreate = z.object({
    sku: z.string().min(1).max(64),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    zoneId: z.string().uuid().optional().nullable(),
    binCode: z.string().max(64).optional().nullable(),
    unit: z.string().max(32).optional(),
    reorderLevel: z.number().int().min(0).optional(),
    currentQuantity: z.number().optional(),
    unitCost: z.number().nonnegative().optional().nullable(),
});
router.get("/export", async (_req, res) => {
    const items = await prisma.item.findMany({
        include: { category: true, zone: true },
        orderBy: { name: "asc" },
    });
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Inventory");
    sheet.columns = [
        { header: "SKU", key: "sku", width: 14 },
        { header: "Name", key: "name", width: 28 },
        { header: "Category", key: "category", width: 18 },
        { header: "Unit", key: "unit", width: 8 },
        { header: "Qty", key: "qty", width: 10 },
        { header: "Reorder", key: "reorder", width: 10 },
        { header: "Unit cost", key: "cost", width: 12 },
    ];
    for (const it of items) {
        sheet.addRow({
            sku: it.sku,
            name: it.name,
            category: it.category?.name ?? "",
            unit: it.unit,
            qty: Number(it.currentQuantity),
            reorder: it.reorderLevel,
            cost: it.unitCost != null ? Number(it.unitCost) : "",
        });
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="inventory.xlsx"');
    await wb.xlsx.write(res);
    res.end();
});
router.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const lowStock = req.query.lowStock === "true" || req.query.lowStock === "1";
    const sort = typeof req.query.sort === "string" ? req.query.sort : "updated_desc";
    const where = {};
    if (q) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
        ];
    }
    if (categoryId)
        where.categoryId = categoryId;
    let items = await prisma.item.findMany({
        where,
        include: { category: true, zone: true },
        orderBy: sort === "name_asc"
            ? { name: "asc" }
            : sort === "name_desc"
                ? { name: "desc" }
                : sort === "qty_asc"
                    ? { currentQuantity: "asc" }
                    : sort === "qty_desc"
                        ? { currentQuantity: "desc" }
                        : { updatedAt: "desc" },
    });
    if (lowStock) {
        items = items.filter((it) => Number(it.currentQuantity) <= it.reorderLevel);
    }
    const total = items.length;
    const slice = items.slice((page - 1) * pageSize, page * pageSize);
    res.json({
        data: slice.map(mapItem),
        total,
        page,
        pageSize,
    });
});
router.get("/:id", async (req, res) => {
    const id = String(req.params.id);
    const item = await prisma.item.findUnique({
        where: { id },
        include: { category: true, zone: true },
    });
    if (!item) {
        res.status(404).json({ message: "Not found" });
        return;
    }
    res.json(mapItem(item));
});
router.post("/", async (req, res) => {
    const parsed = itemCreate.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
    }
    const { sku, name, description, categoryId, zoneId, binCode, unit, reorderLevel, currentQuantity = 0, unitCost, } = parsed.data;
    try {
        const item = await prisma.$transaction(async (tx) => {
            const created = await tx.item.create({
                data: {
                    sku,
                    name,
                    description: description ?? undefined,
                    categoryId: categoryId ?? undefined,
                    zoneId: zoneId ?? undefined,
                    binCode: binCode ?? undefined,
                    unit: unit ?? "pcs",
                    reorderLevel: reorderLevel ?? 0,
                    currentQuantity,
                    unitCost: unitCost ?? undefined,
                },
                include: { category: true, zone: true },
            });
            if (currentQuantity !== 0) {
                await tx.stockMovement.create({
                    data: {
                        itemId: created.id,
                        delta: currentQuantity,
                        reason: "initial_stock",
                    },
                });
            }
            return created;
        });
        res.status(201).json(mapItem(item));
    }
    catch {
        res.status(409).json({ message: "SKU must be unique" });
    }
});
router.patch("/:id", async (req, res) => {
    const id = String(req.params.id);
    const parsed = itemCreate.partial().safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
    }
    try {
        const item = await prisma.item.update({
            where: { id },
            data: parsed.data,
            include: { category: true, zone: true },
        });
        res.json(mapItem(item));
    }
    catch {
        res.status(404).json({ message: "Not found" });
    }
});
router.delete("/:id", requireAdmin, async (req, res) => {
    const id = String(req.params.id);
    try {
        await prisma.item.delete({ where: { id } });
        res.status(204).send();
    }
    catch {
        res.status(404).json({ message: "Not found" });
    }
});
const adjustBody = z.object({
    delta: z.number(),
    reason: z.string().max(200).optional(),
});
router.post("/:id/adjust", async (req, res) => {
    const id = String(req.params.id);
    const parsed = adjustBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
    }
    const { delta, reason } = parsed.data;
    try {
        const item = await prisma.$transaction(async (tx) => {
            const current = await tx.item.findUniqueOrThrow({ where: { id } });
            const next = Number(current.currentQuantity) + delta;
            if (next < 0) {
                throw new Error("NEGATIVE");
            }
            await tx.stockMovement.create({
                data: { itemId: current.id, delta, reason: reason ?? "adjustment" },
            });
            return tx.item.update({
                where: { id: current.id },
                data: { currentQuantity: next },
                include: { category: true, zone: true },
            });
        });
        res.json(mapItem(item));
    }
    catch (e) {
        if (e instanceof Error && e.message === "NEGATIVE") {
            res.status(400).json({ message: "Stock cannot go negative" });
            return;
        }
        res.status(404).json({ message: "Not found" });
    }
});
router.get("/:id/movements", async (req, res) => {
    const id = String(req.params.id);
    const movements = await prisma.stockMovement.findMany({
        where: { itemId: id },
        orderBy: { occurredAt: "desc" },
        take: 500,
    });
    res.json(movements.map((m) => ({
        ...m,
        delta: Number(m.delta),
    })));
});
export default router;
//# sourceMappingURL=items.js.map