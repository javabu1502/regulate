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
}: ModuleCardProps) {
  return (
    <Link href={href} className="group block rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/50">
      <div className="flex items-center gap-3.5 rounded-xl border border-slate-blue/15 bg-deep/40 px-4 py-3.5 transition-all duration-300 hover:border-teal/25 active:scale-[0.99]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-blue/50">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-cream">{title}</h3>
          <p className="mt-0.5 text-xs text-cream-dim/50">{description}</p>
        </div>
      </div>
    </Link>
  );
}
