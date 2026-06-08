import type { User } from "@docflow/shared";
import { supabase } from "../supabase.js";

// Data access for users. Routes call these and never touch supabase directly.

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data as User[];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data as User) ?? null;
}
