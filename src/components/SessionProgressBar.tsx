"use client";

export default function SessionProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="mb-4 w-full">
      <div className="h-0.5 w-full rounded-full bg-slate-blue/20">
        <div
          className="h-full rounded-full bg-teal transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-center text-[10px] text-cream-dim/40">{current} of {total}</p>
    </div>
  );
}
