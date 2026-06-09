import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        panel: "hsl(var(--panel))",
        panel2: "hsl(var(--panel-2))",
        border: "hsl(var(--border))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          fg: "hsl(var(--accent-fg))"
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))"
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--border) / 0.65), 0 14px 50px rgba(2, 10, 28, 0.18)"
      },
      backgroundImage: {
        "app-grid":
          "radial-gradient(circle at 1px 1px, hsl(var(--border) / 0.28) 1px, transparent 0)",
        "hero-soft":
          "linear-gradient(145deg, hsl(var(--accent) / 0.16), hsl(var(--info) / 0.08) 45%, transparent 80%)"
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        pulseSoft: "pulseSoft 3.2s ease-in-out infinite"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
