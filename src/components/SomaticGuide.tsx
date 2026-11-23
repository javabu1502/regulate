"use client";

// ─── Somatic movement guides ────────────────────────────────────────
// Ten of the fourteen somatic exercises were a paragraph, a row of dots and
// a countdown. Reading is the first thing to go when you are panicking, so
// each one shows the shape of the movement instead.
//
// Four attempts got here. A capsule with gradient strokes was too abstract
// to read, and the gradients silently drew nothing on straight lines. A
// head on a rounded rectangle had no hands at all, in a set of exercises
// that are mostly about where your hands go. Straight sticks could show a
// limb but not a posture: an arm with no elbow cannot be braced, or
// guarding, or reaching across the body.
//
// So the figure has joints. Shoulders and hips sit at fixed points, and
// each guide places the elbows, wrists, knees and feet where that exercise
// actually puts them, which is what makes it a demonstration rather than a
// diagram. Still a line drawing with no face and no fingers. The moving
// part is drawn brighter than the rest, and it moves with CSS keyframes so
// the global reduce-motion rule freezes each one into a still pose.

type Pt = [number, number];

const TEAL = "rgba(167, 203, 197, ";
const CANDLE = "rgba(214, 189, 146, ";
const CORAL = "rgba(194, 122, 106, ";

const LINE = `${TEAL}0.55)`;
const DIM = `${TEAL}0.3)`;
const BRIGHT = `${CANDLE}0.9)`;

// Where the body hangs from. Everything else is placed per exercise.
const SH_L: Pt = [39, 30];
const SH_R: Pt = [61, 30];
const HIP_L: Pt = [43.5, 57];
const HIP_R: Pt = [56.5, 57];

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28" fill="none" role="img" aria-label={label}>
      <defs>
        <radialGradient id="sg-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`${TEAL}0.15)`} />
          <stop offset="100%" stopColor={`${TEAL}0)`} />
        </radialGradient>
        <marker id="sg-tip" markerWidth="5" markerHeight="5" refX="3.6" refY="2.5" orient="auto">
          <path d="M0 0.6L4 2.5L0 4.4Z" fill={BRIGHT} />
        </marker>
      </defs>
      <ellipse cx="50" cy="52" rx="42" ry="44" fill="url(#sg-halo)" />
      {children}
      <path d="M24 88h52" stroke={`${TEAL}0.16)`} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Head and the taper from shoulders to hips. */
