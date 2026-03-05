import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      port: 5174,
      proxy: {
        '^/api/admin(?:/|$)': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});

