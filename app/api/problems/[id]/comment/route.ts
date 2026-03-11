import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: problemId } = await context.params;
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

  const { error } = await supabase.from("problem_comments").insert({
    problem_id: problemId,
    user_id: user.id,
    content,
    parent_id: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { count } = await supabase
    .from("problem_comments")
    .select("*", { count: "exact", head: true })
    .eq("problem_id", problemId);

  return NextResponse.json({ ok: true, commentCount: count ?? 0 });
}
