/// <reference types="vitest/config" />
import { UserConfig } from 'vite';
import { defineConfig, mergeConfig } from 'vite';

import { viteElectronAppPlugin } from './infrastructure/viteElectronAppPlugin';
import { version } from './package.json';
import { external, getBuildConfig } from './vite.base';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const config: UserConfig = {
    build: {
      outDir: '.vite/build',
      lib: {
        entry: './src/main.ts',
        fileName: (_format, name) => `${name}.cjs`,
        formats: ['cjs'],
      },
      rollupOptions: { external },
      sourcemap: true,
      minify: false,
    },
    server: {
      watch: {
        ignored: ['**/assets/ComfyUI/**', 'venv/**'],
      },
    },
    plugins: [
      // Custom hot reload solution for vite 6
      viteElectronAppPlugin(),
    ],
    define: {
      VITE_NAME: JSON.stringify('COMFY'),
      'process.env.PUBLISH': `"${process.env.PUBLISH}"`,
    },
    resolve: {
      // Load the Node.js entry.
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
    test: {
      name: 'main',
      include: ['tests/unit/**/*.test.ts'],
      setupFiles: ['./tests/unit/setup.ts'],
      restoreMocks: true,
      unstubGlobals: true,
    },
  };

  return mergeConfig(getBuildConfig(env), config);
});
