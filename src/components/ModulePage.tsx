import BackLink from "./BackLink";

interface ModulePageProps {
  icon: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export default function ModulePage({
  icon,
  title,
  subtitle,
  children,
}: ModulePageProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center px-5 pb-16 pt-8">
      <main className="relative z-10 w-full max-w-md">
        <BackLink />

        <header className="mb-8 mt-6 text-center">
          <div className="mb-3 text-4xl">{icon}</div>
          <h1 className="text-xl font-semibold tracking-tight text-cream">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-cream-dim">
            {subtitle}
          </p>
        </header>

        <div className="rounded-2xl border border-teal/15 bg-deep/60 p-6 backdrop-blur-sm">
          {children ?? (
            <p className="text-center text-sm text-cream-dim">
              Coming soon. This space is being prepared for you.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
