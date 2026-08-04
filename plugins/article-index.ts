import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:article-index';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const CONTENT_DIR = 'src/content/articles';

export interface ArticleIndexEntry {
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: number;
  level: string;
  featured: boolean;
  /** 카드 시각 요소에 쓸 짧은 식/문구. 없으면 태그로 대체합니다. */
  visual?: string;
  /** 커리큘럼 카테고리에서의 순서. 작을수록 앞. */
  order?: number;
}

async function readEntry(file: string, root: string): Promise<ArticleIndexEntry | null> {
  const raw = await readFile(file, 'utf8');
  const { data, content } = matter(raw);

  if (data.draft === true) return null;

  const slug = path.basename(file, '.md');
  const missing = ['title', 'description', 'category', 'pubDate'].filter((key) => !data[key]);
  if (missing.length > 0) {
    throw new Error(`${path.relative(root, file)}: frontmatter에 ${missing.join(', ')}이(가) 없습니다.`);
  }

  return {
    slug,
    title: String(data.title),
    summary: String(data.description),
    categoryId: String(data.category),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    author: String(data.author ?? 'PALDYN Research'),
    publishedAt: String(data.pubDate).slice(0, 10),
    readTime: Math.max(1, Math.round(readingTime(content).minutes)),
    level: String(data.level ?? '중급'),
    featured: data.featured === true,
    ...(data.visual ? { visual: String(data.visual) } : {}),
    ...(Number.isFinite(Number(data.order)) ? { order: Number(data.order) } : {}),
  };
}

/**
 * 글 목록을 담은 가상 모듈. 본문(html)은 들어가지 않습니다.
 * 목록 페이지가 본문까지 끌어오면 클라이언트 번들에 전체 글이 실립니다.
 */
export function articleIndexPlugin(): Plugin {
  let root = process.cwd();

  const load = async () => {
    const dir = path.join(root, CONTENT_DIR);
    const files = await fg('*.md', { cwd: dir, absolute: true });
    const entries = (await Promise.all(files.map((file) => readEntry(file, root)))).filter(
      (entry): entry is ArticleIndexEntry => entry !== null,
    );

    // 최신순, 같은 날짜면 제목순으로 안정 정렬합니다.
    entries.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title, 'ko'));

    return `export const articleIndex = ${JSON.stringify(entries)};\n`;
  };

  return {
    name: 'paldyn:article-index',

    configResolved(config) {
      root = config.root;
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },

    load(id) {
      return id === RESOLVED_ID ? load() : null;
    },

    configureServer(server) {
      const dir = path.join(root, CONTENT_DIR);
      const invalidate = (file: string) => {
        if (!file.startsWith(dir) || !file.endsWith('.md')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (!mod) return;
        server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
      server.watcher.on('change', invalidate);
    },
  };
}
