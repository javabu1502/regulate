"use client";

// ─── Somatic movement guides ────────────────────────────────────────
// Ten of the fourteen somatic exercises were a paragraph, a row of dots and
// a countdown. Reading is the first thing to go when you are panicking, so
// each one shows the shape of the movement instead.
//
// This is the fourth attempt and the first with a person in it. A stick
// figure was dismissed early as looking like clipart, which was the wrong
// call. What replaced it was a head on a rounded rectangle, and a cue that
// says "shake your hands out" was drawn with no hands anywhere in it. An
// abstract mark cannot show a movement a body makes, because the thing
// being shown is which part of you moves and where it goes.
//
// So: a figure with arms and legs, kept to plain strokes with no face and
// no fingers, and the moving part drawn brighter than the rest. CSS
// keyframes, so the global reduce-motion rule freezes each one into a still
// diagram for free.
//
// Two guides used a class called sg-swell that was never defined, so they
// did not move at all. It exists now.

const TEAL = "rgba(167, 203, 197, ";
const CANDLE = "rgba(214, 189, 146, ";
const CORAL = "rgba(194, 122, 106, ";

const LINE = `${TEAL}0.5)`;
const BRIGHT = `${CANDLE}0.9)`;

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" fill="none" role="img" aria-label={label}>
      <defs>
        <radialGradient id="sg-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`${TEAL}0.16)`} />
          <stop offset="100%" stopColor={`${TEAL}0)`} />
        </radialGradient>
        <marker id="sg-tip" markerWidth="5" markerHeight="5" refX="3.6" refY="2.5" orient="auto">
          <path d="M0 0.6L4 2.5L0 4.4Z" fill={BRIGHT} />
        </marker>
      </defs>
      <ellipse cx="50" cy="52" rx="42" ry="44" fill="url(#sg-halo)" />
      {children}
      {/* the ground, so the figure is standing rather than floating */}
      <path d="M26 86h48" stroke={`${TEAL}0.18)`} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Head and spine. Every guide starts here and adds its own limbs. */
function Core({ className = "" }: { className?: string }) {
  return (
    <g className={className} stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
      <circle cx="50" cy="17" r="8" />
      <path d="M50 25v33" />
    </g>
  );
}

/** Legs, in the stance the exercise is done in. */
function Legs({ apart = false }: { apart?: boolean }) {
  return (
    <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
      <path d={apart ? "M50 58L36 86" : "M50 58L42 86"} />
      <path d={apart ? "M50 58L64 86" : "M50 58L58 86"} />
    </g>
  );
}

/** A hand, drawn as a small disc so you can see where it has got to. */
function Hand({ cx, cy, bright = true }: { cx: number; cy: number; bright?: boolean }) {
  return <circle cx={cx} cy={cy} r="3.4" fill={bright ? BRIGHT : `${TEAL}0.55)`} />;
}

