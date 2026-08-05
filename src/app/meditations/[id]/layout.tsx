import { meditations } from "@/lib/meditations";

// Prerender every meditation page so the service worker can precache them
// for offline use — the player itself is a client component.
export function generateStaticParams() {
  return meditations.map((m) => ({ id: m.id }));
}

export default function MeditationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
