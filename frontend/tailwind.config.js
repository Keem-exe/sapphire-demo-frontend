/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",

        card: "oklch(var(--card) / <alpha-value>)",
        "card-foreground": "oklch(var(--card-foreground) / <alpha-value>)",

        popover: "oklch(var(--popover) / <alpha-value>)",
        "popover-foreground": "oklch(var(--popover-foreground) / <alpha-value>)",

        primary: "oklch(var(--primary) / <alpha-value>)",
        "primary-foreground": "oklch(var(--primary-foreground) / <alpha-value>)",

        secondary: "oklch(var(--secondary) / <alpha-value>)",
        "secondary-foreground": "oklch(var(--secondary-foreground) / <alpha-value>)",

        muted: "oklch(var(--muted) / <alpha-value>)",
        "muted-foreground": "oklch(var(--muted-foreground) / <alpha-value>)",

        accent: "oklch(var(--accent) / <alpha-value>)",
        "accent-foreground": "oklch(var(--accent-foreground) / <alpha-value>)",

        destructive: "oklch(var(--destructive) / <alpha-value>)",
        "destructive-foreground":
          "oklch(var(--destructive-foreground) / <alpha-value>)",

        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 0.25rem)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 0.125rem)",
        sm: "calc(var(--radius) - 0.25rem)",
      },
      boxShadow: {
        soft: "0 25px 60px rgba(0,0,0,0.18)",
      },
    },
  },
  plugins: [],
};
