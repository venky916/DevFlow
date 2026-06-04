// apps/web/postcss.config.js  (or postcss.config.mjs)
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: process.cwd() + "/../..", // points to monorepo root
    },
  },
};

export default config;
