import OpenAI from "openai";
import { config } from "../config.js";
import { dispatchInventoryTool } from "./inventoryTools.js";
const tools = [
    {
        type: "function",
        function: {
            name: "list_low_stock",
            description: "List inventory items at or below their reorder level (need restocking). Use for low stock, reorder, out of stock questions.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "integer", description: "Max rows (default 15, max 50)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "search_items",
            description: "Search items by name or SKU substring (case-insensitive).",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search text" },
                    limit: { type: "integer", description: "Max results (default 10, max 30)" },
                },
                required: ["query"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_item_by_sku",
            description: "Get full details for one item by exact SKU (case-insensitive).",
            parameters: {
                type: "object",
                properties: { sku: { type: "string" } },
                required: ["sku"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_catalog_stats",
            description: "High-level counts: total items, categories, low-stock count, sum of quantities.",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "list_categories",
            description: "List product categories and how many items are in each.",
            parameters: { type: "object", properties: {} },
        },
    },
];
const SYSTEM = `You are an inventory assistant for a single warehouse/catalog. 
Answer clearly and concisely. Use the provided tools for factual stock data—never invent SKUs, quantities, or categories.
If a tool returns empty results, say so. Round numbers readably.`;
function parseArgs(raw) {
    try {
        const v = JSON.parse(raw || "{}");
        return typeof v === "object" && v !== null && !Array.isArray(v) ? v : {};
    }
    catch {
        return {};
    }
}
export async function runInventoryLlmChat(params) {
    const apiKey = config.openaiApiKey;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set");
    }
    const client = new OpenAI({
        apiKey,
        baseURL: config.openaiBaseUrl,
    });
    const messages = [
        { role: "system", content: SYSTEM },
        ...params.history.map((h) => ({ role: h.role, content: h.content })),
        { role: "user", content: params.userMessage },
    ];
    const usedTools = [];
    const maxSteps = 8;
    for (let step = 0; step < maxSteps; step++) {
        const completion = await client.chat.completions.create({
            model: config.openaiModel,
            messages,
            tools,
            tool_choice: "auto",
            temperature: 0.3,
            max_tokens: 500,
        });
        const choice = completion.choices[0];
        if (!choice?.message) {
            return { reply: "No response from the model.", usedLlm: true, model: config.openaiModel, usedTools };
        }
        const msg = choice.message;
        if (choice.finish_reason === "tool_calls" && msg.tool_calls?.length) {
            const assistantMsg = {
                role: "assistant",
                content: msg.content,
                tool_calls: msg.tool_calls,
            };
            messages.push(assistantMsg);
            for (const tc of msg.tool_calls) {
                if (tc.type !== "function")
                    continue;
                usedTools.push(tc.function.name);
                const args = parseArgs(tc.function.arguments);
                const result = await dispatchInventoryTool(tc.function.name, args);
                messages.push({
                    role: "tool",
                    tool_call_id: tc.id,
                    content: JSON.stringify(result),
                });
            }
            continue;
        }
        const text = msg.content?.trim() || "I could not generate a reply.";
        return { reply: text, usedLlm: true, model: config.openaiModel, usedTools };
    }
    return {
        reply: "Too many tool steps; try a simpler question.",
        usedLlm: true,
        model: config.openaiModel,
        usedTools,
    };
}
//# sourceMappingURL=chatLlm.js.map