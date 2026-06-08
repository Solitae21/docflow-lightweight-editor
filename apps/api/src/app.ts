import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { requireUser } from "./middleware/auth.js";
import { usersRouter } from "./routes/users.js";
import { documentsRouter } from "./routes/documents.js";

// Builds the Express app without binding a port, so tests can import it
// (supertest) and index.ts can listen on it.
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Public routes (no auth): list users, login.
  app.use("/api", usersRouter);

  // Authenticated routes. The shares router is nested inside the documents
  // router (see routes/documents.ts), so requireUser authenticates once.
  app.use("/api/documents", requireUser, documentsRouter);

  // 404 for unmatched API routes.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  // Central error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[api error]", err);
    const message = err instanceof Error ? err.message : "Internal server error.";
    res.status(500).json({ error: message });
  });

  return app;
}
