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
        // Orqen raw design tokens
        canvas:  "#0A0A0F",
        surface: "#12121A",
        panel:   "#1a1a2e",
        border:  "#2a2a40",
        muted:   "#3a3a55",
        // CSS-variable aliases (used by shadcn/ui components)
        background:  "var(--background)",
        foreground:  "var(--foreground)",
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        // Node type accents
        "node-llm":       "#7c3aed",
        "node-http":      "#2563eb",
        "node-condition": "#d97706",
        "node-approval":  "#0d9488",
        "node-slack":     "#16a34a",
        "node-email":     "#0284c7",
        "node-code":      "#ea580c",
        // Run statuses
        "status-running": "#06B6D4",
        "status-success": "#10B981",
        "status-failed":  "#EF4444",
        "status-paused":  "#F59E0B",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-ring": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.2s ease-in-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
