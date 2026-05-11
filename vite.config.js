import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages at https://<user>.github.io/LOSS-OF-SALE/, the base must be
// the repo name. Locally (npm run dev) Vite ignores this — paths are served
// from /.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost',
  },
  base: command === 'build' ? '/LOSS-OF-SALE/' : '/',
}));
