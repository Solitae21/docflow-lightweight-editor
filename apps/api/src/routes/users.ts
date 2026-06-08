import { Router } from "express";
import type { LoginRequest } from "@docflow/shared";
import { supabase } from "../supabase.js";

export const usersRouter = Router();

// List seeded users — used by the login picker and the share dialog.
usersRouter.get("/users", async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    res.json(data);
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

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "No user with that email. Try a seeded account." });
      return;
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
});
