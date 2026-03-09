"use client";

export type Scenario = "home" | "public" | "work" | "night" | null;

interface ScenarioInstructions {
  orienting: { title: string; body: string; detail: string };
  coldWater: { title: string; body: string };
  bilateralTapping: { body: string };
  gentleMovement: { body: string; detail: string };
}

const defaults: ScenarioInstructions = {
  orienting: {
    title: "Let's look around",
    body: "What are 5 things you can see? Let your eyes wander naturally.",
    detail: "",
  },
  coldWater: {
    title: "Cold water",
    body: "Let's try some cold. Splash water on your face, or hold something cold against your skin. We'll wait here.",
  },
  bilateralTapping: {
    body: "Let's follow this rhythm together. Tap your knees, or cross your arms and tap your shoulders.",
  },
  gentleMovement: {
    body: "Let's start moving gently. Rock or sway side to side. Wiggle your fingers and toes. Press your feet into the floor.",
    detail: "Go at whatever pace feels right. There's no rush.",
  },
};

const scenarioOverrides: Record<string, Partial<ScenarioInstructions>> = {
  public: {
    orienting: {
      title: "Let's look around",
      body: "Let's look around casually, like you're looking for someone. Colors, shapes, exits.",
      detail: "This is just for you. No one needs to know.",
    },
    coldWater: {
      title: "Find something cold",
      body: "Hold a cold drink, touch a metal railing, or press your palms against a cool surface. Let the cold ground you.",
    },
    bilateralTapping: {
      body: "Let's tap your fingers against your thighs under a table or in your pockets. Alternate left and right.",
    },
    gentleMovement: {
      body: "Press your feet into the floor. Squeeze and release your fists. Roll your shoulders back slowly.",
      detail: "Small movements are enough.",
    },
  },
  work: {
    orienting: {
      title: "Let's scan your workspace",
      body: "Let's look around your workspace. What objects do you see? Notice their colors and textures.",
      detail: "Take your time with this.",
    },
    coldWater: {
      title: "Find something cold",
      body: "Let's get a glass of cold water. Hold it against your wrists or the back of your neck. Take a sip slowly.",
    },
    bilateralTapping: {
      body: "Let's tap softly on your desk, alternating hands. Or press your feet into the floor, side to side.",
    },
    gentleMovement: {
      body: "Let's stand up and stretch together. Roll your neck. Press your palms together, then release.",
      detail: "A short walk to the bathroom or kitchen works too.",
    },
  },
  night: {
    orienting: {
      title: "Feel what's around you",
      body: "Stay right where you are. Let's notice the texture of your sheets, the temperature of the air, the quiet sounds.",
      detail: "Feel where your body meets the bed. You're held.",
    },
    coldWater: {
      title: "Cool your face",
      body: "Press your cool hands against your cheeks and forehead. Or place a pillow against your face for gentle pressure.",
    },
    bilateralTapping: {
      body: "Lying down, let's gently tap your chest or thighs, alternating sides. Keep the rhythm slow and steady.",
    },
    gentleMovement: {
      body: "Let's stretch out under the covers. Arms and legs long. Curl your toes, then release.",
      detail: "Stay in bed. Let movement come to you gently.",
    },
  },
};

export function getInstructions(scenario: Scenario): ScenarioInstructions {
  if (!scenario || !scenarioOverrides[scenario]) return defaults;

  const overrides = scenarioOverrides[scenario];
  return {
    orienting: overrides.orienting || defaults.orienting,
    coldWater: overrides.coldWater || defaults.coldWater,
    bilateralTapping: overrides.bilateralTapping || defaults.bilateralTapping,
    gentleMovement: overrides.gentleMovement || defaults.gentleMovement,
  };
}
