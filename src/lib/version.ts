// App version, injected at build time from package.json via the `define` option
// in vite.config.ts and vitest.config.ts. Compile-time so the single-file build
// inlines a literal (no runtime fetch / import of package.json).
declare const __APP_VERSION__: string;

export const APP_VERSION = __APP_VERSION__;
