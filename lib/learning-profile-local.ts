import {
  createDefaultLearningProfile,
  learningProfileStorageKey,
  parseLearningProfile,
  type LearningProfile,
} from "./learning-profile";

export function loadLocalLearningProfile(userId?: string | null): LearningProfile {
  if (typeof window === "undefined") return createDefaultLearningProfile();
  const raw = window.localStorage.getItem(learningProfileStorageKey(userId));
  if (!raw) return createDefaultLearningProfile();
  try {
    return parseLearningProfile(JSON.parse(raw)) ?? createDefaultLearningProfile();
  } catch {
    return createDefaultLearningProfile();
  }
}

export function saveLocalLearningProfile(profile: LearningProfile, userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(learningProfileStorageKey(userId), JSON.stringify(profile));
}

export function clearLocalLearningProfile(userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(learningProfileStorageKey(userId));
}
