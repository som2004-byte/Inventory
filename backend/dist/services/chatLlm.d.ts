export declare function runInventoryLlmChat(params: {
    userMessage: string;
    history: {
        role: "user" | "assistant";
        content: string;
    }[];
}): Promise<{
    reply: string;
    usedLlm: true;
    model: string;
    usedTools: string[];
}>;
