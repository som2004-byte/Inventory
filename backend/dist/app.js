import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import itemRoutes from "./routes/items.js";
import dashboardRoutes from "./routes/dashboard.js";
import forecastRoutes from "./routes/forecast.js";
import chatRoutes from "./routes/chat.js";
import alertsRoutes from "./routes/alerts.js";
import zonesRoutes from "./routes/zones.js";
import iotRoutes from "./routes/iot.js";
import smartRoutes from "./routes/smart.js";
export function createApp() {
    const app = express();
    app.use(helmet());
    app.use(cors({
        origin: config.webOrigin,
        credentials: true,
    }));
    app.use(morgan("dev"));
    app.use(express.json({ limit: "1mb" }));
    app.get("/health", (_req, res) => {
        res.json({ ok: true });
    });
    app.use("/api/auth", authRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/items", itemRoutes);
    app.use("/api/dashboard", dashboardRoutes);
    app.use("/api/forecast", forecastRoutes);
    app.use("/api/chat", chatRoutes);
    app.use("/api/alerts", alertsRoutes);
    app.use("/api/zones", zonesRoutes);
    app.use("/api/iot", iotRoutes);
    app.use("/api/smart", smartRoutes);
    app.use((_req, res) => {
        res.status(404).json({ message: "Not found" });
    });
    app.use((err, _req, res, _next) => {
        console.error(err);
        const name = err instanceof Error ? err.name : "";
        if (name === "PrismaClientInitializationError" || name === "PrismaClientRustPanicError") {
            res.status(503).json({
                message: "Database unreachable. Start PostgreSQL (e.g. docker compose up -d postgres) and verify DATABASE_URL.",
                detail: err instanceof Error ? err.message : undefined,
            });
            return;
        }
        res.status(500).json({
            message: "Internal server error",
            detail: err instanceof Error ? err.message : undefined,
        });
    });
    return app;
}
//# sourceMappingURL=app.js.map