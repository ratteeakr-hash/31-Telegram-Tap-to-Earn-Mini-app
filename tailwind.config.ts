import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#121826",
        mint: "#18c29c",
        amber: "#f4b740",
        cloud: "#f7fafc"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
