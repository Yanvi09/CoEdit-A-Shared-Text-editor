/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-white': '#FFFFFF',
        'bg-surface': '#F8F9FA',
        'bg-surface-hover': '#F1F3F4',
        'border-subtle': '#DADCE0',
        'primary-blue': '#4285F4',
        'primary-blue-hover': '#3367D6',
        'success-green': '#34A853',
        'warning-amber': '#FBBC04',
        'error-red': '#EA4335',
        'text-primary': '#202124',
        'text-muted': '#5F6368',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
