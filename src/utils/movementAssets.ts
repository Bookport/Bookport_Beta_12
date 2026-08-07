import walkFemale from "../assets/images/movement/female/walk.webp";
import gymnasticsFemale from "../assets/images/movement/female/gymnastics.webp";
import stretchingFemale from "../assets/images/movement/female/stretching.webp";
import yogaFemale from "../assets/images/movement/female/yoga.webp";
import cardioFemale from "../assets/images/movement/female/cardio.webp";
import strengthFemale from "../assets/images/movement/female/strength.webp";
import cyclingFemale from "../assets/images/movement/female/cycling.webp";
import dancingFemale from "../assets/images/movement/female/dancing.webp";
import mobilityFemale from "../assets/images/movement/female/mobility.webp";

import walkMale from "../assets/images/movement/male/walk.webp";
import gymnasticsMale from "../assets/images/movement/male/gymnastics.webp";
import stretchingMale from "../assets/images/movement/male/stretching.webp";
import yogaMale from "../assets/images/movement/male/yoga.webp";
import cardioMale from "../assets/images/movement/male/cardio.webp";
import strengthMale from "../assets/images/movement/male/strength.webp";
import cyclingMale from "../assets/images/movement/male/cycling.webp";
import dancingMale from "../assets/images/movement/male/dancing.webp";
import mobilityMale from "../assets/images/movement/male/mobility.webp";
import activitCustom from "../assets/images/movement/activit.webp";

import markerTimer from "../assets/images/movement/markers/timer.webp";
import markerStreak from "../assets/images/movement/markers/streak.webp";
import markerAward from "../assets/images/movement/markers/award.webp";

import { ACTIVITY_CONFIGS } from "../constants/movement";

const IMAGES = {
  female: {
    walk: walkFemale,
    gymnastics: gymnasticsFemale,
    stretching: stretchingFemale,
    yoga: yogaFemale,
    cardio: cardioFemale,
    strength: strengthFemale,
    cycling: cyclingFemale,
    dancing: dancingFemale,
    mobility: mobilityFemale,
    custom: activitCustom
  },
  male: {
    walk: walkMale,
    gymnastics: gymnasticsMale,
    stretching: stretchingMale,
    yoga: yogaMale,
    cardio: cardioMale,
    strength: strengthMale,
    cycling: cyclingMale,
    dancing: dancingMale,
    mobility: mobilityMale,
    custom: activitCustom
  }
} as const;

export function getMovementAssetPath(activityKey: string, userGender: "female" | "male"): string {
  let key = activityKey;
  const entry = Object.entries(ACTIVITY_CONFIGS).find(([k, v]) => v.name === activityKey || k === activityKey);
  if (entry) key = entry[0];
  
  const normalizedKey = key.toLowerCase() as keyof typeof IMAGES.female;
  const genderMap = IMAGES[userGender] || IMAGES.female;
  return genderMap[normalizedKey] || genderMap.walk;
}

export function getMovementMarkerPath(): string {
  return markerTimer;
}

export function getMovementAwardPath(): string {
  return markerAward;
}

export function getMovementStreakPath(): string {
  return markerStreak;
}
