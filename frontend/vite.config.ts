import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000';
    const apiRoutePattern =
      '^/api/(auth|users|weight|diet|training|todos|checkins|evolution|posts|comments|friendships|chat|upload|image-gen|fitness-plan|ai-coach)(?:/|$)';
    return {
      server: {
        port: 5173,
        host: 'localhost',
        proxy: {
          [apiRoutePattern]: {
            target: apiTarget,
            changeOrigin: true,
          },
          '/uploads': {
            target: apiTarget,
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

