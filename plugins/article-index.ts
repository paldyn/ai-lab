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
  /** 그 카테고리에서 몇 번째로 쓴 글인가. 1부터. orderArticles가 매깁니다. */
  seq: number;
}

/** 순서를 매기기 전 단계. `prev`는 여기서만 쓰고 가상 모듈에는 안 싣습니다. */
type RawEntry = Omit<ArticleIndexEntry, 'seq'> & { prev?: string };

/**
 * 본문이 가리키는 **선행 글**의 슬러그.
 *
 * 글은 서로 「지난 글」 링크로 이어져 있습니다. 실제로 330편 중 318편이 앞 글을
 * 가리키고, 끊긴 링크도 후속이 둘인 글도 없어 **선형 사슬 열둘이 전부를 덮습니다.**
 * 이 사슬이 지은이가 의도한 차례라, 같은 날 열 편이 한꺼번에 나간 자리에서
 * 순서를 정해 주는 유일한 근거입니다(간선의 89%가 같은 날짜입니다).
 *
 * 두 꼴을 받습니다 — 본문 안의 `[지난 글](/articles/…)`과 맨 아래
 * `**지난 글:** [제목](/articles/…)`. 랩 노트 두 편이 「앞 글」이라 적어
 * 그것도 함께 받습니다. 링크 문구를 못으로 박아 두는 이유는, 느슨하게 잡으면
 * 「지난 글에서 다룬 [무언가](/articles/딴것)」 같은 문장이 가짜 간선을 만들기
 * 때문입니다. 여러 번 나오면 **맨 처음 것**을 씁니다 — 지금 일곱 편이 두 번
 * 넘게 적고 있고 서로 다른 글을 가리키는 경우는 없습니다.
 */
const PREV_LINK =
  /\[(?:지난|앞) 글\]\(\/articles\/([a-z0-9-]+)\)|(?:지난|앞) 글:\*\*\s*\[[^\]]*\]\(\/articles\/([a-z0-9-]+)\)/;

function prevOf(content: string): string | undefined {
  const found = content.match(PREV_LINK);
  return found ? (found[1] ?? found[2]) : undefined;
}

/**
 * 목록 순서를 정하고 카테고리 안 번호를 매깁니다.
 *
 * **정렬은 최신순이되 같은 날은 사슬을 거꾸로 탑니다.** 예전에는 동률을 제목
 * 가나다로 깼는데, 대량 이관 탓에 하루에 열 편씩 몰려 있어 화면 순서의 대부분을
 * 사실상 그 가나다가 정하고 있었습니다. 뜻이 없을 뿐 아니라 카드에 번호를 붙이는
 * 순간 옆 카드끼리 번호가 뒤엉킵니다.
 *
 * **번호는 오래된 쪽이 1번입니다.** 새 글은 사슬 끝에 붙으므로 기존 번호를
 * 밀지 않습니다. 다만 글을 지우거나 카테고리를 옮기면 그 뒤가 당겨집니다 —
 * 주소·본문·테스트 어디도 이 번호를 참조하지 않으므로 깨지는 곳은 없습니다.
 */
export function orderArticles(entries: RawEntry[]): ArticleIndexEntry[] {
  const bySlug = new Set(entries.map((entry) => entry.slug));

  // 선행 → 후속. 갈래가 생기면 먼저 만난 쪽만 잇습니다.
  const next = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.prev || !bySlug.has(entry.prev) || next.has(entry.prev)) continue;
    next.set(entry.prev, entry.slug);
  }

  /*
    사슬 머리는 '선행이 없는 글'이 아니라 **'누구의 후속도 아닌 글'** 입니다.
    초안이거나 지워진 글을 가리키면 그 간선이 아예 안 생기므로, 후속 글이 저절로
    새 머리가 됩니다. 실제로 2026-08-04에 앞 글을 지우면서 두 편이 그렇게 됐습니다.
  */
  const isSuccessor = new Set(next.values());
  const heads = entries
    .filter((entry) => !isSuccessor.has(entry.slug))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.slug.localeCompare(b.slug));

  const chain = new Map<string, number>();
  let position = 0;
  for (const head of heads) {
    let slug: string | undefined = head.slug;
    // 이미 자리를 받은 글에서 멈춥니다 — 순환이 생겨도 여기서 끝납니다.
    while (slug && !chain.has(slug)) {
      chain.set(slug, position);
      position += 1;
      slug = next.get(slug);
    }
  }
  // 순환에 갇혀 어느 머리에서도 못 닿은 글.
  for (const entry of entries) {
    if (chain.has(entry.slug)) continue;
    chain.set(entry.slug, position);
    position += 1;
  }

  const sorted = [...entries].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) ||
      (chain.get(b.slug) ?? 0) - (chain.get(a.slug) ?? 0) ||
      b.slug.localeCompare(a.slug),
  );

  // 오래된 쪽부터 세어 카테고리마다 1..N을 붙입니다.
  const counted = new Map<string, number>();
  const seq = new Map<string, number>();
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const entry = sorted[i];
    const number = (counted.get(entry.categoryId) ?? 0) + 1;
    counted.set(entry.categoryId, number);
    seq.set(entry.slug, number);
  }

  return sorted.map(({ prev: _prev, ...entry }) => ({ ...entry, seq: seq.get(entry.slug) ?? 1 }));
}

async function readEntry(file: string, root: string): Promise<RawEntry | null> {
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
    ...(prevOf(content) ? { prev: prevOf(content) } : {}),
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
      (entry): entry is RawEntry => entry !== null,
    );

    return `export const articleIndex = ${JSON.stringify(orderArticles(entries))};\n`;
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
