"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CreatePost from "../../components/CreatePost";

function NewLabPostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const problemId = searchParams.get("problemId");
  const problemTitle = searchParams.get("problemTitle");

  const safeProblemTitle = useMemo(() => {
    if (!problemTitle) return null;
    return problemTitle.slice(0, 120);
  }, [problemTitle]);

  return (
    <div className="min-h-screen bg-slate-950">
      <CreatePost
        isOpen
        onClose={() => router.push("/problems")}
        linkedProblemId={problemId}
        linkedProblemTitle={safeProblemTitle}
      />
    </div>
  );
}

export default function NewLabPostPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <NewLabPostContent />
    </Suspense>
  );
}
