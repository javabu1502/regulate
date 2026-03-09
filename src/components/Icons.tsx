// Shared SVG icons for the Regulate app.
// Minimal, organic line icons — no emojis.

const base = "shrink-0";

export function BreathingIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4C12 4 8 8 8 12C8 16 12 20 12 20C12 20 16 16 16 12C16 8 12 4 12 4Z" />
      <path d="M12 8V16" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export function GroundingIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M12 3V7M12 7L8 11M12 7L16 11" />
      <path d="M5 14H19" />
      <path d="M7 18H17" />
      <path d="M9 22H15" />
    </svg>
  );
}

export function BodyScanIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V14" />
      <path d="M8 10L12 7.5L16 10" />
      <path d="M12 14L9 21M12 14L15 21" />
    </svg>
  );
}

export function SomaticIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M4 16C8 8 10 6 12 6C14 6 16 8 20 16" />
      <path d="M6 20C9 14 11 12 12 12C13 12 15 14 18 20" opacity="0.4" />
    </svg>
  );
}

export function AffirmationsIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21C12 21 3 16 3 10C3 7 5.5 4.5 8 4.5C9.5 4.5 11 5.5 12 7C13 5.5 14.5 4.5 16 4.5C18.5 4.5 21 7 21 10C21 16 12 21 12 21Z" />
    </svg>
  );
}

export function JournalIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7H15M9 11H15M9 15H12" />
    </svg>
  );
}

export function LearnIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8V12L15 14" />
    </svg>
  );
}

export function CaregiverIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4C14.5 4 13 5 12 6.5C11 5 9.5 4 8 4C5 4 3 6.5 3 9C3 14 12 20 12 20C12 20 21 14 21 9C21 6.5 19 4 16 4Z" />
      <path d="M12 13V16M10.5 14.5H13.5" />
    </svg>
  );
}

export function SafetyPlanIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L20 7V13C20 17 16 20 12 21C8 20 4 17 4 13V7L12 3Z" />
      <path d="M9 12L11 14L15 10" />
    </svg>
  );
}

export function HeadphonesIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18V12C3 7 7 3 12 3C17 3 21 7 21 12V18" />
      <rect x="3" y="15" width="4" height="5" rx="1" />
      <rect x="17" y="15" width="4" height="5" rx="1" />
    </svg>
  );
}

export function CandleIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C12 2 9 6 9 8C9 10 10.5 11 12 11C13.5 11 15 10 15 8C15 6 12 2 12 2Z" />
      <rect x="10" y="11" width="4" height="10" rx="1" />
    </svg>
  );
}
