"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type AuthMode = "login" | "signup";

type LoginModalContextValue = {
  isOpen: boolean;
  mode: AuthMode;
  openLoginModal: (onSuccess?: () => void, preferredMode?: AuthMode) => void;
  closeLoginModal: () => void;
  setMode: (mode: AuthMode) => void;
  consumePendingAction: () => (() => void) | null;
};

const LoginModalContext = createContext<LoginModalContextValue | undefined>(undefined);

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const pendingActionRef = useRef<(() => void) | null>(null);

  const openLoginModal = useCallback((onSuccess?: () => void, preferredMode: AuthMode = "login") => {
    pendingActionRef.current = onSuccess ?? null;
    setMode(preferredMode);
    setIsOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const consumePendingAction = useCallback(() => {
    const next = pendingActionRef.current;
    pendingActionRef.current = null;
    return next;
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      mode,
      openLoginModal,
      closeLoginModal,
      setMode,
      consumePendingAction,
    }),
    [isOpen, mode, openLoginModal, closeLoginModal, consumePendingAction]
  );

  return <LoginModalContext.Provider value={value}>{children}</LoginModalContext.Provider>;
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) {
    throw new Error("useLoginModal must be used within LoginModalProvider");
  }
  return ctx;
}

