import base from '@devflow/config/prettier.js';

/** @type {import("prettier").Config} */
export default {
  ...base,
  plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: '../../apps/web/app/globals.css',
};
