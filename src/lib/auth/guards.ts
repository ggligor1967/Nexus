import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ApiAuthResult =
  | { ok: true; user: User }
  | { ok: false; status: 401; error: string };

export async function requireApiUser(
  supabase: SupabaseClient
): Promise<ApiAuthResult> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: "Unauthorized." };
  }

  return { ok: true, user };
}

export async function getOwnedProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
) {
  return supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
}
