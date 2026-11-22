export type ExperienceMode = "studio" | "funky";

export function resolveExperienceMode(value: string | null | undefined): ExperienceMode {
  return value === "funky" ? "funky" : "studio";
}
