import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { requestMlForecast } from "../lib/mlClient.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
router.use(requireAuth);
const bodySchema = z.object({
    itemId: z.string().uuid(),
    horizonDays: z.coerce.number().int().min(1).max(90).default(14),
});
async function dailyNetSeries(itemId, daysBack) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - daysBack);
    const movements = await prisma.stockMovement.findMany({
        where: { itemId, occurredAt: { gte: since } },
        orderBy: { occurredAt: "asc" },
    });
    const byDay = new Map();
    for (const m of movements) {
        const d = m.occurredAt.toISOString().slice(0, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + Number(m.delta));
    }
    const keys = [...byDay.keys()].sort();
    return keys.map((k) => byDay.get(k) ?? 0);
}
function movingAverageLocal(history, horizon) {
    if (history.length === 0) {
        return { predictions: Array(horizon).fill(0), model: "moving_average_7d_node_fallback" };
    }
    const window = history.slice(-7);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    const rounded = Math.round(avg * 100) / 100;
    return { predictions: Array(horizon).fill(rounded), model: "moving_average_7d_node_fallback" };
}
router.post("/", async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
        return;
    }
    const { itemId, horizonDays } = parsed.data;
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
        res.status(404).json({ message: "Item not found" });
        return;
    }
    const history = await dailyNetSeries(itemId, 120);
    let predictions;
    let model;
    if (config.mlServiceUrl) {
        try {
            const ml = await requestMlForecast({ itemId, history, horizonDays });
            predictions = ml.predictions;
            model = ml.model;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : "ML request failed";
            res.status(502).json({
                message: "Forecast service unavailable",
                detail: msg,
                hint: "Ensure the ML container is running (docker compose up ml) and ML_SERVICE_URL / ML_INTERNAL_KEY match.",
            });
            return;
        }
    }
    else {
        const local = movingAverageLocal(history, horizonDays);
        predictions = local.predictions;
        model = local.model;
    }
    await prisma.demandForecast.create({
        data: {
            itemId,
            horizonDays,
            model,
            predictions,
        },
    });
    res.json({
        itemId,
        itemName: item.name,
        model,
        historyDays: history.length,
        predictions,
        horizonDays,
        source: config.mlServiceUrl ? "fastapi" : "node_fallback",
    });
});
router.get("/:itemId/latest", async (req, res) => {
    const itemId = String(req.params.itemId);
    const row = await prisma.demandForecast.findFirst({
        where: { itemId },
        orderBy: { createdAt: "desc" },
    });
    if (!row) {
        res.status(404).json({ message: "No forecast yet" });
        return;
    }
    res.json({
        itemId: row.itemId,
        model: row.model,
        horizonDays: row.horizonDays,
        predictions: row.predictions,
        createdAt: row.createdAt,
    });
});
export default router;
//# sourceMappingURL=forecast.js.map