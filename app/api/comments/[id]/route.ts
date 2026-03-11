import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabaseServer";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { content?: string } | null;
  const content = body?.content?.trim() ?? "";

  if (!content) {
    return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("problem_comments")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: comment, error: commentError } = await supabase
    .from("problem_comments")
    .select("id, problem_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (commentError) {
    return NextResponse.json({ error: commentError.message }, { status: 400 });
  }

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("problem_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { count } = await supabase
    .from("problem_comments")
    .select("*", { count: "exact", head: true })
    .eq("problem_id", comment.problem_id);

  return NextResponse.json({ ok: true, commentCount: count ?? 0 });
}
