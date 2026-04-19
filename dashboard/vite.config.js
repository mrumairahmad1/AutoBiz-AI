import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace this with your actual ngrok host if it changes
const NGROK_HOST = 'litigate-dad-drippy.ngrok-free.dev';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,              // Allow external access
    strictPort: false,       // Let Vite use the port even if it's in use
    allowedHosts: ['localhost', NGROK_HOST],  // Whitelist your ngrok URL
    port: 5173,              // Default Vite port (change if needed)
  }
});