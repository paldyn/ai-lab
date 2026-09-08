import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:mirror-index';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const MIRROR_DIR = 'src/content/mirror';

/**
 * 다른 사이트에서 옮겨 온 글 하나.
 *
 * **우리가 쓴 글이 아닙니다.** `scripts/sync-techblog.mjs`가 techblog의 마크다운을
 * 그대로 옮겨 둔 것이고, 원본이 바뀌면 다시 옮깁니다. 그래서 학습 글(`src/content/articles`)과
 * 다른 서랍에 둡니다 — 사슬도 카테고리도 없고, 접두사 표에도 안 걸립니다.
 */
export interface MirrorEntry {
  /** 주소에 쓰는 슬러그. 원본 슬러그에서 `python-` 접두사를 뗀 것입니다. */
  slug: string;
  /** 원본 저장소의 슬러그. 다시 옮길 때 짝을 맞추는 값입니다. */
  sourceSlug: string;
  title: string;
  summary: string;
  /** 원문 주소. `rel=canonical`과 글 머리의 출처 줄이 함께 씁니다. */
  sourceUrl: string;
  publishedAt: string;
  syncedAt: string;
  readTime: number;
}

async function readEntry(file: string, root: string): Promise<MirrorEntry | null> {
  const name = path.relative(path.join(root, MIRROR_DIR), file);
  const raw = await readFile(file, 'utf8');
  const { data, content } = matter(raw);

  for (const field of ['title', 'description', 'sourceSlug', 'sourceUrl', 'pubDate'] as const) {
    if (!data[field]) throw new Error(`${name}: frontmatter에 ${field}가 없습니다`);
  }

  return {
    slug: String(data.sourceSlug).replace(/^python-/, ''),
    sourceSlug: String(data.sourceSlug),
    title: String(data.title),
    summary: String(data.description),
    sourceUrl: String(data.sourceUrl),
    publishedAt: String(data.pubDate),
    syncedAt: String(data.syncedAt ?? data.pubDate),
    readTime: Math.max(1, Math.round(readingTime(content).minutes)),
  };
}

export function mirrorIndexPlugin(): Plugin {
  let root = process.cwd();

  const load = async () => {
    const dir = path.join(root, MIRROR_DIR);
    const files = await fg('*.md', { cwd: dir, absolute: true });
    const entries = (await Promise.all(files.map((file) => readEntry(file, root)))).filter(
      (entry): entry is MirrorEntry => entry !== null,
    );

    entries.sort((a, b) => a.slug.localeCompare(b.slug));

    return `export const mirrorIndex = ${JSON.stringify(entries)};\n`;
  };

  return {
    name: 'paldyn:mirror-index',

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
      const dir = path.join(root, MIRROR_DIR);
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
