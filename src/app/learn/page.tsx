"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LearnIcon } from "@/components/Icons";

// ─── Content sections ───────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "panic",
    title: "What's happening to me?",
    icon: (
      <svg className="h-6 w-6 text-candle" viewBox="0 0 24 24" fill="none">
        <path d="M12 4L14 9H10L12 4Z" fill="currentColor" />
        <circle cx="12" cy="14" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 11V15M12 17V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-cream-dim">
        <p>
          A panic attack is a sudden surge of intense fear that triggers severe physical reactions when there is no real
          danger. It can feel like you&apos;re losing control, having a heart attack, or even dying.
        </p>
        <p className="font-medium text-cream">Common symptoms:</p>
        <ul className="ml-4 space-y-1 list-disc">
          <li>Racing or pounding heartbeat</li>
          <li>Shortness of breath or chest tightness</li>
          <li>Dizziness or lightheadedness</li>
          <li>Tingling or numbness in hands and feet</li>
          <li>Feeling detached from reality</li>
          <li>Nausea or stomach distress</li>
          <li>Hot or cold flashes</li>
        </ul>
        <p>
          Panic attacks typically peak within <span className="text-cream">10 minutes</span> and rarely last longer
          than 20-30 minutes. They are not dangerous, even though they feel terrifying.
        </p>
        <div className="rounded-xl bg-teal/8 p-4">
          <p className="text-cream">
            Your body is doing exactly what it was designed to do — responding to a perceived threat. The problem isn&apos;t
            your body. It&apos;s that the alarm is going off when there&apos;s no fire.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "nervous-system",
    title: "Why your body does this",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <path d="M12 2V22M8 6L12 2L16 6M8 10H16M6 14H18M8 18H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-cream-dim">
        <p>
          Your autonomic nervous system has two main branches that work like a gas pedal and a brake:
        </p>
        <div className="grid gap-3">
          <div className="rounded-xl border border-candle/15 bg-candle/5 p-4">
            <p className="mb-1 font-medium text-candle">Sympathetic — the &quot;gas pedal&quot;</p>
            <p>Activates your fight-or-flight response. Increases heart rate, dilates pupils, floods your body with adrenaline. Designed to help you survive danger.</p>
          </div>
          <div className="rounded-xl border border-teal/15 bg-teal/5 p-4">
            <p className="mb-1 font-medium text-teal-soft">Parasympathetic — the &quot;brake&quot;</p>
            <p>Slows heart rate, deepens breathing, promotes calm and recovery. This is the state the tools in this app help you access.</p>
          </div>
        </div>
        <p className="font-medium text-cream">Fight, flight, freeze, and fawn:</p>
        <ul className="ml-4 space-y-1.5 list-disc">
          <li><span className="text-cream">Fight:</span> Anger, tension, urge to confront</li>
          <li><span className="text-cream">Flight:</span> Urge to escape, restlessness, panic</li>
          <li><span className="text-cream">Freeze:</span> Shutdown, numbness, dissociation</li>
          <li><span className="text-cream">Fawn:</span> People-pleasing, losing your own boundaries</li>
        </ul>
        <p>
          All of these are <span className="text-cream">normal survival responses</span>. With practice, you can learn to recognize which state you&apos;re in and gently guide your nervous system back toward safety.
        </p>
      </div>
    ),
  },
  {
    id: "techniques",
    title: "How these tools help",
    icon: (
      <svg className="h-6 w-6 text-teal-soft" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-cream-dim">
        <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
          <p className="mb-1 font-medium text-cream">Breathing exercises</p>
          <p>
            Slow, extended exhales stimulate the vagus nerve (the longest nerve in your body, running from brain to gut). This directly slows your heart rate and signals safety to your nervous system.
          </p>
        </div>
        <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
          <p className="mb-1 font-medium text-cream">5-4-3-2-1 Grounding</p>
          <p>
            Engages the thinking part of your brain. During panic, your threat-detection center takes over. By deliberately noticing sensory details, you pull your brain back into the present.
          </p>
        </div>
        <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
          <p className="mb-1 font-medium text-cream">Body scan</p>
          <p>
            Builds awareness of your body&apos;s internal state. Many people with anxiety are disconnected from their body. Progressive relaxation helps you notice where you&apos;re holding tension and consciously release it.
          </p>
        </div>
        <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
          <p className="mb-1 font-medium text-cream">Bilateral stimulation</p>
          <p>
            Alternating left-right stimulation (like the butterfly hug) is connected to EMDR therapy research. It appears to help the brain process distressing experiences by engaging both hemispheres.
          </p>
        </div>
        <div className="rounded-xl border border-teal/10 bg-deep/40 p-4">
          <p className="mb-1 font-medium text-cream">Physiological sigh</p>
          <p>
            A double inhale followed by an extended exhale. Stanford researchers found this is the fastest known way to calm your nervous system in real time.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "window",
    title: "Your comfort zone (and how to widen it)",
    icon: (
      <svg className="h-6 w-6 text-candle-soft" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="3" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-cream-dim">
        <p>
          The &quot;window of tolerance&quot; is the zone where you can handle life&apos;s stresses without becoming overwhelmed or shutting down.
        </p>

        {/* Visual diagram */}
        <div className="rounded-xl border border-teal/15 bg-deep/60 p-5">
          <div className="space-y-3">
            <div className="rounded-lg bg-candle/10 p-3 text-center">
              <p className="text-xs font-medium text-candle">HYPERAROUSAL</p>
              <p className="mt-1 text-xs text-cream-dim/70">Anxiety, panic, rage, hypervigilance</p>
            </div>
            <div className="rounded-lg border border-teal/30 bg-teal/10 p-4 text-center">
              <p className="text-xs font-medium text-teal-soft">WINDOW OF TOLERANCE</p>
              <p className="mt-1 text-xs text-cream-dim/70">Calm, present, able to think and feel</p>
              <p className="mt-0.5 text-xs text-cream-dim/50">This is where you want to be</p>
            </div>
            <div className="rounded-lg bg-slate-blue/40 p-3 text-center">
              <p className="text-xs font-medium text-cream-dim">HYPOAROUSAL</p>
              <p className="mt-1 text-xs text-cream-dim/70">Numbness, disconnection, collapse, freeze</p>
            </div>
          </div>
        </div>

        <p>
          Trauma, chronic stress, and anxiety can <span className="text-cream">narrow your window</span> — meaning it takes less to push you out of it. Every tool in this app is designed to help you <span className="text-cream">widen your window</span> over time.
        </p>
        <div className="rounded-xl bg-teal/8 p-4">
          <p className="text-cream">
            Each time you use a regulation tool and come back to calm, you&apos;re training your nervous system that it&apos;s possible to return. Over time, this becomes easier and more automatic.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "helpers",
    title: "How to help someone you love",
    icon: (
      <svg className="h-6 w-6 text-candle" viewBox="0 0 24 24" fill="none">
        <path d="M17 8C17 5.24 14.76 3 12 3C9.24 3 7 5.24 7 8C7 12 12 15 12 15C12 15 17 12 17 8Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="8" r="2" fill="currentColor" />
        <path d="M8 19H16M10 22H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-cream-dim">
        <p>
          If someone you love experiences panic attacks, here&apos;s what they want you to know. <span className="text-cream">Share this section with them.</span>
        </p>

        <div className="space-y-2">
          {[
            { do: "Stay calm and present", dont: "Don't say \"just relax\" or \"calm down\"" },
            { do: "Speak slowly and softly", dont: "Don't raise your voice or show alarm" },
            { do: "Ask: \"What do you need right now?\"", dont: "Don't assume you know what will help" },
            { do: "Offer to breathe together", dont: "Don't force them to talk about it" },
            { do: "Remind them: \"This will pass\"", dont: "Don't minimize it (\"it's all in your head\")" },
            { do: "Stay with them unless asked to leave", dont: "Don't crowd their physical space" },
          ].map((item, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-teal/8 p-2.5">
                <p className="text-xs text-teal-soft">{item.do}</p>
              </div>
              <div className="rounded-lg bg-candle/6 p-2.5">
                <p className="text-xs text-candle-soft">{item.dont}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-teal/8 p-4">
          <p className="text-cream">
            The most powerful thing you can do is simply be there. Your calm, steady presence tells their nervous system:
            &quot;You&apos;re safe. I&apos;m not going anywhere.&quot;
          </p>
        </div>
      </div>
    ),
  },
];

const INTRO_KEY = "regulate-learn-intro-seen";

// ─── Component ──────────────────────────────────────────────────────

export default function LearnPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(INTRO_KEY);
    if (!seen) {
      setShowIntro(true);
    }
    setIntroChecked(true);
  }, []);

  function dismissIntro() {
    localStorage.setItem(INTRO_KEY, "1");
    setShowIntro(false);
  }

  function toggle(id: string) {
    setOpenSection(openSection === id ? null : id);
  }

  if (!introChecked) return null;

  // ─── INTRO SCREEN ──────────────────────────────────────────────

  if (showIntro) {
    return (
      <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Home
          </Link>

          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <div className="mb-6 flex justify-center">
              <LearnIcon className="h-10 w-10 text-teal-soft" />
            </div>
            <h1 className="text-2xl font-light tracking-tight text-cream">
              You don&apos;t need to read this right now.
            </h1>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-cream-dim">
              But when you&apos;re ready, understanding what&apos;s happening in your body can be part of healing.
            </p>
            <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-cream-dim/50">
              These aren&apos;t just concepts — they&apos;re maps that help you find your way back to yourself.
            </p>
            <button
              onClick={dismissIntro}
              className="mt-10 w-full max-w-[200px] rounded-2xl bg-teal/20 py-4 text-base font-medium text-teal-soft transition-all hover:bg-teal/30 active:scale-[0.98]"
            >
              Show me
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN CONTENT ──────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center px-5 pb-24 pt-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-cream-dim transition-colors hover:text-cream">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-y-px"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Home
        </Link>

        <header className="mb-8 mt-6 text-center">
          <div className="mb-3 flex justify-center"><LearnIcon className="h-8 w-8 text-teal-soft" /></div>
          <h1 className="text-xl font-semibold tracking-tight text-cream">Learn</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            Understanding what&apos;s happening in your body is part of healing.
          </p>
        </header>

        {/* Decorative SVG divider */}
        <div className="mb-6 flex justify-center">
          <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
            <path d="M0 4C10 0 20 8 30 4C40 0 50 8 60 4" stroke="rgba(42,107,110,0.3)" strokeWidth="1" />
          </svg>
        </div>

        {/* Accordion sections */}
        <div className="flex flex-col gap-2">
          {sections.map((section) => {
            const isOpen = openSection === section.id;
            return (
              <div key={section.id} className="rounded-2xl border border-teal/15 bg-deep/60 backdrop-blur-sm overflow-hidden">
                <button
                  onClick={() => toggle(section.id)}
                  className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-teal/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/60">
                    {section.icon}
                  </div>
                  <span className="flex-1 text-base font-medium text-cream">{section.title}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`shrink-0 text-cream-dim transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="border-t border-teal/10 px-5 pb-5 pt-4">
                    {section.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-8 rounded-xl bg-candle/5 p-4 text-center">
          <p className="text-xs leading-relaxed text-cream-dim/60">
            This information is for education, not medical advice.
            If you&apos;re struggling, please reach out to a mental health professional.
          </p>
        </div>
      </div>
    </div>
  );
}
