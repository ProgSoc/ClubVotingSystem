import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@server/': path.join(__dirname, '../server/src/'),

      'pages/': path.join(__dirname, 'src/pages/'),
      'components/': path.join(__dirname, 'src/components/'),
      'routes/': path.join(__dirname, 'src/routes/'),
      'utils/': path.join(__dirname, 'src/utils/'),
    },
  },
});
