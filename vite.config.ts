import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function normalizeBase(value?: string) {
  if (!value || value === '/') return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig({
  base: normalizeBase(process.env.VITE_BASE_PATH),
  plugins: [react()],
  build: {
    outDir: 'dist',
    // 공개 배포에 소스맵을 함께 올리지 않습니다. 필요하면 VITE_SOURCEMAP=1로 켭니다.
    sourcemap: process.env.VITE_SOURCEMAP === '1',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
