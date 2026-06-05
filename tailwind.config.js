const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    '../layouts/**/*.html',
    '../assets/**/*.js',
  ],
  theme: {
    container: {
      center: true,
      screens: {
        sm: '40rem',
        md: '48rem',
        lg: '64rem',
        xl: '80rem',
        '2xl': '102.5rem',
      },
    },
    fontFamily: {
      sans: [ '"Noto Sans KR"', ...fontFamily.sans],
    },
  }
};
