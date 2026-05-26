import type { SkillManifest } from "./types";

// Phase 2 will populate this via import.meta.glob across src/skills/*/manifest.ts.
// Phase 1 ships an empty registry so the app boots without a real skill.
const manifests: Array<SkillManifest<unknown, unknown>> = [];

export function registerSkill<P, R>(manifest: SkillManifest<P, R>) {
  manifests.push(manifest as unknown as SkillManifest<unknown, unknown>);
}

export function listSkills(): ReadonlyArray<SkillManifest<unknown, unknown>> {
  return manifests;
}

export function findSkill(slug: string) {
  return manifests.find((m) => m.slug === slug);
}
