import type { ProblemComment, ProblemCommentAuthor } from "../components/problems/types";

type ProblemCommentRow = {
  id: string;
  problem_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string | null;
  profiles?:
    | {
        id: string;
        username?: string | null;
        avatar_url?: string | null;
        email?: string | null;
      }
    | null;
};

export function mapProblemCommentAuthor(
  profile: ProblemCommentRow["profiles"]
): ProblemCommentAuthor | null {
  if (!profile?.id) {
    return null;
  }

  return {
    id: profile.id,
    username: profile.username ?? null,
    avatar_url: profile.avatar_url ?? null,
    email: profile.email ?? null,
  };
}

export function buildProblemCommentTree(rows: ProblemCommentRow[]): ProblemComment[] {
  const items: ProblemComment[] = rows.map((row) => ({
    id: row.id,
    problem_id: row.problem_id,
    user_id: row.user_id,
    content: row.content,
    parent_id: row.parent_id,
    created_at: row.created_at,
    author: mapProblemCommentAuthor(row.profiles),
    replies: [],
  }));

  const byId = new Map(items.map((item) => [item.id, item]));
  const roots: ProblemComment[] = [];

  items.forEach((item) => {
    if (!item.parent_id) {
      roots.push(item);
      return;
    }

    const parent = byId.get(item.parent_id);
    if (!parent) {
      roots.push(item);
      return;
    }

    parent.replies.push(item);
  });

  roots.forEach((root) => {
    root.replies.sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
  });

  roots.sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bt - at;
  });

  return roots;
}
