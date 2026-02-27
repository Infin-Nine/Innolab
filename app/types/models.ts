export type WipStatus =
  | "idea"
  | "prototype"
  | "built"
  | "wip"
  | "failed"
  | "exploring"
  | "testing"
  | "completed";

export type Profile = {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  id: string;
  email?: string | null;
};

export type Post = {
  id: string;
  user_id: string;
  problem_id?: string | null;
  problem_title?: string | null;
  title: string | null;
  problem_statement: string | null;
  theory?: string | null;
  explanation?: string | null;
  approach?: string | null;
  observations?: string | null;
  reflection?: string | null;
  feedback_needed?: string[] | string | null;
  external_link?: string | null;
  wip_status: WipStatus | null;
  media_url: string | null;
  created_at: string | null;
  profiles?: Profile | Profile[] | null;
  problems?:
    | { id?: string | null; title?: string | null }
    | { id?: string | null; title?: string | null }[]
    | null;
  validations?: { count: number }[];
  solutions?: { count: number }[];
};

export type Solution = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string | null;
};
