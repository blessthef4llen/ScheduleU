import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'schu-teal': '#4fd1c5', // The bright teal from your buttons
        'schu-blue': '#1e4e8c', // The deep blue from your logo
      },
    },
  },
  plugins: [],
};
export default config;