import { NextResponse } from "next/server";
import { buildProblemCommentTree } from "../../../../lib/problemComments";
import { createSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: problemId } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("problem_comments")
    .select("id, problem_id, user_id, content, parent_id, created_at")
    .eq("problem_id", problemId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (((data as unknown[]) ?? []) as Array<{
    id: string;
    problem_id: string;
    user_id: string;
    content: string;
    parent_id: string | null;
    created_at: string | null;
  }>).slice();

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  let profilesById = new Map<
    string,
    {
      id: string;
      username?: string | null;
      avatar_url?: string | null;
      email?: string | null;
    }
  >();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, email")
      .in("id", userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    profilesById = new Map(
      (((profiles as unknown[]) ?? []) as Array<{
        id: string;
        username?: string | null;
        avatar_url?: string | null;
        email?: string | null;
      }>).map((profile) => [profile.id, profile])
    );
  }

  return NextResponse.json({
    comments: buildProblemCommentTree(
      rows.map((row) => ({
        ...row,
        profiles: profilesById.get(row.user_id) ?? null,
      }))
    ),
  });
}
