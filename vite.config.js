import { defineConfig } from 'vite';
import { DETAILS } from './src/details.js';
import { buildIcs } from './src/calendar.js';

/**
 * Serves / writes `wedding.ics` (the Apple/Outlook calendar file) from
 * src/details.js, so the calendar entry always matches the site.
 * In dev, restart `npm run dev` after changing details.js to refresh it.
 */
function weddingIcs() {
  const name = DETAILS.calendar.fileName;
  return {
    name: 'wedding-ics',
    configureServer(server) {
      server.middlewares.use(`/${name}`, (req, res) => {
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.end(buildIcs(DETAILS));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: name, source: buildIcs(DETAILS) });
    },
  };
}

export default defineConfig({
  // Relative base so the built site works from any sub-path, e.g.
  // https://<you>.github.io/<repo>/ as well as a custom domain root.
  base: './',
  plugins: [weddingIcs()],
  build: {
    // three.js makes the single bundle ~630 kB (~170 kB gzipped). That's
    // expected for a 3D page, so don't warn about it.
    chunkSizeWarningLimit: 800,
  },
});
