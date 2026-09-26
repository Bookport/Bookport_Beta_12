import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // В браузере Prisma не работает и не нужна, а её браузерный стенд
        // подключается спецификатором `.prisma/client/index-browser`, который
        // браузер не умеет разрешить — поэтому в собранном бандле он ронял
        // весь модуль. Сервера это не касается: server.ts собирается esbuild.
        '@prisma/client': path.resolve(__dirname, 'src/prismaBrowserStub.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: true as const,
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  };
});
