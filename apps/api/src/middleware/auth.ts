import type { NextFunction, Request, Response } from "express";
import type { User } from "@docflow/shared";
import { supabase } from "../supabase.js";

// Augment Express's Request so handlers can read req.user safely.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Lightweight auth: the frontend stores the logged-in user's id and sends it
 * as the `x-user-id` header. We load that user and attach it to the request.
 * No passwords/tokens — this is an intentionally simple model for the exam.
 */
export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.header("x-user-id");
  if (!userId) {
    res.status(401).json({ error: "Not authenticated (missing x-user-id header)." });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    res.status(401).json({ error: "Invalid user." });
    return;
  }

  req.user = data as User;
  next();
}
