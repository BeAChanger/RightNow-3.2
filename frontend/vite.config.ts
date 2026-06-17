import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000';
    const apiRoutePattern =
      '^/api/(auth|users|weight|diet|training|training-sessions|todos|checkins|evolution|evolution-stage|posts|comments|friendships|groups|chat|upload|image-gen|fitness-plan|ai-coach|prompts)(?:/|$)';
    return {
      server: {
        port: 5173,
        strictPort: true,
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
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.VITE_DEEPSEEK_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

