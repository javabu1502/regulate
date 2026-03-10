"use client";

import { useRef, useEffect, useState } from "react";

interface MicroExplanationProps {
  text: string;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
}

export default function MicroExplanation({ text, isOpen, onToggle }: MicroExplanationProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [text, isOpen]);

  return (
    <>
      {/* "?" button — positioned at top-right of parent (parent must be relative) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggle(e);
        }}
        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-medium transition-all duration-200 ${
          isOpen
            ? "border-teal/40 bg-teal/15 text-teal-soft/70"
            : "border-cream-dim/15 text-cream-dim/30 hover:border-cream-dim/30 hover:text-cream-dim/60"
        }`}
        aria-label="Why this works"
      >
        ?
      </button>

      {/* Expandable explanation */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: isOpen ? height : 0, opacity: isOpen ? 1 : 0 }}
      >
        <div ref={contentRef} className="border-t border-cream-dim/10 pt-2.5 mt-2.5">
          <p className="text-xs leading-relaxed text-cream-dim/70">{text}</p>
        </div>
      </div>
    </>
  );
}
