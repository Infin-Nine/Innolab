"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

type AboutSectionProps = {
  aboutText: string;
  onReadMore: () => void;
  className?: string;
};

export default function AboutSection({
  aboutText,
  onReadMore,
  className = "",
}: AboutSectionProps) {
  const aboutPreviewRef = useRef<HTMLParagraphElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = aboutPreviewRef.current;
    if (!element) return;

    const detectOverflow = () => {
      setIsOverflowing(element.scrollHeight - element.clientHeight > 1);
    };

    const frameId = window.requestAnimationFrame(detectOverflow);
    const resizeObserver = new ResizeObserver(detectOverflow);
    resizeObserver.observe(element);
    window.addEventListener("resize", detectOverflow);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", detectOverflow);
    };
  }, [aboutText]);

  return (
    <div className={`mt-2 max-w-[34rem] ${className}`.trim()}>
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">About</p>
      <p
        ref={aboutPreviewRef}
        className="mt-2 text-sm leading-relaxed text-slate-300 [display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2] whitespace-pre-line"
      >
        {aboutText}
      </p>
      {isOverflowing && (
        <button
          type="button"
          onClick={onReadMore}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 transition hover:text-cyan-100"
        >
          Read More
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

