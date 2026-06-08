import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase config. Copy apps/api/.env.example to apps/api/.env and fill in " +
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

// Service-role client: bypasses RLS. Access control is enforced in the API layer.
// This key must never reach the browser.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