function Torso({ className = "" }: { className?: string }) {
  return (
    <g className={className}>
      <path
        d="M39 30q11-4 22 0l-4.5 27h-13Z"
        fill={`${TEAL}0.08)`}
        stroke={LINE}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M50 26v-3" stroke={LINE} strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

function Head({ className = "", tilt = 0 }: { className?: string; tilt?: number }) {
  return (
    <g
      className={className}
      style={tilt ? { transform: `rotate(${tilt}deg)`, transformOrigin: "50px 24px" } : undefined}
    >
      <ellipse
        cx="50"
        cy="15"
        rx="7.5"
        ry="8.5"
        fill={`${TEAL}0.1)`}
        stroke={LINE}
        strokeWidth="2.2"
      />
    </g>
  );
}

/**
 * A limb in two segments with the joint showing, which is the whole reason
 * for this version: a straight line can point somewhere but it cannot hold
 * a posture.
 */
function Limb({
  from,
  joint,
  to,
  colour = LINE,
  end,
}: {
  from: Pt;
  joint: Pt;
  to: Pt;
  colour?: string;
  end?: "foot";
}) {
  return (
    <g stroke={colour} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M${from[0]} ${from[1]}L${joint[0]} ${joint[1]}L${to[0]} ${to[1]}`} />
      <circle cx={joint[0]} cy={joint[1]} r="1.5" fill={colour} stroke="none" />
      {end === "foot" && <path d={`M${to[0] - 4} ${to[1]}h8`} strokeWidth="2.6" />}
    </g>
  );
}

/** A hand, drawn as a small disc so you can see where it has got to. */
function Hand({ cx, cy, bright = true }: { cx: number; cy: number; bright?: boolean }) {
  return <circle cx={cx} cy={cy} r="3.2" fill={bright ? BRIGHT : `${TEAL}0.5)`} />;
}

/** Standing, feet a little apart, knees soft. */
function StandWide() {
  return (
    <>
      <Limb from={HIP_L} joint={[39, 72]} to={[36, 87]} end="foot" />
      <Limb from={HIP_R} joint={[61, 72]} to={[64, 87]} end="foot" />
    </>
  );
}

/** Standing, feet under the hips. */
function Stand() {
  return (
    <>
      <Limb from={HIP_L} joint={[42, 72]} to={[41, 87]} end="foot" />
      <Limb from={HIP_R} joint={[58, 72]} to={[59, 87]} end="foot" />
    </>
  );
}

export default function SomaticGuide({ technique }: { technique: string }) {
  switch (technique) {
    case "body-shaking":
      return (
        <Frame label="Standing loose, shaking the arms and hands out">
          <g className="sg-jitter">
            <Head />
            <Torso />
            <StandWide />
            {/* arms hang heavy and shake from the shoulder */}
            <g className="sg-shake-arm" style={{ transformOrigin: "39px 30px" }}>
              <Limb from={SH_L} joint={[33, 43]} to={[31, 57]} />
              <Hand cx={31} cy={57} />
            </g>
            <g
              className="sg-shake-arm"
              style={{ transformOrigin: "61px 30px", animationDelay: "0.13s" }}
            >
              <Limb from={SH_R} joint={[67, 43]} to={[69, 57]} />
              <Hand cx={69} cy={57} />
            </g>
          </g>
          {/* the blur a shaken hand leaves */}
          <g className="sg-jitter" stroke={`${CANDLE}0.35)`} strokeWidth="1.6" strokeLinecap="round">
            <path d="M21 52h4M19 59h4" />
            <path d="M75 52h4M77 59h4" />
          </g>
        </Frame>
      );

    case "air-punching":
      return (
        <Frame label="Boxing stance, punching forward one arm at a time">
          <Head />
          <Torso />
          {/* front foot forward, knees soft, the way you would actually stand */}
          <Limb from={HIP_L} joint={[38, 71]} to={[33, 86]} end="foot" />
          <Limb from={HIP_R} joint={[60, 73]} to={[63, 87]} end="foot" />
          {/* one arm out, one kept up at the chin */}
          <g className="sg-arm-a" style={{ transformOrigin: "39px 30px" }}>
            <Limb from={SH_L} joint={[30, 38]} to={[44, 32]} />
            <Hand cx={44} cy={32} />
          </g>
          <g className="sg-arm-b" style={{ transformOrigin: "61px 30px" }}>
            <Limb from={SH_R} joint={[70, 33]} to={[81, 36]} />
            <Hand cx={81} cy={36} />
          </g>
        </Frame>
      );

    case "dancing":
      return (
        <Frame label="Moving freely, arms up, weight shifting">
          <g className="sg-sway">
            <Head tilt={-4} />
            <Torso />
            <Limb from={SH_L} joint={[29, 23]} to={[25, 11]} />
            <Limb from={SH_R} joint={[71, 23]} to={[75, 11]} />
            <Hand cx={25} cy={11} />
            <Hand cx={75} cy={11} />
            {/* weight on one leg, the other knee lifted */}
            <Limb from={HIP_L} joint={[40, 72]} to={[38, 87]} end="foot" />
            <Limb from={HIP_R} joint={[64, 68]} to={[60, 80]} end="foot" />
          </g>
        </Frame>
      );

    case "havening":
      return (
        <Frame label="Arms crossed, each hand stroking down the opposite upper arm">
          <Head />
          <Torso />
          <Stand />
          {/* the arms being stroked, dim because they are the surface */}
          <Limb from={SH_L} joint={[34, 42]} to={[33, 56]} colour={DIM} />
          <Limb from={SH_R} joint={[66, 42]} to={[67, 56]} colour={DIM} />
          {/* and the forearms crossing the chest to reach them */}
          <Limb from={SH_L} joint={[41, 44]} to={[62, 37]} />
          <Limb from={SH_R} joint={[59, 44]} to={[38, 37]} />
          <g className="sg-stroke-r">
            <Hand cx={62} cy={37} />
          </g>
          <g className="sg-stroke-l" style={{ animationDelay: "1.4s" }}>
            <Hand cx={38} cy={37} />
          </g>
        </Frame>
      );

    case "eye-press":
      return (
        <Frame label="Palms resting over closed eyes, elbows out">
          <Head />
          <Torso />
          <Stand />
          <Limb from={SH_L} joint={[29, 25]} to={[43, 15]} />
          <Limb from={SH_R} joint={[71, 25]} to={[57, 15]} />
          <g className="sg-press" style={{ transformOrigin: "50px 15px" }}>
            <Hand cx={43} cy={15} />
            <Hand cx={57} cy={15} />
          </g>
        </Frame>
      );

    case "bearing-down":
      return (
        <Frame label="Feet apart, knees bent, pressing down through the middle">
          <g className="sg-brace">
            <Head />
            <Torso />
            {/* knees genuinely bent, which is what bracing looks like */}
            <Limb from={HIP_L} joint={[35, 70]} to={[38, 87]} end="foot" />
            <Limb from={HIP_R} joint={[65, 70]} to={[62, 87]} end="foot" />
            {/* hands braced on the thighs */}
            <Limb from={SH_L} joint={[33, 44]} to={[37, 62]} />
            <Limb from={SH_R} joint={[67, 44]} to={[63, 62]} />
            <Hand cx={37} cy={62} bright={false} />
            <Hand cx={63} cy={62} bright={false} />
          </g>
          <g className="sg-hold" style={{ transformOrigin: "50px 42px" }}>
            <path
              d="M50 30v18"
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
        <Frame label="Standing still, turning the head slowly to look around">
          <rect x="10" y="4" width="80" height="80" rx="8" stroke={`${TEAL}0.18)`} strokeWidth="1.4" />
          <path
            d="M28 15a26 26 0 0 1 44 0"
            stroke={`${CANDLE}0.28)`}
            strokeWidth="1.4"
            strokeDasharray="3 4"
            fill="none"
          />
          <Torso />
          <Stand />
          <Limb from={SH_L} joint={[35, 43]} to={[37, 58]} />
          <Limb from={SH_R} joint={[65, 43]} to={[63, 58]} />
          <Hand cx={37} cy={58} bright={false} />
          <Hand cx={63} cy={58} bright={false} />
          {/* only the head moves */}
          <g className="sg-head-turn">
            <Head />
            <circle cx="50" cy="15" r="2.4" fill={BRIGHT} />
          </g>
        </Frame>
      );

    case "pendulation":
      return (
        <Frame label="Standing still, attention moving between a tense place and an easy one">
          <Head />
          <Torso />
          <Stand />
          <Limb from={SH_L} joint={[34, 43]} to={[36, 58]} />
          <Limb from={SH_R} joint={[66, 43]} to={[64, 58]} />
          {/* somewhere tight, and somewhere that feels alright */}
          <circle cx="50" cy="33" r="7.5" stroke={`${CORAL}0.55)`} strokeWidth="1.8" />
          <circle cx="50" cy="55" r="7.5" stroke={`${TEAL}0.45)`} strokeWidth="1.8" />
          <path d="M50 41v6" stroke={`${TEAL}0.28)`} strokeWidth="1.4" strokeDasharray="2 3" />
          <g className="sg-pend">
            <circle cx="50" cy="44" r="3.2" fill={BRIGHT} />
          </g>
        </Frame>
      );

    case "return-to-safety":
      return (
        <Frame label="One hand flat on the chest, the other on the belly">
          <Head />
          <Torso />
          <Stand />
          <Limb from={SH_L} joint={[31, 38]} to={[46, 35]} />
          <Limb from={SH_R} joint={[69, 44]} to={[53, 50]} />
          <g className="sg-swell">
            <Hand cx={46} cy={35} />
            <circle cx="53" cy="50" r="3.2" fill={`${TEAL}0.7)`} />
          </g>
        </Frame>
      );

    case "vagus-nerve-massage":
      return (
        <Frame label="Head tilted, fingers making small circles at the side of the neck">
          <Head tilt={8} />
          <Torso />
          <Stand />
          <Limb from={SH_L} joint={[34, 43]} to={[36, 58]} />
          <Hand cx={36} cy={58} bright={false} />
          {/* the working arm comes up to the neck */}
          <Limb from={SH_R} joint={[72, 31]} to={[57, 21]} />
          <circle
            cx="56"
            cy="22"
            r="7"
            stroke={`${CANDLE}0.32)`}
            strokeWidth="1.4"
            strokeDasharray="3 4"
            fill="none"
          />
          <g className="sg-rub" style={{ transformOrigin: "56px 22px" }}>
            <Hand cx={63} cy={22} />
          </g>
        </Frame>
      );

    default:
      return null;
  }
}
