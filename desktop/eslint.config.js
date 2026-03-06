import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Main process (Node)
  {
    files: ['src/main/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },

  // Preload (isolated sandbox)
  {
    files: ['src/preload/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.preload.json',
      },
    },
  },

  // Renderer (React)
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.renderer.json',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Ignore build outputs
  {
    ignores: ['dist/', 'dist-renderer/', 'release/', 'node_modules/'],
  },
);
