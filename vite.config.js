import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' porque o Electron abre o build via file://
export default defineConfig({
  plugins: [react()],
  base: './',
  // 127.0.0.1 fixo: com "localhost" o Node escuta só em ::1 e o wait-on nunca libera o Electron
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
