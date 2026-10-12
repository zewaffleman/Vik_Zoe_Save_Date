import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any sub-path, e.g.
  // https://<you>.github.io/<repo>/ as well as a custom domain root.
  base: './',
  build: {
    // three.js makes the single bundle ~630 kB (~170 kB gzipped). That's
    // expected for a 3D page, so don't warn about it.
    chunkSizeWarningLimit: 800,
  },
});
