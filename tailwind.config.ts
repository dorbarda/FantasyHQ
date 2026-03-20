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
        border: "var(--border)",
        foreground: "var(--foreground)",
        secondary: "var(--foreground-secondary)",
        muted: "var(--foreground-muted)",
        accent: "var(--accent)",
        "accent-light": "var(--accent-light)",
        "nav-bg": "var(--nav-bg)",
      },
    },
  },
  plugins: [],
};
export default config;
