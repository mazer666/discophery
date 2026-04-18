import { defineConfig } from 'vite';

export default defineConfig({
  base: '/discophery/', // Needed for GitHub pages
  build: {
    outDir: 'docs', // Output to docs/ for GH Pages
    emptyOutDir: true,
  },
});
