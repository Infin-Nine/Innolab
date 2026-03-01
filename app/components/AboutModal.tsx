"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type AboutModalProps = {
  open: boolean;
  onClose: () => void;
  aboutText: string;
  title?: string;
};

const ANIMATION_MS = 220;

export default function AboutModal({
  open,
  onClose,
  aboutText,
  title = "About",
}: AboutModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      style={{ animation: `aboutModalFadeIn ${ANIMATION_MS}ms ease-out` }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      <div
        className="w-[95vw] max-h-[85vh] max-w-[680px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl"
        style={{ animation: `aboutModalScaleIn ${ANIMATION_MS}ms ease-out` }}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            aria-label="Close about modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-6 text-[15px] leading-[1.7] text-slate-200 whitespace-pre-line">
          {aboutText}
        </div>
      </div>
      <style jsx global>{`
        @keyframes aboutModalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes aboutModalScaleIn {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
