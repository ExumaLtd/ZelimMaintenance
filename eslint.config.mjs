import coreWebVitals from 'eslint-config-next/core-web-vitals';

// Flat config for ESLint 9, using the Next.js core-web-vitals preset (the
// default Next.js rule set). eslint-config-next 16 ships a flat config, so it
// is spread directly rather than wrapped with FlatCompat.
const eslintConfig = [
  // Global ignores. Backup scripts are plain Node jobs run in CI, not part of
  // the Next.js app.
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'public/**',
      'scripts/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  {
    // eslint-config-next 16 bundles react-hooks v6, which promotes several
    // React Compiler oriented checks to errors. On the large existing
    // maintenance form components these flag long-standing ref and effect
    // patterns whose fixes would be risky refactors of a safety-critical tool.
    // Surface them as warnings so they are visible and can be adopted
    // incrementally, without blocking the lint run or forcing a refactor now.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
];

export default eslintConfig;
