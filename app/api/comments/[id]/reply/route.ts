import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: parentId } = await context.params;
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
    return NextResponse.json({ error: "Reply content is required" }, { status: 400 });
  }

  const { data: parent, error: parentError } = await supabase
    .from("problem_comments")
    .select("id, problem_id, parent_id")
    .eq("id", parentId)
    .maybeSingle();

  if (parentError) {
    return NextResponse.json({ error: parentError.message }, { status: 400 });
  }

  if (!parent) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (parent.parent_id) {
    return NextResponse.json({ error: "Replies can only be one level deep" }, { status: 400 });
  }

  const { error } = await supabase.from("problem_comments").insert({
    problem_id: parent.problem_id,
    user_id: user.id,
    content,
    parent_id: parent.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { count } = await supabase
    .from("problem_comments")
    .select("*", { count: "exact", head: true })
    .eq("problem_id", parent.problem_id);

  return NextResponse.json({ ok: true, commentCount: count ?? 0 });
}
