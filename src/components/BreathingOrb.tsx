"use client";

interface BreathingOrbProps {
  /** 0 = fully contracted, 1 = fully expanded */
  progress: number;
  phase: "inhale" | "hold" | "exhale" | "rest";
}

export default function BreathingOrb({ progress, phase }: BreathingOrbProps) {
  const scale = 0.55 + progress * 0.45;

  const glowOpacity =
    phase === "inhale" || phase === "exhale"
      ? 0.25 + progress * 0.35
      : 0.3 + progress * 0.2;

  const candleOpacity = phase === "hold" || phase === "rest" ? 0.15 : 0.08;

  return (
    <div className="pointer-events-none relative flex items-center justify-center">
      {/* Outer glow */}
      <div
        className="absolute h-[340px] w-[340px] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(42,107,110,${glowOpacity * 0.5}) 0%, rgba(42,107,110,0) 70%)`,
          transform: `scale(${scale * 1.15})`,
          transition: "transform 0.3s ease-out, background 0.3s ease-out",
        }}
      />

      {/* Main orb */}
      <div
        className="relative h-[220px] w-[220px] rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 35%, rgba(90,171,174,${glowOpacity + 0.1}) 0%, rgba(42,107,110,${glowOpacity}) 40%, rgba(26,42,74,0.6) 75%, rgba(17,29,53,0.4) 100%)`,
          transform: `scale(${scale})`,
          transition: "transform 0.3s ease-out, background 0.3s ease-out",
          boxShadow: `0 0 60px rgba(42,107,110,${glowOpacity * 0.6}), 0 0 120px rgba(42,107,110,${glowOpacity * 0.3}), inset 0 0 40px rgba(90,171,174,${glowOpacity * 0.3})`,
        }}
      />

      {/* Candle warmth center */}
      <div
        className="absolute h-[100px] w-[100px] rounded-full blur-xl"
        style={{
          background: `radial-gradient(circle, rgba(232,184,109,${candleOpacity}) 0%, transparent 70%)`,
          transform: `scale(${scale})`,
          transition: "transform 0.3s ease-out, opacity 0.5s ease-out",
        }}
      />
    </div>
  );
}
