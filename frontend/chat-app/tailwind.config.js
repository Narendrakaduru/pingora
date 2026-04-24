/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          container: "rgb(var(--bubble-sent-bg) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          sidebar: "rgb(var(--surface-low) / <alpha-value>)",
          low: "rgb(var(--surface-low) / <alpha-value>)",
          lowest: "rgb(var(--surface-lowest) / <alpha-value>)",
          high: "rgb(var(--surface-high) / <alpha-value>)",
        },
        text: {
          main: "rgb(var(--text-main) / <alpha-value>)",
          soft: "rgb(var(--text-soft) / <alpha-value>)",
          light: "rgb(var(--text-light) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        on: {
          primary: "rgb(var(--surface-lowest) / <alpha-value>)",
          surface: "rgb(var(--text-main) / <alpha-value>)",
          'surface-variant': "rgb(var(--text-soft) / <alpha-value>)",
        }
      },
      borderRadius: {
        '2xl': '24px',
        'xl': '20px',
        'lg': '16px',
      },
      boxShadow: {
        'soft': '0 12px 32px -4px rgba(0, 0, 0, 0.1)',
        'premium': '0 20px 48px -12px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
