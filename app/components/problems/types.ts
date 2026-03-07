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
};
