import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';

// Flat config replaces .eslintrc.json: next 16 dropped `next lint`, and
// eslint-config-next 16 requires eslint 9, which no longer reads eslintrc.
export default [
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  prettier,
  {
    rules: {
      '@next/next/no-img-element': 'off',

      // react-hooks v6 arrived with eslint-config-next 16 and flags 34 spots in
      // code that predates it. They are worth fixing, but not inside a security
      // upgrade - kept as warnings so they stay visible without failing lint.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
];
