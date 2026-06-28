import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/auth/guards";
import { z } from "zod";

const CreateProjectSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().optional(),
  language: z.enum(["en", "ro", "bilingual"]).default("en"),
  platform: z
    .array(z.enum(["web", "mobile", "windows", "ai", "other"]))
    .default([])
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const auth = await requireApiUser(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Could not load projects.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ projects: data });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const auth = await requireApiUser(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid project input.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: auth.user.id,
      email: auth.user.email ?? "",
      display_name:
        typeof auth.user.user_metadata?.display_name === "string"
          ? auth.user.user_metadata.display_name
          : null
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json(
      { error: "Could not sync user profile.", details: profileError.message },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: auth.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      language: parsed.data.language,
      platform: parsed.data.platform
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create project.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ project: data }, { status: 201 });
}
