import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const apiPort = Number.parseInt(process.env.STORYVERSE_API_PORT ?? '4310', 10);
  const webPort = Number.parseInt(process.env.STORYVERSE_WEB_PORT ?? '4311', 10);

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: webPort,
      strictPort: true,
      proxy: {
        '/api': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          target: `http://localhost:${apiPort}`,
        },
      },
    },
  };
});
