import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:cert-prep-index';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const CERT_PREP_DIR = 'src/content/certs';

/**
 * 자격증 시험 노트 하나.
 *
 * **글(`src/content/articles`)과 다른 곳에 삽니다.** 학습 글은 여덟 분야 중 하나에
 * 속하고 슬러그 접두사가 그 분야를 정하는데, 시험 노트는 「어느 시험을 위한 것인가」로
 * 묶입니다. 같은 서랍에 넣으면 분야 표를 열넷만큼 늘려야 하고 434편짜리 학습 목록에
 * 시험 노트가 섞여 듭니다. 폴더 이름이 곧 자격증 id입니다.
 */
export interface CertPrepEntry {
  /** 폴더 이름. `certs.ts`의 id와 같아야 합니다. */
  certId: string;
  /** 파일 이름에서 확장자만 뗀 것. 주소에 그대로 씁니다. */
  slug: string;
  title: string;
  summary: string;
  /** 개념 정리인가 문제인가. 목록에서 갈라 보여 줍니다. */
  kind: string;
  /** 파일 이름 앞의 두 자리 숫자. 목록의 차례를 정합니다. */
  order: number;
  readTime: number;
  updatedAt: string;
}

/**
 * 파일 이름은 `NN-슬러그.md`입니다. 앞 숫자가 차례이고 나머지가 주소가 됩니다.
 *
 * 차례를 frontmatter에 두지 않는 이유는, 폴더를 열었을 때 순서가 보여야 하기
 * 때문입니다. 모의고사는 90번대를 써서 개념 글 뒤에 모입니다.
 */
const FILE_NAME = /^(\d{2})-([a-z0-9-]+)\.md$/;

async function readEntry(file: string, root: string): Promise<CertPrepEntry | null> {
  const relative = path.relative(path.join(root, CERT_PREP_DIR), file);
  const [certId, name] = relative.split(path.sep);
  if (!certId || !name) return null;

  const matched = FILE_NAME.exec(name);
  if (!matched) {
    throw new Error(`${relative}: 시험 노트 파일 이름은 NN-슬러그.md 꼴이어야 합니다`);
  }

  const raw = await readFile(file, 'utf8');
  const { data, content } = matter(raw);

  for (const field of ['title', 'description', 'kind', 'pubDate'] as const) {
    if (!data[field]) throw new Error(`${relative}: frontmatter에 ${field}가 없습니다`);
  }

  if (data.draft === true) return null;

  return {
    certId,
    slug: `${matched[1]}-${matched[2]}`,
    title: String(data.title),
    summary: String(data.description),
    kind: String(data.kind),
    order: Number(matched[1]),
    readTime: Math.max(1, Math.round(readingTime(content).minutes)),
    updatedAt: String(data.pubDate),
  };
}

export function certPrepIndexPlugin(): Plugin {
  let root = process.cwd();

  const load = async () => {
    const dir = path.join(root, CERT_PREP_DIR);
    const files = await fg('*/*.md', { cwd: dir, absolute: true });
    const entries = (await Promise.all(files.map((file) => readEntry(file, root)))).filter(
      (entry): entry is CertPrepEntry => entry !== null,
    );

    // 자격증 안에서는 파일 번호 순, 자격증끼리는 id 순으로 고정합니다.
    entries.sort((a, b) => a.certId.localeCompare(b.certId) || a.order - b.order);

    return `export const certPrepIndex = ${JSON.stringify(entries)};\n`;
  };

  return {
    name: 'paldyn:cert-prep-index',

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
      const dir = path.join(root, CERT_PREP_DIR);
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
