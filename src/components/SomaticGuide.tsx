"use client";

// ─── Somatic movement guides ────────────────────────────────────────
// Ten of the fourteen somatic exercises were a paragraph, a row of dots and
// a countdown. Reading is the first thing to go when you are panicking, so
// each one shows the shape of the movement instead.
//
// Two earlier attempts were wrong in opposite directions. A stick figure
// looked like clipart. Replacing it with a bare capsule and gradient strokes
// went too abstract to read, and worse, the gradients silently failed: an SVG
// gradient defaults to objectBoundingBox units, and a straight horizontal or
// vertical line has a zero-area bounding box, so those strokes drew nothing
// at all. Air punching was a glowing pill and no arms.
//
// So: a soft silhouette that reads as a body at a glance, and motion drawn in
// solid strokes with arrowheads, pointing where the movement goes. Still
// abstract, but legible. CSS keyframes, so the global reduce-motion rule
// freezes every guide into a still diagram.

const TEAL = "rgba(153, 246, 228, ";
const CANDLE = "rgba(226, 203, 140, ";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 120 80" className="h-24 w-36" fill="none" role="img" aria-label={label}>
      <defs>
        <radialGradient id="sg-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(153,246,228,0.2)" />
          <stop offset="100%" stopColor="rgba(153,246,228,0)" />
        </radialGradient>
        {/* Arrowhead, so a stroke reads as a direction rather than a mark */}
        <marker id="sg-tip" markerWidth="5" markerHeight="5" refX="3.6" refY="2.5" orient="auto">
          <path d="M0 0.6L4 2.5L0 4.4Z" fill={`${CANDLE}0.85)`} />
        </marker>
        <marker id="sg-tip-teal" markerWidth="5" markerHeight="5" refX="3.6" refY="2.5" orient="auto">
          <path d="M0 0.6L4 2.5L0 4.4Z" fill={`${TEAL}0.8)`} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

