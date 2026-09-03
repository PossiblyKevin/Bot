import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/toobit-api': {
        target: 'https://api.toobit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/toobit-api/, '')
      }
    }
  }
});