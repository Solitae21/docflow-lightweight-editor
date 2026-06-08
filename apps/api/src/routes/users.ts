import { Router } from "express";
import type { LoginRequest } from "@docflow/shared";
import { findUserByEmail, listUsers } from "../lib/users.js";

export const usersRouter = Router();

// List seeded users — used by the login picker and the share dialog.
usersRouter.get("/users", async (_req, res, next) => {
  try {
    res.json(await listUsers());
  } catch (err) {
    next(err);
  }
});

// Lightweight login: look up a user by email and return it.
usersRouter.post("/auth/login", async (req, res, next) => {
  try {
    const { email } = req.body as LoginRequest;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "email is required." });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: "No user with that email. Try a seeded account." });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});
