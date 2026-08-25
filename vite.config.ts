import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { articleIndexPlugin } from './plugins/article-index';
import { certPrepIndexPlugin } from './plugins/cert-prep-index';
import { resolveBuildId } from './plugins/build-id';
import { markdownPlugin } from './plugins/markdown';

function normalizeBase(value?: string) {
  if (!value || value === '/') return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig({
  base: normalizeBase(process.env.VITE_BASE_PATH),
  plugins: [markdownPlugin(), articleIndexPlugin(), certPrepIndexPlugin(), react()],
  // client 빌드와 --ssr 빌드 양쪽에 함께 걸리므로, 두 번 도는 빌드가 같은 값을 갖습니다.
  define: { __BUILD_ID__: JSON.stringify(resolveBuildId()) },
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
