import type { Config } from "tailwindcss";

/**
 * Every colour resolves to a CSS variable defined in app/globals.css, so
 * `bg-surface` / `text-muted` / `border-border` automatically follow the
 * active theme. Components should never hardcode hex values.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-secondary": "var(--surface-secondary)",
        "surface-header": "var(--surface-secondary)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",

        // Text
        foreground: "var(--foreground)",
        "foreground-strong": "var(--foreground-strong)",
        secondary: "var(--foreground-secondary)",
        tertiary: "var(--foreground-tertiary)",
        muted: "var(--foreground-muted)",

        // Always-dark panel surface
        panel: "var(--panel)",
        "panel-secondary": "var(--panel-secondary)",
        "panel-border": "var(--panel-border)",
        "panel-text": "var(--panel-text)",
        "panel-text-muted": "var(--panel-text-muted)",
        "panel-text-strong": "var(--panel-text-strong)",

        // Legacy sidebar aliases (same values as panel-*)
        "sidebar-bg": "var(--panel)",
        "sidebar-active": "var(--panel-secondary)",
        "sidebar-border": "var(--panel-border)",
        "sidebar-text": "var(--panel-text)",
        "sidebar-text-active": "var(--panel-text-strong)",

        // Accent
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-light": "var(--accent-light)",
        "accent-text": "var(--accent-text)",

        // Semantic status
        positive: "var(--positive)",
        "positive-strong": "var(--positive-strong)",
        "positive-bright": "var(--positive-bright)",
        "positive-surface": "var(--positive-surface)",
        "positive-text": "var(--positive-text)",
        negative: "var(--negative)",
        "negative-bright": "var(--negative-bright)",
        "negative-surface": "var(--negative-surface)",
        "negative-text": "var(--negative-text)",
        warning: "var(--warning)",
        "warning-bright": "var(--warning-bright)",
        "warning-surface": "var(--warning-surface)",
        "warning-text": "var(--warning-text)",
        info: "var(--info)",
        "info-bright": "var(--info-bright)",
        "info-surface": "var(--info-surface)",

        // Medals
        gold: "var(--gold)",
        "gold-surface": "var(--gold-surface)",
        silver: "var(--silver)",
        bronze: "var(--bronze)",
        "bronze-surface": "var(--bronze-surface)",
        "gold-text": "var(--gold-text)",
        "silver-text": "var(--silver-text)",
        "bronze-text": "var(--bronze-text)",
      },
    },
  },
  plugins: [],
};
export default config;
