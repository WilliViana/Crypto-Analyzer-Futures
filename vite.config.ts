
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Fix: Import cwd explicitly to resolve 'Property cwd does not exist on type Process' error in TypeScript
import { cwd } from 'node:process';

export default defineConfig(({ mode }) => {
  // Use root directory via cwd() for environment variable loading
  const root = cwd();
  const env = loadEnv(mode, root, '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'), // Map '@' to 'src' directory
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
