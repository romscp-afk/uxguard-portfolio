import type { UserProfile } from "../types";

const KEY = "uxguard_platform_registry";

type RegistryUser = Omit<UserProfile, "case_studies" | "case_study_count" | "social_links"> & {
  email?: string;
  role?: string;
  portfolio_url?: string;
  social_links?: Record<string, string>;
};

function loadRegistry(): Record<string, RegistryUser> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUserToRegistry(user: RegistryUser) {
  const registry = loadRegistry();
  registry[user.username] = user;
  localStorage.setItem(KEY, JSON.stringify(registry));
}

export function getUserFromRegistry(username: string): UserProfile | null {
  const user = loadRegistry()[username];
  if (!user) return null;
  return { ...user, social_links: user.social_links ?? {}, case_studies: [], case_study_count: 0 };
}
