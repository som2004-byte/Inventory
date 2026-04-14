import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { runInventoryLlmChat } from "../services/chatLlm.js";

const router = Router();
router.use(requireAuth);

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      })
    )
    .max(24)
    .optional(),
});

router.get("/status", (_req, res) => {
  res.json({
    hasOpenAiKey: Boolean(config.openaiApiKey),
    model: config.openaiModel,
    mode: config.openaiApiKey ? "openai" : "rules",
  });
});

async function ruleBasedReply(textRaw: string): Promise<string> {
  const text = textRaw.toLowerCase();
  const items = await prisma.item.findMany({ include: { category: true } });
  const low = items.filter((i) => Number(i.currentQuantity) <= i.reorderLevel);

  let reply =
    "Try asking about low stock, how many items, or a SKU. Set OPENAI_API_KEY on the server for a full AI assistant with live tool lookups.";

  if (text.includes("low stock") || text.includes("reorder")) {
    if (low.length === 0) {
      reply = "No items are currently at or below reorder level.";
    } else {
      reply = `There are ${low.length} low-stock items: ${low
        .slice(0, 8)
        .map((i) => `${i.name} (${i.sku}, qty ${Number(i.currentQuantity)})`)
        .join("; ")}${low.length > 8 ? "…" : ""}`;
    }
  } else if (text.includes("how many") && text.includes("item")) {
    reply = `You have ${items.length} items in the catalog.`;
  } else {
    const skuMatch = textRaw.match(/\b[A-Z0-9-]{3,}\b/i);
    if (skuMatch) {
      const sku = skuMatch[0];
      const found = items.find((i) => i.sku.toLowerCase() === sku.toLowerCase());
      if (found) {
        reply = `${found.name} (${found.sku}): quantity ${Number(found.currentQuantity)} ${
          found.unit
        }. Reorder at ${found.reorderLevel}.`;
      }
    }
  }
  return reply;
}

router.post("/", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  const { message, history = [] } = parsed.data;

  if (config.openaiApiKey) {
    try {
      const out = await runInventoryLlmChat({ userMessage: message, history });
      res.json({ ...out, mode: "openai" as const });
      return;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "LLM error";
      const fallback = await ruleBasedReply(message);
      res.json({
        reply: fallback,
        usedLlm: false,
        mode: "rules_fallback" as const,
        hint: "OpenAI temporarily failed; using safe rule fallback.",
        detail,
      });
      return;
    }
  }

  const reply = await ruleBasedReply(message);
  res.json({
    reply,
    usedLlm: false,
    mode: "rules" as const,
    hint: "Set OPENAI_API_KEY on the API server for GPT tool-calling on inventory data.",
  });
});

router.post("/stream", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }
  const { message, history = [] } = parsed.data;

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (obj: Record<string, unknown>) => {
    res.write(`${JSON.stringify(obj)}\n`);
  };

  try {
    if (config.openaiApiKey) {
      try {
        const out = await runInventoryLlmChat({ userMessage: message, history });
        send({
          type: "meta",
          mode: "openai",
          model: out.model,
          usedTools: out.usedTools,
          usedLlm: true,
        });
        // Stream words progressively to create a live typing experience.
        const parts = out.reply.split(/(\s+)/).filter((p) => p.length > 0);
        for (const part of parts) {
          send({ type: "chunk", delta: part });
        }
        send({ type: "done", mode: "openai" });
        res.end();
        return;
      } catch (e) {
        const detail = e instanceof Error ? e.message : "LLM error";
        const fallback = await ruleBasedReply(message);
        send({
          type: "meta",
          mode: "rules_fallback",
          hint: "OpenAI temporarily failed; using safe rule fallback.",
          detail,
          usedLlm: false,
        });
        send({ type: "chunk", delta: fallback });
        send({ type: "done", mode: "rules_fallback" });
        res.end();
        return;
      }
    }

    const fallback = await ruleBasedReply(message);
    send({
      type: "meta",
      mode: "rules",
      hint: "Set OPENAI_API_KEY on the API server for GPT tool-calling on inventory data.",
      usedLlm: false,
    });
    send({ type: "chunk", delta: fallback });
    send({ type: "done", mode: "rules" });
    res.end();
  } catch (e) {
    send({
      type: "error",
      message: e instanceof Error ? e.message : "Unknown chat stream error",
    });
    res.end();
  }
});

export default router;
