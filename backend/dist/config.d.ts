/**
 * This app supports PostgreSQL only (see prisma/schema.prisma).
 * Call before creating the Express app so misconfiguration fails immediately.
 */
export declare function assertPostgresDatabaseUrl(): void;
export declare const config: {
    port: number;
    jwtSecret: string;
    webOrigin: string;
    /** When set, forecast POST proxies to FastAPI at this base URL (e.g. http://localhost:8001). */
    mlServiceUrl: string;
    mlInternalKey: string;
    openaiApiKey: string;
    openaiModel: string;
    openaiBaseUrl: string | undefined;
    googleClientId: string;
};
