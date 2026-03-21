import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-secondary": "var(--surface-secondary)",
        "surface-header": "var(--surface-secondary)",
        border: "var(--border)",
        foreground: "var(--foreground)",
        secondary: "var(--foreground-secondary)",
        muted: "var(--foreground-muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-light": "var(--accent-light)",
        "sidebar-bg": "var(--sidebar-bg)",
        "sidebar-active": "var(--sidebar-active)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-text": "var(--sidebar-text)",
        "sidebar-text-active": "var(--sidebar-text-active)",
      },
    },
  },
  plugins: [],
};
export default config;
