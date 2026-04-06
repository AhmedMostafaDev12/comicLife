import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream:  '#E8E4D8',
        ink:    '#0E0E0E',
        'off-white': '#F5F2E8',
        yellow: '#D4E84A',
        muted:  '#6B6860',
      },
      fontFamily: {
        barlow:  ['"Barlow Condensed"', 'sans-serif'],
        dm:      ['"DM Sans"', 'sans-serif'],
        mono:    ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
export default config
