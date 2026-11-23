"use client";

// ─── Somatic movement guides ────────────────────────────────────────
// Four of the fourteen somatic exercises had their own visual and the other
// ten were a paragraph of instructions, a row of dots and a countdown.
// Reading is the first thing to go when you are panicking, so each of those
// ten gets a plain diagram of the movement instead.
//
// Deliberately crude: a few strokes, soft colour, nothing to study. It shows
// the shape of the movement, it does not demonstrate it. The animation is CSS
// so the global reduce-motion rule freezes every one of these into a still
// diagram without any extra handling here.

const TEAL = "rgba(153, 246, 228, 0.75)";
const TEAL_DIM = "rgba(125, 211, 200, 0.28)";
const CANDLE = "rgba(226, 203, 140, 0.8)";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 80 56"
      className="h-20 w-28"
      fill="none"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/** A simple upright figure the movement guides hang off. */
function Figure({ className = "" }: { className?: string }) {
  return (
    <g className={className} stroke={TEAL} strokeWidth="1.6" strokeLinecap="round">
      <circle cx="40" cy="14" r="5" />
      <path d="M40 19v18" />
      <path d="M40 23l-9 7M40 23l9 7" />
      <path d="M40 37l-7 12M40 37l7 12" />
    </g>
  );
}

export default function SomaticGuide({ technique }: { technique: string }) {
  switch (technique) {
    // Loose shaking: the whole figure trembles.
    case "body-shaking":
      return (
        <Frame label="A figure shaking loosely from head to feet">
          <Figure className="sg-jitter" />
        </Frame>
      );

    // Alternating punches forward.
    case "air-punching":
      return (
        <Frame label="Arms punching forward, alternating left and right">
          <Figure />
          <g stroke={CANDLE} strokeWidth="1.8" strokeLinecap="round">
            <path className="sg-punch-a" d="M49 28h10" />
            <path className="sg-punch-b" d="M31 32h10" transform="scale(-1,1) translate(-80,0)" />
          </g>
        </Frame>
      );

    // Free movement: the figure drifts rather than follows a pattern.
    case "dancing":
      return (
        <Frame label="A figure moving freely, no set pattern">
          <Figure className="sg-swing" />
          <g fill={TEAL_DIM}>
            <circle className="sg-swell" cx="18" cy="20" r="2.5" />
            <circle className="sg-swell" cx="63" cy="34" r="2" style={{ animationDelay: "1.6s" }} />
          </g>
        </Frame>
      );

    // Havening: slow strokes down the arms.
    case "havening":
      return (
        <Frame label="Hands stroking slowly down from the shoulders">
          <Figure />
          <g stroke={CANDLE} strokeWidth="2" strokeLinecap="round">
            <path className="sg-stroke" d="M29 26h7" />
            <path className="sg-stroke" d="M44 26h7" style={{ animationDelay: "1.3s" }} />
          </g>
        </Frame>
      );

    // Palms resting over closed eyes.
    case "eye-press":
      return (
        <Frame label="Palms resting gently over closed eyes">
          <g stroke={TEAL} strokeWidth="1.6" strokeLinecap="round">
            <circle cx="40" cy="26" r="13" />
            <path d="M33 24c1.6-1.6 3.4-1.6 5 0M42 24c1.6-1.6 3.4-1.6 5 0" />
          </g>
          <g className="sg-press" stroke={CANDLE} strokeWidth="1.8" strokeLinecap="round">
            <path d="M26 20c-3 4-3 9 0 13" />
            <path d="M54 20c3 4 3 9 0 13" />
          </g>
        </Frame>
      );

    // Bearing down: steady downward pressure through the middle.
    case "bearing-down":
      return (
        <Frame label="Steady downward pressure through the middle of the body">
          <Figure />
          <g className="sg-hold">
            <rect x="33" y="24" width="14" height="13" rx="6" fill="rgba(226,203,140,0.16)" />
            <path d="M40 24v13" stroke={CANDLE} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M36 34l4 4 4-4" stroke={CANDLE} strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </Frame>
      );

    // Orienting: the gaze travels around the room.
    case "orienting":
      return (
        <Frame label="Gaze moving slowly left, right, up and down around the room">
          <rect x="10" y="8" width="60" height="40" rx="4" stroke={TEAL_DIM} strokeWidth="1.4" />
          <circle className="sg-gaze" cx="40" cy="28" r="4.5" fill={CANDLE} />
        </Frame>
      );

    // Pendulation: attention swings between a tight place and an easy one.
    case "pendulation":
      return (
        <Frame label="Attention moving back and forth between a tense place and a comfortable one">
          <circle cx="22" cy="28" r="9" stroke="rgba(194,122,106,0.4)" strokeWidth="1.4" />
          <circle cx="58" cy="28" r="9" stroke={TEAL_DIM} strokeWidth="1.4" />
          <path d="M31 28h18" stroke={TEAL_DIM} strokeWidth="1.2" strokeDasharray="2 3" />
          <circle className="sg-swing" cx="40" cy="28" r="4" fill={TEAL} />
        </Frame>
      );

    // Return to safety: hands on chest and belly.
    case "return-to-safety":
      return (
        <Frame label="One hand on the chest, one on the belly">
          <Figure />
          <g className="sg-swell">
            <circle cx="35" cy="26" r="4.5" fill="rgba(153,246,228,0.3)" />
            <circle cx="45" cy="34" r="4.5" fill="rgba(226,203,140,0.26)" />
          </g>
        </Frame>
      );

    // Vagus nerve massage: small circles behind the ear and down the neck.
    case "vagus-nerve-massage":
      return (
        <Frame label="Small circles behind the ear and down the side of the neck">
          <g stroke={TEAL} strokeWidth="1.6" strokeLinecap="round">
            <circle cx="40" cy="22" r="12" />
            <path d="M40 34v8" />
          </g>
          <g className="sg-rub" style={{ transformOrigin: "52px 24px" }}>
            <circle cx="55" cy="24" r="3" fill={CANDLE} />
          </g>
          <circle cx="52" cy="24" r="6.5" stroke={TEAL_DIM} strokeWidth="1.2" strokeDasharray="2 3" />
        </Frame>
      );

    default:
      return null;
  }
}
