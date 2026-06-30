import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

// `pnpm build:single` sets SINGLE_FILE=1 → inline the whole app into one index.html.
const SINGLE_FILE = process.env.SINGLE_FILE === '1';

// Inject the package.json version as a compile-time constant (see src/lib/version.ts).
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 51277,
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(SINGLE_FILE ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Relative asset URLs so the build works from file:// (single-file) and any subpath host.
  base: './',
  build: {
    outDir: SINGLE_FILE ? 'dist-single' : 'dist',
    // viteSingleFile already flips these; restating makes intent explicit and override-proof.
    ...(SINGLE_FILE
      ? {
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
              manualChunks: undefined,
            },
          },
        }
      : {}),
  },
});
