import Link from "next/link";

interface ModuleCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor?: "teal" | "candle";
}

export default function ModuleCard({
  href,
  title,
  description,
  icon,
  accentColor = "teal",
}: ModuleCardProps) {
  const borderColor =
    accentColor === "candle"
      ? "border-candle/20 hover:border-candle/40"
      : "border-teal/20 hover:border-teal/40";

  const glowColor =
    accentColor === "candle"
      ? "group-hover:shadow-candle/10"
      : "group-hover:shadow-teal/10";

  return (
    <Link href={href} className="group block">
      <div
        className={`relative rounded-2xl border ${borderColor} bg-deep/60 backdrop-blur-sm p-5 transition-all duration-500 ease-out group-hover:translate-y-[-2px] group-hover:shadow-lg ${glowColor}`}
      >
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-blue/80 text-xl">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-medium text-cream">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-cream-dim">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