/** A head and torso. Enough to read as a body, not enough to be a drawing. */
function Body({ className = "" }: { className?: string }) {
  return (
    <g className={className}>
      <ellipse cx="60" cy="42" rx="26" ry="30" fill="url(#sg-halo)" />
      <circle cx="60" cy="20" r="7" fill={`${TEAL}0.3)`} stroke={`${TEAL}0.55)`} strokeWidth="1.2" />
      <path
        d="M50 34h20a4 4 0 0 1 4 4v20a6 6 0 0 1-6 6H52a6 6 0 0 1-6-6V38a4 4 0 0 1 4-4Z"
        fill={`${TEAL}0.14)`}
        stroke={`${TEAL}0.5)`}
        strokeWidth="1.2"
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
            <Body />
          </g>
          {/* Motion lines, the way a shaken thing is drawn */}
          <g className="sg-jitter" stroke={`${TEAL}0.45)`} strokeWidth="1.6" strokeLinecap="round">
            <path d="M30 34h6M28 44h6M32 54h6" />
            <path d="M84 34h6M86 44h6M82 54h6" />
          </g>
        </Frame>
      );

    case "air-punching":
      return (
        <Frame label="Punching forward, alternating arms">
          <Body />
          <g stroke={`${CANDLE}0.85)`} strokeWidth="2.6" strokeLinecap="round">
            <path className="sg-punch-a" d="M76 40h18" markerEnd="url(#sg-tip)" />
            <path className="sg-punch-b" d="M76 54h18" markerEnd="url(#sg-tip)" />
          </g>
        </Frame>
      );

    case "dancing":
      return (
        <Frame label="Moving freely, no set pattern">
          <g className="sg-swing">
            <Body />
          </g>
          <g stroke={`${TEAL}0.35)`} strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path className="sg-swell" d="M22 56c8-12 8-24 0-32" />
            <path className="sg-swell" style={{ animationDelay: "1.8s" }} d="M98 56c-8-12-8-24 0-32" />
          </g>
        </Frame>
      );

    case "havening":
      return (
        <Frame label="Hands stroking slowly down from the shoulders">
          <Body />
          <g stroke={`${CANDLE}0.85)`} strokeWidth="2.6" strokeLinecap="round">
            <path className="sg-stroke" d="M42 30v22" markerEnd="url(#sg-tip)" />
            <path
              className="sg-stroke"
              style={{ animationDelay: "1.3s" }}
              d="M78 30v22"
              markerEnd="url(#sg-tip)"
            />
          </g>
        </Frame>
      );

    case "eye-press":
      return (
        <Frame label="Palms resting gently over closed eyes">
          <ellipse cx="60" cy="40" rx="24" ry="24" fill="url(#sg-halo)" />
          <circle cx="60" cy="40" r="19" stroke={`${TEAL}0.45)`} strokeWidth="1.3" />
          {/* closed eyes */}
          <g stroke={`${TEAL}0.65)`} strokeWidth="1.6" strokeLinecap="round">
            <path d="M50 38c2-2.6 4.6-2.6 6.6 0" />
            <path d="M63.4 38c2-2.6 4.6-2.6 6.6 0" />
          </g>
          {/* palms pressing in */}
          <g className="sg-press" stroke={`${CANDLE}0.8)`} strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M31 28c-4 7-4 17 0 24" />
            <path d="M89 28c4 7 4 17 0 24" />
          </g>
        </Frame>
      );

    case "bearing-down":
      return (
        <Frame label="Steady downward pressure through the middle">
          <Body />
          <g className="sg-hold">
            <rect x="48" y="36" width="24" height="26" rx="12" fill={`${CANDLE}0.14)`} />
            <path
              d="M60 34v20"
              stroke={`${CANDLE}0.85)`}
              strokeWidth="2.6"
              strokeLinecap="round"
              markerEnd="url(#sg-tip)"
            />
          </g>
        </Frame>
      );

    case "orienting":
      return (
        <Frame label="Gaze moving slowly around the room">
          <rect x="14" y="10" width="92" height="60" rx="8" stroke={`${TEAL}0.25)`} strokeWidth="1.3" />
          <g className="sg-gaze">
            <circle cx="60" cy="40" r="15" fill="url(#sg-halo)" />
            <circle cx="60" cy="40" r="6" fill={`${CANDLE}0.9)`} />
          </g>
        </Frame>
      );

    case "pendulation":
      return (
        <Frame label="Attention moving between a tense place and an easy one">
          <circle cx="30" cy="40" r="16" stroke="rgba(194,122,106,0.45)" strokeWidth="1.4" />
          <circle cx="90" cy="40" r="16" stroke={`${TEAL}0.35)`} strokeWidth="1.4" />
          <path
            d="M46 40h28"
            stroke={`${TEAL}0.3)`}
            strokeWidth="1.4"
            strokeDasharray="3 4"
            markerEnd="url(#sg-tip-teal)"
          />
          <g className="sg-swing">
            <circle cx="60" cy="40" r="13" fill="url(#sg-halo)" />
            <circle cx="60" cy="40" r="6" fill={`${TEAL}0.9)`} />
          </g>
        </Frame>
      );

    case "return-to-safety":
      return (
        <Frame label="One hand on the chest, one on the belly">
          <Body />
          <g className="sg-swell">
            <circle cx="52" cy="42" r="7.5" fill={`${TEAL}0.3)`} stroke={`${TEAL}0.6)`} strokeWidth="1.2" />
            <circle cx="68" cy="56" r="7.5" fill={`${CANDLE}0.26)`} stroke={`${CANDLE}0.6)`} strokeWidth="1.2" />
          </g>
        </Frame>
      );

    case "vagus-nerve-massage":
      return (
        <Frame label="Small circles behind the ear and down the neck">
          <ellipse cx="56" cy="34" rx="22" ry="24" fill="url(#sg-halo)" />
          <circle cx="56" cy="32" r="17" stroke={`${TEAL}0.45)`} strokeWidth="1.3" />
          <path d="M56 49v14" stroke={`${TEAL}0.35)`} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="80" cy="36" r="10" stroke={`${CANDLE}0.4)`} strokeWidth="1.3" strokeDasharray="3 4" />
          <g className="sg-rub" style={{ transformOrigin: "80px 36px" }}>
            <circle cx="90" cy="36" r="3.8" fill={`${CANDLE}0.9)`} />
          </g>
        </Frame>
      );

    default:
      return null;
  }
}
