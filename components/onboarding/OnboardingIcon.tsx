import {
  CircleEllipsis,
  HeartPulse,
  Hotel,
  Scissors,
  Utensils,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OnboardingIconName } from "@/lib/shared/types/onboarding";

const icons: Record<OnboardingIconName, LucideIcon> = {
  clinic: HeartPulse,
  beautySalon: Scissors,
  hardwareStore: Wrench,
  hotel: Hotel,
  restaurant: Utensils,
  other: CircleEllipsis,
};

export function OnboardingIcon({ name, size = 28 }: { name: OnboardingIconName; size?: number }) {
  const Icon = icons[name];
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" focusable="false" />;
}

export function ProgyMark({ size = 38 }: { size?: number }) {
  return (
    <span className="onboardingMark" style={{ width: size, height: size }} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
