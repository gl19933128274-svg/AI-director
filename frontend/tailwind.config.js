/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        'surface-0': 'oklch(0.115 0.018 62)',
        'surface-1': 'oklch(0.148 0.018 60)',
        'surface-2': 'oklch(0.185 0.017 58)',
        'surface-3': 'oklch(0.225 0.016 56)',
        'text-primary': 'oklch(0.90 0.012 72)',
        'text-secondary': 'oklch(0.64 0.020 70)',
        'text-tertiary': 'oklch(0.44 0.018 68)',
        'text-inverse': 'oklch(0.14 0.02 60)',
        'accent': 'oklch(0.72 0.185 82)',
        'accent-hover': 'oklch(0.78 0.195 82)',
        'accent-active': 'oklch(0.65 0.175 82)',
        'accent-muted': 'oklch(0.52 0.12 80)',
        'vf-line': 'oklch(0.50 0.13 80)',
        'vf-line-dim': 'oklch(0.30 0.08 72)',
        'border-subtle': 'oklch(0.28 0.015 62)',
        'border-faint': 'oklch(0.22 0.012 60)',
        'success': 'oklch(0.62 0.16 155)',
        'warning': 'oklch(0.68 0.16 70)',
        'danger': 'oklch(0.55 0.19 22)',
      },
      fontFamily: {
        'display': ['Newsreader', 'Georgia', 'Times New Roman', 'serif'],
        'body': ['DM Sans', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['SF Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      spacing: {
        '1': 'clamp(0.25rem, 0.3vw, 0.375rem)',
        '2': 'clamp(0.5rem, 0.6vw, 0.75rem)',
        '3': 'clamp(0.75rem, 0.9vw, 1rem)',
        '4': 'clamp(1rem, 1.2vw, 1.5rem)',
        '5': 'clamp(1.5rem, 1.8vw, 2rem)',
        '6': 'clamp(2rem, 2.5vw, 3rem)',
        '8': 'clamp(3rem, 4vw, 4.5rem)',
        '10': 'clamp(4rem, 5.5vw, 6.5rem)',
      },
      fontSize: {
        'base': 'clamp(0.875rem, 0.95vw, 1rem)',
        'sm': 'clamp(0.75rem, 0.8vw, 0.875rem)',
        'xs': 'clamp(0.6875rem, 0.7vw, 0.75rem)',
        'lg': 'clamp(1.1rem, 1.4vw, 1.375rem)',
        'xl': 'clamp(1.5rem, 2.2vw, 2.25rem)',
        '2xl': 'clamp(2rem, 3.5vw, 3.5rem)',
      },
      lineHeight: {
        'tight': '1.15',
        'normal': '1.55',
      },
      transitionTimingFunction: {
        'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'ease-out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '100': '100ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
      boxShadow: {
        'sm': '0 1px 2px oklch(0 0 0 / 0.12)',
        'md': '0 4px 8px -2px oklch(0 0 0 / 0.18)',
        'lg': '0 12px 20px -6px oklch(0 0 0 / 0.25)',
        'glow': '0 0 24px oklch(0.72 0.18 82 / 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        'pop-in': 'popIn 0.1s cubic-bezier(0.25, 1, 0.5, 1)',
        'rec-pulse': 'recPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(12px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(-8px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          'from': { opacity: '0', transform: 'translateY(6px) scale(0.97)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        recPulse: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 6px oklch(0.55 0.19 22)' },
          '50%': { opacity: '0.35', boxShadow: '0 0 2px oklch(0.55 0.19 22)' },
        },
      },
    },
  },
  plugins: [],
}
