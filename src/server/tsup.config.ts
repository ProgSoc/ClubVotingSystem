import { defineConfig } from 'tsup';

export default defineConfig(({ watch }) => ({
  entry: ['src/server.ts', 'src/db/migrations'],
  splitting: true,
  sourcemap: true,
  clean: true,
  format: ['cjs'],
  platform: 'node',
  onSuccess: watch ? 'node --enable-source-maps dist/server' : undefined,
  loader: {
    '.sql': 'copy',
    '.json': 'copy',
  },
}));