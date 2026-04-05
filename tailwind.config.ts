import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ポーカーテーブルのテーマカラー
        felt: {
          DEFAULT: '#1a6b3c',
          dark: '#0f4d2a',
          light: '#2a8f52',
        },
        card: {
          red: '#dc2626',
          black: '#1a1a2e',
        },
        gold: '#f5a623',
      },
      animation: {
        'deal': 'deal 0.4s ease-out',
        'flip': 'flip 0.5s ease-in-out',
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        deal: {
          '0%': { transform: 'translate(-50%, -200%) scale(0.5)', opacity: '0' },
          '100%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(245, 166, 35, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
