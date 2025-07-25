import type { Config } from 'tailwindcss';
import accessibilityPlugin from './src/styles/tailwind-accessibility-plugin.js';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Our plugin adds these, but we can extend further if needed
    },
  },
  plugins: [
    accessibilityPlugin,
  ],
};

export default config;