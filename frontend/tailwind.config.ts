import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Orqen design system
        canvas:  "#0d0d14",
        surface: "#13131f",
        panel:   "#1a1a2e",
        border:  "#2a2a40",
        muted:   "#3a3a55",
        // Node type accents
        "node-llm":       "#7c3aed",
        "node-http":      "#2563eb",
        "node-condition": "#d97706",
        "node-approval":  "#0d9488",
        "node-slack":     "#16a34a",
        "node-email":     "#0284c7",
        "node-code":      "#ea580c",
        // Run statuses
        "status-running": "#3b82f6",
        "status-success": "#16a34a",
        "status-failed":  "#dc2626",
        "status-paused":  "#f59e0b",
      },
      animation: {
        "pulse-ring": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.2s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
