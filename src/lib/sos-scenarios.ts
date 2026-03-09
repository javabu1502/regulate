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
    title: "Slowly look around",
    body: "Name 5 things you can see. Let your eyes move naturally, like an animal checking that it's safe.",
    detail: "",
  },
  coldWater: {
    title: "Dive reflex",
    body: "If you can, splash cold water on your face or hold something cold. This activates your dive reflex and slows your heart rate.",
  },
  bilateralTapping: {
    body: "Follow the rhythm. Tap your knees or cross your arms and tap your shoulders.",
  },
  gentleMovement: {
    body: "Try gentle rocking or swaying side to side. Wiggle your fingers and toes. Push your feet firmly into the floor.",
    detail: "You're waking your body up slowly. There's no rush.",
  },
};

const scenarioOverrides: Record<string, Partial<ScenarioInstructions>> = {
  public: {
    orienting: {
      title: "Look around casually",
      body: "Pretend you're looking for someone. Slowly scan the room. Notice colors, shapes, exits.",
      detail: "No one can tell what you're doing. You look completely normal.",
    },
    coldWater: {
      title: "Find something cold",
      body: "Hold a cold drink, touch a metal railing, or press your palms against a cool surface. The temperature shift activates your vagus nerve.",
    },
    bilateralTapping: {
      body: "Tap your fingers against your thighs under a table or in your pockets. Alternate left and right.",
    },
    gentleMovement: {
      body: "Press your feet into the floor. Squeeze and release your fists under a table. Roll your shoulders back slowly.",
      detail: "Small movements work. No one needs to notice.",
    },
  },
  work: {
    orienting: {
      title: "Scan your workspace",
      body: "Name 5 objects at your desk or in the room. Notice their colors and textures.",
      detail: "This looks like you're just thinking. Take your time.",
    },
    coldWater: {
      title: "Find something cold",
      body: "Get a glass of cold water. Hold it against your wrists or the back of your neck. Take a sip slowly.",
    },
    bilateralTapping: {
      body: "Tap your fingers on your desk softly, alternating hands. Or press your feet into the floor, alternating left and right.",
    },
    gentleMovement: {
      body: "Stand up and stretch. Roll your neck. Press your palms together firmly, then release.",
      detail: "A short walk to the bathroom or kitchen works too.",
    },
  },
  night: {
    orienting: {
      title: "Feel what's around you",
      body: "Without turning on the light, feel the texture of your sheets. Notice the temperature of the air. Listen to the quiet sounds.",
      detail: "You're safe in your bed. Nothing is happening right now.",
    },
    coldWater: {
      title: "Cool your face",
      body: "Press your cool hands against your cheeks and forehead. Or place a pillow against your face for gentle pressure.",
    },
    bilateralTapping: {
      body: "Lying down, gently tap your chest or thighs, alternating sides. Keep the rhythm slow and steady.",
    },
    gentleMovement: {
      body: "Stretch your arms and legs out long under the covers. Curl your toes, then release. Make small circles with your ankles.",
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
