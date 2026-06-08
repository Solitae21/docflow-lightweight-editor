import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { requireUser } from "./middleware/auth.js";
import { usersRouter } from "./routes/users.js";
import { documentsRouter } from "./routes/documents.js";
import { sharesRouter } from "./routes/shares.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Public routes (no auth): list users, login.
app.use("/api", usersRouter);

// Authenticated routes.
app.use("/api/documents", requireUser, documentsRouter);
app.use("/api/documents/:id/shares", requireUser, sharesRouter);

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

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`DocFlow API listening on http://localhost:${PORT}`);
});
