"use client";

import { useState } from "react";

const APP_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? window.location.origin
  : "https://regulate-liart.vercel.app";

/**
 * Infer the route path from technique name and category.
 */
function getRoute(category: string): string {
  const c = category.toLowerCase();
  if (c === "breathing") return "/breathing";
  if (c === "somatic") return "/somatic";
  if (c === "grounding") return "/grounding";
  if (c === "body scan" || c === "body-scan") return "/body-scan";
  if (c === "sleep") return "/sleep";
  if (c === "affirmations") return "/affirmations";
  return "";
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

interface ShareCardProps {
  technique: string;
  category: string;
}

export default function ShareCard({ technique, category }: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const route = getRoute(category);
  const shareUrl = `${APP_URL}${route}`;
  const shareText = `${technique} helped me today. Try it: ${shareUrl}. Regulate \u2014 somatic tools for your nervous system.`;

  async function handleShare() {
    // Try native share first
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        });
        return;
      } catch {
        // User cancelled or share failed - fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    await copyToClipboard();
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: old execCommand fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/70"
      aria-label={`Share ${technique}`}
    >
      <ShareIcon className="shrink-0" />
      <span>{copied ? "Copied!" : "Share this technique"}</span>
    </button>
  );
}
