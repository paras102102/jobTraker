/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#0f766e', // Deep ink teal (light mode)
          hover: '#115e59',
          subtle: '#f0fdfa',
          fg: '#ffffff',
          dark: '#14b8a6',   // Vibrant ink teal for dark mode
          darkHover: '#2dd4bf',
          darkSubtle: '#042f2e',
        },
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '6px',
      },
    },
  },
  plugins: [],
};
