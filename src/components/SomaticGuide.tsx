"use client";

// ─── Somatic movement guides ────────────────────────────────────────
// Ten of the fourteen somatic exercises were a paragraph, a row of dots and
// a countdown. Reading is the first thing to go when you are panicking, so
// each one shows the shape of the movement instead.
//
// The first attempt drew a stick figure. Rendered on a phone it looked like
// clipart next to the rest of the app, which is all soft arcs, thin strokes
// and low-opacity glow. These are abstract: a soft presence standing in for
// the body, and luminous traces for where the movement goes. They show the
// shape of a motion rather than demonstrating one, so there is nothing to
// study and nothing to perform.
//
// CSS keyframes, so the global reduce-motion rule freezes each of them into
// a still diagram with no extra handling.

const TEAL = "rgba(153, 246, 228, ";
const CANDLE = "rgba(226, 203, 140, ";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 120 80" className="h-24 w-36" fill="none" role="img" aria-label={label}>
      <defs>
        <radialGradient id="sg-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(153,246,228,0.22)" />
          <stop offset="100%" stopColor="rgba(153,246,228,0)" />
        </radialGradient>
        <linearGradient id="sg-fall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(226,203,140,0)" />
          <stop offset="45%" stopColor="rgba(226,203,140,0.85)" />
          <stop offset="100%" stopColor="rgba(226,203,140,0)" />
        </linearGradient>
        <linearGradient id="sg-out" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(226,203,140,0)" />
          <stop offset="100%" stopColor="rgba(226,203,140,0.8)" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

/** A soft upright presence. Stands in for the body without drawing one. */
function Presence({ className = "" }: { className?: string }) {
  return (
    <g className={className}>
      <ellipse cx="60" cy="40" rx="30" ry="34" fill="url(#sg-body)" />
      <rect x="52" y="16" width="16" height="48" rx="8" fill={`${TEAL}0.1)`} />
      <rect
        x="52"
        y="16"
        width="16"
        height="48"
        rx="8"
        stroke={`${TEAL}0.4)`}
        strokeWidth="1"
      />
    </g>
  );
}

export default function SomaticGuide({ technique }: { technique: string }) {
  switch (technique) {
    case "body-shaking":
      return (
        <Frame label="The whole body shaking loose">
          <g className="sg-jitter">
            <Presence />
          </g>
          <g className="sg-jitter" style={{ animationDelay: "0.08s" }}>
            <circle cx="40" cy="30" r="2" fill={`${TEAL}0.5)`} />
            <circle cx="80" cy="46" r="2" fill={`${TEAL}0.4)`} />
            <circle cx="44" cy="56" r="1.6" fill={`${TEAL}0.35)`} />
          </g>
        </Frame>
      );

    case "air-punching":
      return (
        <Frame label="Punching forward, alternating arms">
          <Presence />
          <g strokeLinecap="round" strokeWidth="3">
            <path className="sg-punch-a" d="M70 32h22" stroke="url(#sg-out)" />
            <path className="sg-punch-b" d="M70 48h22" stroke="url(#sg-out)" />
          </g>
        </Frame>
      );

    case "dancing":
      return (
        <Frame label="Moving freely, no set pattern">
          <g className="sg-swing">
            <Presence />
          </g>
          <g fill="none" stroke={`${TEAL}0.3)`} strokeWidth="1.4" strokeLinecap="round">
            <path className="sg-swell" d="M26 52c6-10 6-20 0-28" />
            <path className="sg-swell" style={{ animationDelay: "1.8s" }} d="M94 52c-6-10-6-20 0-28" />
          </g>
        </Frame>
      );

    case "havening":
      return (
        <Frame label="Hands stroking slowly down from the shoulders">
          <Presence />
          {/* Two trails falling down the arms, offset so it reads as repeating */}
          <g strokeWidth="3.5" strokeLinecap="round">
            <path className="sg-stroke" d="M44 22v18" stroke="url(#sg-fall)" />
            <path
              className="sg-stroke"
              style={{ animationDelay: "1.3s" }}
              d="M76 22v18"
              stroke="url(#sg-fall)"
            />
          </g>
        </Frame>
      );

    case "eye-press":
      return (
        <Frame label="Palms resting gently over closed eyes">
          <circle cx="60" cy="40" r="22" fill="url(#sg-body)" />
          <g stroke={`${TEAL}0.45)`} strokeWidth="1.4" strokeLinecap="round">
            <path d="M50 38c2-2.4 4.4-2.4 6.4 0" />
            <path d="M63.6 38c2-2.4 4.4-2.4 6.4 0" />
          </g>
          <g className="sg-press" stroke={`${CANDLE}0.7)`} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M34 28c-5 7-5 17 0 24" />
            <path d="M86 28c5 7 5 17 0 24" />
          </g>
        </Frame>
      );

    case "bearing-down":
      return (
        <Frame label="Steady downward pressure through the middle">
          <Presence />
          <g className="sg-hold">
            <rect x="48" y="30" width="24" height="24" rx="11" fill={`${CANDLE}0.14)`} />
            <path
              d="M60 28v22M54 44l6 6 6-6"
              stroke={`${CANDLE}0.8)`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </Frame>
      );

    case "orienting":
      return (
        <Frame label="Gaze moving slowly around the room">
          <rect x="16" y="12" width="88" height="56" rx="8" stroke={`${TEAL}0.2)`} strokeWidth="1.2" />
          <g className="sg-gaze">
            <circle cx="60" cy="40" r="14" fill="url(#sg-body)" />
            <circle cx="60" cy="40" r="5" fill={`${CANDLE}0.85)`} />
          </g>
        </Frame>
      );

    case "pendulation":
      return (
        <Frame label="Attention moving between a tense place and an easy one">
          <circle cx="34" cy="40" r="15" stroke="rgba(194,122,106,0.4)" strokeWidth="1.3" />
          <circle cx="86" cy="40" r="15" stroke={`${TEAL}0.3)`} strokeWidth="1.3" />
          <path d="M49 40h22" stroke={`${TEAL}0.2)`} strokeWidth="1.2" strokeDasharray="2 4" />
          <g className="sg-swing">
            <circle cx="60" cy="40" r="12" fill="url(#sg-body)" />
            <circle cx="60" cy="40" r="5" fill={`${TEAL}0.9)`} />
          </g>
        </Frame>
      );

    case "return-to-safety":
      return (
        <Frame label="One hand on the chest, one on the belly">
          <Presence />
          <g className="sg-swell">
            <circle cx="52" cy="32" r="8" fill={`${TEAL}0.26)`} />
            <circle cx="68" cy="48" r="8" fill={`${CANDLE}0.22)`} />
          </g>
        </Frame>
      );

    case "vagus-nerve-massage":
      return (
        <Frame label="Small circles behind the ear and down the neck">
          <circle cx="60" cy="34" r="20" fill="url(#sg-body)" />
          <circle cx="60" cy="34" r="20" stroke={`${TEAL}0.35)`} strokeWidth="1.2" />
          <path d="M60 54v12" stroke={`${TEAL}0.3)`} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="80" cy="36" r="9" stroke={`${TEAL}0.2)`} strokeWidth="1.1" strokeDasharray="2 4" />
          <g className="sg-rub" style={{ transformOrigin: "80px 36px" }}>
            <circle cx="89" cy="36" r="3.4" fill={`${CANDLE}0.85)`} />
          </g>
        </Frame>
      );

    default:
      return null;
  }
}
