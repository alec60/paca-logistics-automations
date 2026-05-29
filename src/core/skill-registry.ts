import type { SkillManifest } from "./types";

const registered: Array<SkillManifest<unknown, unknown>> = [];

// Auto-discover via Vite's import.meta.glob. Each src/skills/<slug>/manifest.ts
// must default-export its SkillManifest.
const modules = import.meta.glob("../skills/*/manifest.ts", {
  eager: true,
});

for (const [path, mod] of Object.entries(modules)) {
  const m = (mod as { default?: SkillManifest<unknown, unknown> }).default;
  if (!m) {
    console.warn(`[skill-registry] ${path} has no default export — skipped`);
    continue;
  }
  registered.push(m);
}

export function registerSkill<P, R>(manifest: SkillManifest<P, R>) {
  if (!registered.find((m) => m.slug === manifest.slug)) {
    registered.push(manifest as unknown as SkillManifest<unknown, unknown>);
  }
}

export function listSkills(): ReadonlyArray<SkillManifest<unknown, unknown>> {
  return registered;
}

export function findSkill(slug: string) {
  return registered.find((m) => m.slug === slug);
}
