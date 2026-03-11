import { redirect } from "next/navigation";

type ExperimentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExperimentCreatePage({ params }: ExperimentPageProps) {
  const { id } = await params;
  redirect(`/solutions/new?problemId=${encodeURIComponent(id)}`);
}
