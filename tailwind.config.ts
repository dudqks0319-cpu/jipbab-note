// 집밥노트 디자인 토큰 - 따뜻한 파스텔 톤
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 따뜻한 파스텔 팔레트
        mint: {
          50: '#f0fdf9',
          100: '#d5f5ec',
          200: '#a7ead6',
          300: '#6dd5b8',
          400: '#3dbf98',
          500: '#22a57d',
        },
        peach: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
        },
        cream: {
          50: '#fefdf8',
          100: '#fef9e7',
          200: '#fdf2c5',
          300: '#fce588',
        },
        lavender: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
        },
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0,0,0,0.06)',
        'card': '0 4px 20px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
