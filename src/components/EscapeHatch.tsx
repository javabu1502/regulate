import Link from "next/link";

export default function EscapeHatch() {
  return (
    <Link
      href="/crisis"
      aria-label="Crisis resources"
      className="fixed bottom-20 right-3 z-50 flex min-h-[44px] items-center gap-1 rounded-full px-3 py-2 text-xs text-cream-dim/50 transition-colors duration-300 hover:text-cream-dim/70 focus:outline-none focus:ring-2 focus:ring-teal/50"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0"
        aria-hidden="true"
      >
        <path
          d="M8 1C8 1 2 4 2 8.5C2 11 4 14 8 15C12 14 14 11 14 8.5C14 4 8 1 8 1Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      I need help
    </Link>
  );
}
