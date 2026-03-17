import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(215 20% 88%)',
        input: 'hsl(215 20% 88%)',
        ring: 'hsl(215 100% 45%)',
        background: 'hsl(210 20% 98%)',
        foreground: 'hsl(220 23% 12%)',
        primary: {
          DEFAULT: 'hsl(214 84% 42%)',
          foreground: 'hsl(210 40% 98%)'
        },
        secondary: {
          DEFAULT: 'hsl(215 34% 94%)',
          foreground: 'hsl(220 20% 22%)'
        },
        muted: {
          DEFAULT: 'hsl(215 32% 95%)',
          foreground: 'hsl(215 16% 40%)'
        },
        accent: {
          DEFAULT: 'hsl(213 31% 91%)',
          foreground: 'hsl(220 23% 12%)'
        },
        destructive: {
          DEFAULT: 'hsl(0 72% 47%)',
          foreground: 'hsl(210 40% 98%)'
        },
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(220 23% 12%)'
        }
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      boxShadow: {
        panel: '0 10px 28px rgba(15, 23, 42, 0.06)'
      }
    }
  },
  plugins: [],
};

export default config;
