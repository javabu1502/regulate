"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMeditationsByCategory } from "@/lib/meditations";

const categories = getMeditationsByCategory();

export default function MeditationsPage() {
  // Which meditations have a recording. Read from the build-time audio
  // manifest (one request, and the service worker already caches it) rather
  // than probing fifteen files. null while unknown, so nothing flickers.
  const [recorded, setRecorded] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/audio-manifest.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((files: string[]) => {
        if (!active) return;
        const ids = files
          .filter((f) => f.startsWith("/audio/meditations/"))
          .map((f) => f.slice("/audio/meditations/".length).replace(/\.\w+$/, ""));
        setRecorded(new Set(ids));
      })
      .catch(() => active && setRecorded(new Set()));
    return () => {
      active = false;
    };
  }, []);

  const anyRecorded = recorded === null || recorded.size > 0;

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-10">
      <main className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-cream-dim/40 transition-colors hover:text-cream-dim/60"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Home
        </Link>

        {/* Header */}
        <header className="mb-8 text-center">
          {/* Meditation icon — person sitting */}
          <svg
            className="mx-auto mb-3 h-7 w-7 text-teal-soft/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="4" r="2" />
            <path d="M12 6v4" />
            <path d="M8 14c0-2.2 1.8-4 4-4s4 1.8 4 4" />
            <path d="M6 18l2-4" />
            <path d="M18 18l-2-4" />
            <path d="M9 22l1-4" />
            <path d="M15 22l-1-4" />
          </svg>
          <h1 className="text-xl font-light tracking-tight text-cream">
            Guided Meditations
          </h1>
          <p className="mt-1.5 text-xs text-cream-dim/60">
            Someone walks you through it.
          </p>
          {!anyRecorded && (
            <p className="mx-auto mt-3 max-w-[300px] text-xs leading-relaxed text-cream-dim/40">
              The recordings are still being made. Everything else in the app is
              ready to use now.
            </p>
          )}
        </header>

        {/* Categories */}
        <div className="flex flex-col gap-8">
          {categories.map((group) => (
            <section key={group.category}>
              <p className="mb-3 text-[10px] uppercase tracking-widest text-cream-dim/40">
                {group.category}
              </p>
              <div className="flex flex-col gap-2">
                {group.items.map((m) => {
                  const isRecorded = recorded === null || recorded.has(m.id);
                  return (
                    <Link
                      key={m.id}
                      href={`/meditations/${m.id}`}
                      className={`group flex items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${
                        isRecorded
                          ? "border-teal/10 bg-deep/60 hover:border-teal/25"
                          : "border-slate-blue/10 bg-deep/30 hover:border-slate-blue/25"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className={`block text-sm font-medium ${isRecorded ? "text-cream" : "text-cream-dim/70"}`}>
                          {m.title}
                        </span>
                        <span className="block text-xs text-cream-dim/50">
                          {m.description}
                        </span>
                      </div>
                      <span className="ml-3 shrink-0 text-[11px] text-cream-dim/30">
                        {isRecorded ? m.duration : "Not recorded yet"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
