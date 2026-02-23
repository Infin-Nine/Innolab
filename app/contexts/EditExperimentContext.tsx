"use client";

import { createContext, useContext, useMemo, useState } from "react";

type EditContextValue = {
  editId: string | null;
  openEdit: (id: string) => void;
  closeEdit: () => void;
};

const EditContext = createContext<EditContextValue | undefined>(undefined);

export function EditProvider({ children }: { children: React.ReactNode }) {
  const [editId, setEditId] = useState<string | null>(null);
  const value = useMemo<EditContextValue>(
    () => ({
      editId,
      openEdit: (id: string) => setEditId(id),
      closeEdit: () => setEditId(null),
    }),
    [editId]
  );
  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}

export function useEdit() {
  const ctx = useContext(EditContext);
  if (!ctx) {
    throw new Error("useEdit must be used within an EditProvider");
  }
  return ctx;
}
