import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.cjs',
    },
    rollupOptions: {
      external: ['electron', 'electron-store', 'path', 'fs', 'child_process', 'os', 'url', 'net'],
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: false,
  },
});
