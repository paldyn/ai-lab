import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:playbook-index';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

export const PLAYBOOK_DIR = 'src/content/playbook';

/**
 * 활용 가이드 노트 하나.
 *
 * **글(`src/content/articles`)과 다른 서랍입니다.** 학습 글은 원리를 담고 반년 뒤에도
 * 사실이어야 하는데, 여기 담는 것은 「지금 그 제품의 상태」입니다 — 요금제, 사용 한도,
 * 티어 이름, 어느 모델이 무엇에 맞는가. 같은 서랍에 넣으면 썩는 글과 안 썩는 글이
 * 한 목록에 섞이고, 사슬·접두사 표·6,000자 하한이 전부 걸립니다.
 * 폴더 이름이 곧 도구 id입니다(`chatgpt`·`claude`·`gemini`·`claude-code`·`codex`·`shared`).
 *
 * 시험 노트(`cert-prep-index.ts`)와 구조가 같습니다 — 두 층 폴더에 `NN-슬러그.md`입니다.
 */
export interface PlaybookEntry {
  /** 폴더 이름. `playbookTools.ts`의 id와 같아야 합니다. */
  toolId: string;
  /** 파일 이름에서 확장자만 뗀 것. 주소에 그대로 씁니다. */
  slug: string;
  title: string;
  summary: string;
  /** 설정·기법·한도·비교·대질 중 하나. 목록에서 갈라 보여 줍니다. */
  kind: string;
  /** 파일 이름 앞의 두 자리 숫자. 목록의 차례를 정합니다. */
  order: number;
  /**
   * 이 노트가 기대는 주장 id들. 본문이 `:claim[...]`으로 부르는 값입니다.
   *
   * 여기 적어 두면 주장 하나가 만료됐을 때 **어느 노트가 흔들리는지** 역으로 찾을 수
   * 있습니다. 값은 데이터에만 있고 원고에는 없으므로 이 연결이 유일한 실입니다.
   */
  claims: string[];
  readTime: number;
  updatedAt: string;
}

/**
 * 파일 이름은 `NN-슬러그.md`입니다. 앞 숫자가 차례이고 나머지가 주소가 됩니다.
 *
 * `01`~`79`는 계획 주제, `80`~`89`는 총정리(진도에 안 셉니다), `90`부터는 대질 —
 * 통설·공식·실측이 어긋나는 자리를 한 표에 놓는 글입니다.
 */
const FILE_NAME = /^(\d{2})-([a-z0-9-]+)\.md$/;

async function readEntry(file: string, root: string): Promise<PlaybookEntry | null> {
  const relative = path.relative(path.join(root, PLAYBOOK_DIR), file);
  const [toolId, name] = relative.split(path.sep);
  if (!toolId || !name) return null;

  const matched = FILE_NAME.exec(name);
  if (!matched) {
    throw new Error(`${relative}: 활용 노트 파일 이름은 NN-슬러그.md 꼴이어야 합니다`);
  }

  const raw = await readFile(file, 'utf8');
  const { data, content } = matter(raw);

  for (const field of ['title', 'description', 'kind', 'pubDate'] as const) {
    if (!data[field]) throw new Error(`${relative}: frontmatter에 ${field}가 없습니다`);
  }

  if (data.draft === true) return null;

  return {
    toolId,
    slug: `${matched[1]}-${matched[2]}`,
    title: String(data.title),
    summary: String(data.description),
    kind: String(data.kind),
    order: Number(matched[1]),
    claims: Array.isArray(data.claims) ? data.claims.map(String) : [],
    readTime: Math.max(1, Math.round(readingTime(content).minutes)),
    updatedAt: String(data.pubDate),
  };
}

export function playbookIndexPlugin(): Plugin {
  let root = process.cwd();

  const load = async () => {
    const dir = path.join(root, PLAYBOOK_DIR);
    const files = await fg('*/*.md', { cwd: dir, absolute: true });
    const entries = (await Promise.all(files.map((file) => readEntry(file, root)))).filter(
      (entry): entry is PlaybookEntry => entry !== null,
    );

    // 도구 안에서는 파일 번호 순, 도구끼리는 id 순으로 고정합니다.
    entries.sort((a, b) => a.toolId.localeCompare(b.toolId) || a.order - b.order);

    return `export const playbookIndex = ${JSON.stringify(entries)};\n`;
  };

  return {
    name: 'paldyn:playbook-index',

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
      const dir = path.join(root, PLAYBOOK_DIR);
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
