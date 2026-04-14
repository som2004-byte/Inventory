import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { mapItem } from "../utils/itemMap.js";
const router = Router();
router.use(requireAuth);
function avgPredictions(predictions) {
    if (predictions == null || !Array.isArray(predictions))
        return null;
    const nums = predictions.filter((x) => typeof x === "number");
    if (nums.length === 0)
        return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}
/** GET /api/smart/overview — KPIs for smart ops hub */
router.get("/overview", async (_req, res) => {
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const [pendingReorders, iot24h, lowStockItems, zoneCount] = await Promise.all([
        prisma.reorderSuggestion.count({ where: { status: "pending" } }),
        prisma.iotEvent.count({ where: { occurredAt: { gte: since } } }),
        prisma.item.findMany({
            where: { reorderLevel: { gt: 0 } },
            select: { id: true, currentQuantity: true, reorderLevel: true },
        }),
        prisma.warehouseZone.count(),
    ]);
    const atRisk = lowStockItems.filter((it) => Number(it.currentQuantity) <= it.reorderLevel).length;
    res.json({
        pendingReorderCount: pendingReorders,
        iotEvents24h: iot24h,
        atRiskSkuCount: atRisk,
        warehouseZoneCount: zoneCount,
    });
});
/** GET /api/smart/risk — stockout / demand mismatch signals */
router.get("/risk", async (_req, res) => {
    const items = await prisma.item.findMany({
        include: {
            category: true,
            forecasts: { orderBy: { createdAt: "desc" }, take: 1 },
        },
    });
    const signals = [];
    for (const it of items) {
        const q = Number(it.currentQuantity);
        const rl = it.reorderLevel;
        if (rl > 0 && q <= rl) {
            signals.push({
                severity: q === 0 ? "high" : "high",
                type: "stockout",
                title: "At or below reorder point",
                detail: `On-hand ${q} ≤ reorder ${rl}. Consider replenishment or transfer.`,
                itemId: it.id,
                sku: it.sku,
                name: it.name,
            });
        }
        const f = it.forecasts[0];
        if (f) {
            const preds = f.predictions;
            const avgD = avgPredictions(preds);
            if (avgD != null && avgD > 0) {
                const coverDays = q / avgD;
                if (coverDays < 7 && q > rl) {
                    signals.push({
                        severity: "medium",
                        type: "demand_run",
                        title: "Demand may outpace on-hand",
                        detail: `Recent forecast ~${avgD.toFixed(2)} units/day implies under 7 days of cover at current ${q} units.`,
                        itemId: it.id,
                        sku: it.sku,
                        name: it.name,
                    });
                }
            }
        }
    }
    const high = signals.filter((s) => s.severity === "high").length;
    const medium = signals.filter((s) => s.severity === "medium").length;
    res.json({
        summary: { high, medium, total: signals.length },
        signals: signals.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1)),
    });
});
/** GET /api/smart/warehouse — zone utilization + simple optimization hints */
router.get("/warehouse", async (_req, res) => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const zones = await prisma.warehouseZone.findMany({
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include: {
            items: {
                select: {
                    id: true,
                    sku: true,
                    name: true,
                    binCode: true,
                    currentQuantity: true,
                    unitCost: true,
                },
            },
        },
    });
    const movements = await prisma.stockMovement.findMany({
        where: { occurredAt: { gte: since } },
        select: { itemId: true, delta: true },
    });
    const activity = new Map();
    for (const m of movements) {
        const k = m.itemId;
        activity.set(k, (activity.get(k) ?? 0) + Math.abs(Number(m.delta)));
    }
    const zoneRows = zones.map((z) => {
        let units = 0;
        let value = 0;
        for (const it of z.items) {
            const q = Number(it.currentQuantity);
            units += q;
            value += q * (it.unitCost != null ? Number(it.unitCost) : 0);
        }
        const topSkus = [...z.items]
            .map((it) => ({
            sku: it.sku,
            name: it.name,
            activity: activity.get(it.id) ?? 0,
        }))
            .sort((a, b) => b.activity - a.activity)
            .slice(0, 5);
        return {
            id: z.id,
            code: z.code,
            name: z.name,
            description: z.description,
            itemCount: z.items.length,
            totalUnits: units,
            stockValueApprox: Math.round(value * 100) / 100,
            topMovers: topSkus,
        };
    });
    const hints = [];
    const primary = zoneRows[0];
    const secondary = zoneRows[1];
    const pAct = primary?.topMovers[0]?.activity ?? 0;
    const sAct = secondary?.topMovers[0]?.activity ?? 0;
    if (primary && secondary && pAct > sAct * 2 && pAct > 0) {
        hints.push(`${primary.code} shows the highest pick activity — keep fastest movers and pick paths consolidated here.`);
    }
    if (zoneRows.some((r) => r.itemCount > 0 && r.totalUnits / r.itemCount > 500)) {
        hints.push("Some zones are dense — consider splitting slow movers to overflow aisles to reduce travel time.");
    }
    if (hints.length === 0) {
        hints.push("Balance SKU placement by pick frequency; review zone KPIs monthly.");
    }
    res.json({ zones: zoneRows, hints });
});
/** GET /api/smart/reorder — pending / recent suggestions */
router.get("/reorder", async (_req, res) => {
    const rows = await prisma.reorderSuggestion.findMany({
        where: { status: { in: ["pending", "ordered"] } },
        orderBy: { updatedAt: "desc" },
        include: { item: { include: { category: true } } },
    });
    res.json(rows.map((r) => ({
        id: r.id,
        itemId: r.itemId,
        sku: r.item.sku,
        name: r.item.name,
        categoryName: r.item.category?.name ?? null,
        suggestedQty: r.suggestedQty,
        reason: r.reason,
        status: r.status,
        updatedAt: r.updatedAt,
    })));
});
router.post("/reorder/generate", async (_req, res) => {
    const items = await prisma.item.findMany();
    const upserted = [];
    for (const it of items) {
        const q = Number(it.currentQuantity);
        const rl = it.reorderLevel;
        if (rl <= 0 || q > rl)
            continue;
        const suggestedQty = Math.ceil(Math.max(rl * 3 - q, rl));
        const reason = `On-hand ${q} is at or below reorder ${rl}. Suggested cover targets ~3× reorder minus current.`;
        const existing = await prisma.reorderSuggestion.findFirst({
            where: { itemId: it.id, status: "pending" },
        });
        if (existing) {
            const u = await prisma.reorderSuggestion.update({
                where: { id: existing.id },
                data: { suggestedQty, reason },
                include: { item: true },
            });
            upserted.push({ id: u.id, sku: u.item.sku, suggestedQty: u.suggestedQty });
        }
        else {
            const c = await prisma.reorderSuggestion.create({
                data: { itemId: it.id, suggestedQty, reason },
                include: { item: true },
            });
            upserted.push({ id: c.id, sku: c.item.sku, suggestedQty: c.suggestedQty });
        }
    }
    res.json({ generated: upserted.length, items: upserted });
});
const patchReorder = z.object({
    status: z.enum(["pending", "ordered", "dismissed"]),
});
router.patch("/reorder/:id", async (req, res) => {
    const id = String(req.params.id);
    const parsed = patchReorder.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
    }
    try {
        const row = await prisma.reorderSuggestion.update({
            where: { id },
            data: { status: parsed.data.status },
        });
        res.json({ id: row.id, status: row.status });
    }
    catch {
        res.status(404).json({ message: "Not found" });
    }
});
/** GET /api/smart/scan?code=INV|SKU-xxx or raw SKU — for QR / RFID payload resolution */
router.get("/scan", async (req, res) => {
    const raw = typeof req.query.code === "string" ? req.query.code.trim() : "";
    if (!raw) {
        res.status(400).json({ message: "Missing query: code" });
        return;
    }
    const sku = raw.startsWith("INV|") ? raw.slice(4).trim() : raw;
    if (!sku) {
        res.status(400).json({ message: "Empty SKU" });
        return;
    }
    const item = await prisma.item.findFirst({
        where: { sku: { equals: sku, mode: "insensitive" } },
        include: { category: true, zone: true },
    });
    if (!item) {
        res.status(404).json({ message: "No item matches this code" });
        return;
    }
    await prisma.iotEvent
        .create({
        data: {
            itemId: item.id,
            source: "qr_scan",
            eventType: "lookup",
            message: "Scan resolved via /api/smart/scan",
            metadata: { raw },
        },
    })
        .catch(() => undefined);
    res.json(mapItem(item));
});
export default router;
//# sourceMappingURL=smart.js.map