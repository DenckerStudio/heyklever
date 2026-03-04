// tailwind.config.js
const {heroui} = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/@heroui/theme/dist/components/(select|slider|form|listbox|divider|popover|button|ripple|spinner|scroll-shadow).js"
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              fontWeight: '500',
              '&:hover': {
                color: 'hsl(var(--primary))',
              },
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            code: {
              backgroundColor: 'hsl(var(--muted))',
              padding: '0.25rem 0.4rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
          },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [
    require('@tailwindcss/typography'),
    heroui(),
  ],
};