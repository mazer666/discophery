import { defineConfig } from 'vite';

export default defineConfig({
  base: '/discophery/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      }
    }
  },
  plugins: [
    {
      name: 'strip-crossorigin-from-css',
      transformIndexHtml(html) {
        // GitHub Pages CORS: crossorigin auf <link stylesheet> blockiert das CSS
        return html.replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
      }
    }
  ]
});
