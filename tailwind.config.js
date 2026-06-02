/** -----------------------------------------------------------------
 *  Project R.E.D — Tailwind theme (canonical)
 *  Resilient · Encrypted · Decentralized
 *
 *  Single source of truth for the design tokens. Used by:
 *   • the Tailwind CLI build  (module.exports below)
 *   • the CDN preview build    (the same object is inlined as
 *                               `tailwind.config = {...}` in HTML)
 *
 *  Class names here match the Stitch export exactly, so markup
 *  copied from /stitch or /ui_kits drops straight into your Go
 *  templates with no renaming.
 * ----------------------------------------------------------------- */
module.exports = {
  darkMode: "class",
  // Point this at every place class names appear in red-engine:
  // Go templates, any class strings built in Go handlers, and this
  // design-system's UI kit.
  content: [
    "./internal/router/templates/**/*.html",
    "./internal/**/*.go",
    "./ui_kits/**/*.{html,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ----- Brand -----
        primary: "#740010",
        "primary-container": "#9b111e",
        "on-primary": "#ffffff",
        "on-primary-container": "#ffa8a3",
        "primary-fixed": "#ffdad7",
        "primary-fixed-dim": "#ffb3af",
        "on-primary-fixed": "#410005",
        "on-primary-fixed-variant": "#910618",
        "inverse-primary": "#ffb3af",
        "surface-tint": "#b4262d",

        secondary: "#006a6a",
        "secondary-container": "#90efef",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#006e6e",
        "secondary-fixed": "#93f2f2",
        "secondary-fixed-dim": "#76d6d5",
        "on-secondary-fixed": "#002020",
        "on-secondary-fixed-variant": "#004f4f",

        tertiary: "#353636",
        "tertiary-container": "#4c4d4d",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#bebebd",
        "tertiary-fixed": "#e3e2e1",
        "tertiary-fixed-dim": "#c7c6c5",
        "on-tertiary-fixed": "#1a1c1c",
        "on-tertiary-fixed-variant": "#464746",

        // ----- Surfaces / neutrals (warm paper) -----
        background: "#fbf9f8",
        "on-background": "#1b1c1c",
        surface: "#fbf9f8",
        "surface-dim": "#dbd9d9",
        "surface-bright": "#fbf9f8",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f3f3",
        "surface-container": "#efeded",
        "surface-container-high": "#eae8e7",
        "surface-container-highest": "#e4e2e2",
        "surface-variant": "#e4e2e2",
        "on-surface": "#1b1c1c",
        "on-surface-variant": "#5a403f",
        "inverse-surface": "#303030",
        "inverse-on-surface": "#f2f0f0",
        outline: "#8e706e",
        "outline-variant": "#e2bebc",

        // ----- Status (muted, academic) -----
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        success: "#1f6f3f",
        warning: "#facc15",
      },

      fontFamily: {
        // Two real families do all the work.
        serif: ['"EB Garamond"', "Georgia", "serif"],
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
        // Semantic aliases kept for parity with the Stitch export:
        "display-lg": ['"EB Garamond"', "serif"],
        "headline-lg": ['"EB Garamond"', "serif"],
        "headline-md": ['"EB Garamond"', "serif"],
        "body-lg": ['"Public Sans"', "sans-serif"],
        "body-md": ['"Public Sans"', "sans-serif"],
        "label-md": ['"Public Sans"', "sans-serif"],
        caption: ['"Public Sans"', "sans-serif"],
      },

      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "500" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "500" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "500" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.05em", fontWeight: "600" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },

      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px", // soft, structural — never pills
        md: "6px",
        lg: "8px",      // badges
        full: "9999px", // status dots + avatars only
      },

      spacing: {
        unit: "4px",
        gutter: "24px",
        "margin-mobile": "16px",
        "margin-desktop": "64px",
        "sidebar-width": "280px",
      },

      maxWidth: {
        content: "1200px",
        reading: "720px",
      },

      boxShadow: {
        // Floating elements only (modals / dropdowns). Cards use borders.
        float: "0 8px 20px rgba(27,28,28,0.08)",
        "glow-up": "0 0 8px rgba(0,106,106,0.4)",
        "glow-down": "0 0 8px rgba(186,26,26,0.4)",
      },

      backgroundImage: {
        "paper-grain": "url('https://www.transparenttextures.com/patterns/natural-paper.png')",
        "dot-grid": "radial-gradient(circle, rgba(116,0,16,0.12) 1px, transparent 1px)",
      },
      backgroundSize: {
        dots: "24px 24px",
      },

      transitionTimingFunction: {
        // Restrained, no bounce.
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [
    // Run `npm i -D @tailwindcss/forms` (or use the standalone CLI build,
    // which bundles forms + typography). Safe to leave required:
    // require("@tailwindcss/forms"),
  ],
};
