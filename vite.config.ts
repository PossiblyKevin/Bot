import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    // Note: Toobit public REST API can be called directly or via a proxy if CORS blocks browser testing.
    // For direct browser execution, ensure your environment handles CORS or use a lightweight CORS proxy if needed.
  }
});