import base from '@devflow/config/prettier.js';

/** @type {import("prettier").Config} */
export default {
  ...base,
  plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  importOrder: [
    '^react$',
    '^react-dom',
    '^next(/.*)?$',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@devflow/(.*)$',
    '',
    '^@/(.*)$',
    '',
    '^[./]',
  ],
  tailwindStylesheet: './app/globals.css', // change to your real path from Step 1
};
