"use client";

export default function BreathOrb() {
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* Large background orb */}
      <div className="animate-breathe absolute h-[500px] w-[500px] rounded-full bg-gradient-radial from-teal/10 via-teal/5 to-transparent blur-3xl" />
      {/* Smaller accent orb */}
      <div
        className="animate-breathe absolute h-[300px] w-[300px] rounded-full bg-gradient-radial from-candle/8 via-candle/3 to-transparent blur-2xl"
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}
