/**
 * PROJECT ATLAS — Vite & Local Offline Build Configuration
 * Enforces 100% relative paths (`./`) and local asset bundling with zero external CDNs.
 */
export default {
  base: './',
  publicDir: 'public',
  server: {
    host: '127.0.0.1',
    port: 8080,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2020'
  }
};
