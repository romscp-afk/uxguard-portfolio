import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Draft = {
  interestIds: string[];
  experienceLevel: string;
  setInterestIds: (ids: string[]) => void;
  setExperienceLevel: (value: string) => void;
};

const OnboardingContext = createContext<Draft | null>(null);

export function useOnboardingDraft() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('Onboarding draft missing');
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const value = useMemo(
    () => ({ interestIds, experienceLevel, setInterestIds, setExperienceLevel }),
    [interestIds, experienceLevel],
  );
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
