export type Frequency = "daily" | "weekly" | "monthly" | "occasionally" | "rare";

export type SolutionType =
  | "software"
  | "hardware"
  | "service"
  | "policy"
  | "research"
  | "education";

export type Problem = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  affected_group: string;
  frequency: Frequency | string;
  current_workaround: string;
  solution_type: SolutionType | string;
  expected_outcome?: string | null;
  additional_context?: string | null;
  created_at?: string | null;
  validation_count?: number;
  comment_count?: number;
  is_validated?: boolean;
};

export type ProblemCommentAuthor = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

export type ProblemComment = {
  id: string;
  problem_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string | null;
  author: ProblemCommentAuthor | null;
  canEdit?: boolean;
  replies: ProblemComment[];
};
