// Tailwind v4 uses CSS-first config in src/index.css via @theme.
// This file is intentionally minimal — kept for IDE awareness and future plugin hooks.
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
};

export default config;
