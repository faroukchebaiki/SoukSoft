import { USER_DEFAULT_SECTION_PREFS_KEY } from "@/constants/storageKeys";
import type { Section } from "@/types";

/**
 * Map of user id to their preferred landing section.
 */
export type DefaultSectionPrefs = Partial<Record<string, Section>>;

/**
 * Safely read stored default section preferences from localStorage.
 */
export function readDefaultSectionPrefs(): DefaultSectionPrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_DEFAULT_SECTION_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DefaultSectionPrefs;
    return parsed ?? {};
  } catch {
    return {};
  }
}

/**
 * Determine which section should be active given preferences and permissions.
 */
export function resolvePreferredSection(options: {
  userId: string | null;
  allowedSections: Section[];
  preferredByUser: DefaultSectionPrefs;
  currentSection: Section;
  fallbackSection: Section;
}): Section {
  const preferredForUser = options.userId ? options.preferredByUser[options.userId] : undefined;
  if (preferredForUser && options.allowedSections.includes(preferredForUser)) {
    return preferredForUser;
  }
  if (options.allowedSections.includes(options.currentSection)) {
    return options.currentSection;
  }
  return options.allowedSections[0] ?? options.fallbackSection;
}
