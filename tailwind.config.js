/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:        '#1A0810',
          surface:   '#220D15',
          card:      '#2A1018',
          border:    '#3D1E28',
          maroon:    '#6B0F1A',
          wine:      '#8B1A2C',
          gold:      '#C9933A',
          goldL:     '#E8B86D',
          champagne: '#F0D9A8',
          pink:      '#E8718A',
          pinkL:     '#F4A0B0',
          muted:     '#9C7A82',
          text:      '#F5EDE8',
          violet:    '#8B1A2C',
          violetL:   '#C9933A',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Syne', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow':  'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,15,26,0.35) 0%, transparent 70%)',
        'card-glow':  'linear-gradient(135deg, rgba(107,15,26,0.15) 0%, rgba(201,147,58,0.06) 100%)',
        'gold-glow':  'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(201,147,58,0.12) 0%, transparent 70%)',
      },
      animation: {
        'float':      'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer':    'shimmer 2.5s linear infinite',
        'slide-up':   'slideUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':    'fadeIn 0.5s ease-out forwards',
        'spin-slow':  'spin 8s linear infinite',
        'counter':    'counterUp 2s ease-out forwards',
      },
      keyframes: {
        float:     { '0%,100%': { transform: 'translateY(0px)' },   '50%': { transform: 'translateY(-12px)' } },
        pulseGlow: { '0%,100%': { opacity: '0.4' },                 '50%': { opacity: '0.9' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' },       '100%': { backgroundPosition: '200% 0' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(30px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:    { from: { opacity: '0' },                        to:   { opacity: '1' } },
        counterUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        'glow-v':     '0 0 30px rgba(107,15,26,0.45),  0 0 60px rgba(107,15,26,0.2)',
        'glow-gold':  '0 0 30px rgba(201,147,58,0.4),  0 0 60px rgba(201,147,58,0.15)',
        'glow-pink':  '0 0 30px rgba(232,113,138,0.35),0 0 60px rgba(232,113,138,0.15)',
        'glow-g':     '0 0 30px rgba(201,147,58,0.4),  0 0 60px rgba(201,147,58,0.15)',
        'card':       '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,147,58,0.06)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6), 0 0 20px rgba(201,147,58,0.15), inset 0 1px 0 rgba(201,147,58,0.1)',
      },
    },
  },
  plugins: [],
}