import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const ingestBody = z.object({
  itemId: z.string().uuid(),
  source: z.enum(["rfid", "sensor", "qr_scan", "webhook", "manual"]),
  eventType: z.string().min(1).max(120),
  message: z.string().max(500).optional().nullable(),
  quantityDelta: z.number().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
});

router.get("/events", async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const itemId = typeof req.query.itemId === "string" ? req.query.itemId : undefined;
  const where: Prisma.IotEventWhereInput = {};
  if (itemId) where.itemId = itemId;

  const events = await prisma.iotEvent.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: {
      item: { select: { id: true, sku: true, name: true, binCode: true } },
    },
  });
  res.json(
    events.map((e) => ({
      id: e.id,
      itemId: e.itemId,
      sku: e.item.sku,
      itemName: e.item.name,
      binCode: e.item.binCode,
      source: e.source,
      eventType: e.eventType,
      message: e.message,
      quantityDelta: e.quantityDelta != null ? Number(e.quantityDelta) : null,
      metadata: e.metadata,
      occurredAt: e.occurredAt,
    }))
  );
});

router.post("/events", async (req, res) => {
  const parsed = ingestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  const { itemId, source, eventType, message, quantityDelta, metadata, occurredAt } = parsed.data;
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    res.status(404).json({ message: "Item not found" });
    return;
  }

  const event = await prisma.iotEvent.create({
    data: {
      itemId,
      source,
      eventType,
      message: message ?? undefined,
      quantityDelta:
        quantityDelta != null && quantityDelta !== undefined
          ? new Prisma.Decimal(quantityDelta)
          : undefined,
      metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    },
    include: { item: { select: { sku: true, name: true } } },
  });

  res.status(201).json({
    id: event.id,
    itemId: event.itemId,
    sku: event.item.sku,
    source: event.source,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
  });
});

export default router;
