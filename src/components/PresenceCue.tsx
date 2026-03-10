"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const PHRASES = [
  "I'm right here with you.",
  "You're doing great.",
  "Stay with me.",
  "You're not alone in this.",
  "Keep going. I'm here.",
  "You're safe right now.",
  "One breath at a time.",
  "I'm not going anywhere.",
];

function shuffleAvoidingRepeat(phrases: string[], lastPhrase: string | null): string[] {
  const shuffled = [...phrases].sort(() => Math.random() - 0.5);
  // If the first phrase matches the last shown, swap it with another position
  if (shuffled[0] === lastPhrase && shuffled.length > 1) {
    const swapIndex = 1 + Math.floor(Math.random() * (shuffled.length - 1));
    [shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]];
  }
  return shuffled;
}

interface PresenceCueProps {
  active: boolean;
}

export default function PresenceCue({ active }: PresenceCueProps) {
  const [visible, setVisible] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState("");
  const queueRef = useRef<string[]>([]);
  const lastPhraseRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<"idle" | "fadeIn" | "hold" | "fadeOut">("idle");

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const getNextPhrase = useCallback((): string => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffleAvoidingRepeat(PHRASES, lastPhraseRef.current);
    }
    const phrase = queueRef.current.shift()!;
    lastPhraseRef.current = phrase;
    return phrase;
  }, []);

  const startCycle = useCallback(() => {
    if (!active) return;

    const phrase = getNextPhrase();
    setCurrentPhrase(phrase);

    // Fade in
    phaseRef.current = "fadeIn";
    setVisible(true);

    // After 1s fade-in, hold for 4s
    timeoutRef.current = setTimeout(() => {
      phaseRef.current = "hold";

      // After 4s hold, fade out
      timeoutRef.current = setTimeout(() => {
        phaseRef.current = "fadeOut";
        setVisible(false);

        // After 1s fade-out, wait 8-12s before next
        timeoutRef.current = setTimeout(() => {
          phaseRef.current = "idle";
          const delay = 8000 + Math.random() * 4000;
          timeoutRef.current = setTimeout(startCycle, delay);
        }, 1000);
      }, 4000);
    }, 1000);
  }, [active, getNextPhrase]);

  useEffect(() => {
    if (active) {
      // Start first cycle after a short initial delay (3-5s)
      const initialDelay = 3000 + Math.random() * 2000;
      timeoutRef.current = setTimeout(startCycle, initialDelay);
    } else {
      clearTimer();
      setVisible(false);
      phaseRef.current = "idle";
    }

    return clearTimer;
  }, [active, startCycle, clearTimer]);

  if (!currentPhrase) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-28 left-0 right-0 z-10 flex justify-center px-6"
      aria-hidden="true"
    >
      <p
        className={`text-center text-sm italic text-cream-dim/50 transition-opacity duration-1000 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {currentPhrase}
      </p>
    </div>
  );
}