export default function SomaticGuide({ technique }: { technique: string }) {
  switch (technique) {
    case "body-shaking":
      return (
        <Frame label="Standing loose, shaking the arms and hands out">
          <g className="sg-jitter">
            <Core />
            <Legs apart />
            {/* arms hang down and shake from the shoulder */}
            <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
              <g className="sg-shake-arm" style={{ transformOrigin: "50px 32px" }}>
                <path d="M50 32L34 54" />
                <circle cx="34" cy="54" r="3.4" fill={BRIGHT} stroke="none" />
              </g>
              <g
                className="sg-shake-arm"
                style={{ transformOrigin: "50px 32px", animationDelay: "0.13s" }}
              >
                <path d="M50 32L66 54" />
                <circle cx="66" cy="54" r="3.4" fill={BRIGHT} stroke="none" />
              </g>
            </g>
          </g>
          {/* the blur a shaken hand leaves */}
          <g className="sg-jitter" stroke={`${CANDLE}0.4)`} strokeWidth="1.6" strokeLinecap="round">
            <path d="M24 50h5M22 57h5" />
            <path d="M71 50h5M73 57h5" />
          </g>
        </Frame>
      );

    case "air-punching":
      return (
        <Frame label="Punching forward, one arm then the other">
          <Core />
          <Legs apart />
          <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
            {/* each arm swings out from the shoulder in turn */}
            <g className="sg-arm-a" style={{ transformOrigin: "50px 32px" }}>
              <path d="M50 32L36 46" />
              <circle cx="36" cy="46" r="3.4" fill={BRIGHT} stroke="none" />
            </g>
            <g className="sg-arm-b" style={{ transformOrigin: "50px 32px" }}>
              <path d="M50 32L64 46" />
              <circle cx="64" cy="46" r="3.4" fill={BRIGHT} stroke="none" />
            </g>
          </g>
        </Frame>
      );

    case "dancing":
      return (
        <Frame label="Moving freely, arms up, no set pattern">
          <g className="sg-sway">
            <Core />
            <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
              <path d="M50 32L33 20" />
              <path d="M50 32L67 20" />
            </g>
            <Hand cx={33} cy={20} />
            <Hand cx={67} cy={20} />
            <Legs apart />
          </g>
        </Frame>
      );

    case "havening":
      return (
        <Frame label="Hands crossed at the shoulders, stroking slowly down the arms">
          <Core />
          <Legs />
          {/* the arms being stroked */}
          <g stroke={`${TEAL}0.3)`} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M50 32L34 56" />
            <path d="M50 32L66 56" />
          </g>
          {/* the hands travelling down them, along the arm rather than
              straight down, or they slide off onto the chest */}
          <g className="sg-stroke-l">
            <Hand cx={47} cy={36} />
          </g>
          <g className="sg-stroke-r" style={{ animationDelay: "1.4s" }}>
            <Hand cx={53} cy={36} />
          </g>
        </Frame>
      );

    case "eye-press":
      return (
        <Frame label="Palms resting over closed eyes">
          <Core />
          <Legs />
          {/* arms bent up to the face */}
          <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M50 34L34 40L41 21" />
            <path d="M50 34L66 40L59 21" />
          </g>
          <g className="sg-press" style={{ transformOrigin: "50px 19px" }}>
            <Hand cx={42} cy={18} />
            <Hand cx={58} cy={18} />
          </g>
        </Frame>
      );

    case "bearing-down":
      return (
        <Frame label="Braced, pressing down through the middle">
          <Core />
          <Legs apart />
          {/* The arms used to run out at the same angle as the legs, so the
              whole figure read as one X and you could not see it had arms.
              They come down closer to the body and end in a hand. */}
          <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M50 32L40 52" />
            <path d="M50 32L60 52" />
          </g>
          <Hand cx={40} cy={52} bright={false} />
          <Hand cx={60} cy={52} bright={false} />
          <g className="sg-hold" style={{ transformOrigin: "50px 44px" }}>
            <path
              d="M50 32v20"
              stroke={BRIGHT}
              strokeWidth="2.6"
              strokeLinecap="round"
              markerEnd="url(#sg-tip)"
            />
          </g>
        </Frame>
      );

    case "orienting":
      return (
        <Frame label="Turning the head slowly to look around the room">
          <rect x="12" y="8" width="76" height="72" rx="7" stroke={`${TEAL}0.2)`} strokeWidth="1.4" />
          <path
            d="M30 17a24 24 0 0 1 40 0"
            stroke={`${CANDLE}0.3)`}
            strokeWidth="1.4"
            strokeDasharray="3 4"
            fill="none"
          />
          <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M50 25v33" />
            <path d="M50 32L38 52" />
            <path d="M50 32L62 52" />
          </g>
          <Legs />
          {/* only the head moves */}
          <g className="sg-head-turn">
            <circle cx="50" cy="17" r="8" stroke={LINE} strokeWidth="2.4" fill={`${TEAL}0.1)`} />
            <circle cx="50" cy="17" r="2.6" fill={BRIGHT} />
          </g>
        </Frame>
      );

    case "pendulation":
      return (
        <Frame label="Attention moving between a tense place and an easy one">
          <Core />
          <Legs />
          <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M50 32L37 52" />
            <path d="M50 32L63 52" />
          </g>
          {/* somewhere tight, and somewhere that feels alright */}
          <circle cx="50" cy="34" r="7" stroke={`${CORAL}0.55)`} strokeWidth="1.8" />
          <circle cx="50" cy="56" r="7" stroke={`${TEAL}0.45)`} strokeWidth="1.8" />
          <path d="M50 41v8" stroke={`${TEAL}0.3)`} strokeWidth="1.4" strokeDasharray="2 3" />
          <g className="sg-pend">
            <circle cx="50" cy="45" r="3.4" fill={BRIGHT} />
          </g>
        </Frame>
      );

    case "return-to-safety":
      return (
        <Frame label="One hand on the chest, one on the belly">
          <Core />
          <Legs />
          <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M50 32L37 40L47 35" />
            <path d="M50 32L64 46L51 50" />
          </g>
          <g className="sg-swell">
            <Hand cx={47} cy={35} />
            <circle cx="51" cy="50" r="3.4" fill={`${TEAL}0.75)`} />
          </g>
        </Frame>
      );

    case "vagus-nerve-massage":
      return (
        <Frame label="Small circles behind the ear and down the side of the neck">
          <Core />
          <Legs />
          <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M50 32L36 50" />
            {/* the working hand comes up to the neck */}
            <path d="M50 32L66 40L60 26" />
          </g>
          <circle
            cx="59"
            cy="24"
            r="7"
            stroke={`${CANDLE}0.35)`}
            strokeWidth="1.4"
            strokeDasharray="3 4"
            fill="none"
          />
          <g className="sg-rub" style={{ transformOrigin: "59px 24px" }}>
            <Hand cx={66} cy={24} />
          </g>
        </Frame>
      );

    default:
      return null;
  }
}
