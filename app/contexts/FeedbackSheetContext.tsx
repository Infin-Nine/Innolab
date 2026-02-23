"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Ctx = {
  isOpen: boolean;
  postId: string | null;
  open: (postId: string) => void;
  close: () => void;
};

const FeedbackCtx = createContext<Ctx | undefined>(undefined);

export function FeedbackSheetProvider({ children }: { children: React.ReactNode }) {
  const [postId, setPostId] = useState<string | null>(null);
  const open = useCallback((id: string) => setPostId(id), []);
  const close = useCallback(() => setPostId(null), []);
  const value = useMemo(
    () => ({
      isOpen: !!postId,
      postId,
      open,
      close,
    }),
    [postId, open, close]
  );
  return <FeedbackCtx.Provider value={value}>{children}</FeedbackCtx.Provider>;
}

export function useFeedbackSheet() {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error("useFeedbackSheet must be used within FeedbackSheetProvider");
  return ctx;
}
