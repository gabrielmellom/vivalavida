import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores extraídas do logo Viva la Vida
        viva: {
          orange: '#F7941D',
          'orange-dark': '#E8850F',
          yellow: '#FFD700',
          blue: '#2196F3',
          'blue-dark': '#1565C0',
          'blue-navy': '#0D47A1',
          green: '#4CAF50',
          'green-light': '#8BC34A',
          teal: '#00BCD4',
        }
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Open Sans', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-viva': 'linear-gradient(135deg, #F7941D 0%, #FFD700 25%, #4CAF50 50%, #2196F3 75%, #1565C0 100%)',
        'gradient-ocean': 'linear-gradient(180deg, #00BCD4 0%, #2196F3 50%, #1565C0 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #F7941D 0%, #FFD700 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'wave': 'wave 3s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in-left': 'fadeInLeft 0.8s ease-out forwards',
        'fade-in-right': 'fadeInRight 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        wave: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

