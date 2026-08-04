import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';
import readingTime from 'reading-time';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { createHighlighter, type Highlighter } from 'shiki';
import { toString as mdastToString } from 'mdast-util-to-string';
import type { Root } from 'mdast';

/** 글에서 실제로 쓰는 언어만 로드합니다. 전부 로드하면 빌드가 느려집니다. */
const LANGUAGES = [
  'python', 'bash', 'yaml', 'json', 'jsonc', 'sql', 'markdown', 'typescript',
  'javascript', 'tsx', 'jsx', 'html', 'css', 'dockerfile', 'nginx', 'prolog',
  'diff', 'toml', 'go', 'rust', 'java',
];

const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({ themes: Object.values(THEMES), langs: LANGUAGES });
  return highlighterPromise;
}

export interface MarkdownHeading {
  depth: number;
  text: string;
  id: string;
}

/**
 * mdast에서 목차용 heading을 뽑습니다. id는 rehype-slug와 같은 github-slugger를
 * 같은 순서로 돌려 만들기 때문에 본문 앵커와 정확히 일치합니다.
 */
function collectHeadings(tree: Root): MarkdownHeading[] {
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];

  for (const node of tree.children) {
    if (node.type !== 'heading' || node.depth > 3) continue;
    const text = mdastToString(node);
    if (!text) continue;
    headings.push({ depth: node.depth, text, id: slugger.slug(text) });
  }

  return headings;
}

function highlight(code: string, lang: string, highlighter: Highlighter) {
  const resolved = highlighter.getLoadedLanguages().includes(lang as never) ? lang : 'text';
  return highlighter.codeToHtml(code, {
    lang: resolved,
    themes: THEMES,
    // 색을 CSS 변수로 내보내고 테마 전환은 styles.css가 담당합니다.
    defaultColor: false,
  });
}

/** 코드 블록을 shiki 결과로 바꿉니다. remark 단계에서 처리해 rehype로 그대로 흘려보냅니다. */
function shikiPlugin(highlighter: Highlighter) {
  return () => (tree: Root) => {
    const visit = (node: { type: string; children?: unknown[] }) => {
      const children = node.children as Array<Record<string, unknown>> | undefined;
      if (!children) return;
      children.forEach((child, index) => {
        if (child.type === 'code') {
          const lang = typeof child.lang === 'string' && child.lang ? child.lang : 'text';
          children[index] = {
            type: 'html',
            value: highlight(String(child.value ?? ''), lang, highlighter),
          };
          return;
        }
        visit(child as { type: string; children?: unknown[] });
      });
    };
    visit(tree as unknown as { type: string; children?: unknown[] });
  };
}

export interface RenderedMarkdown {
  html: string;
  headings: MarkdownHeading[];
  readingMinutes: number;
}

export async function renderMarkdown(body: string): Promise<RenderedMarkdown> {
  const highlighter = await getHighlighter();
  let headings: MarkdownHeading[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // 홑 $는 수식으로 보지 않습니다. 본문에 $HF_HOME, ${report} 같은 셸 변수와
    // 가격 표기가 흔해서, 켜 두면 그것들이 수식으로 렌더됩니다.
    .use(remarkMath, { singleDollarTextMath: false })
    .use(() => (tree: Root) => {
      headings = collectHeadings(tree);
    })
    .use(shikiPlugin(highlighter))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(body);

  return {
    html: String(file),
    headings,
    readingMinutes: Math.max(1, Math.round(readingTime(body).minutes)),
  };
}

/**
 * 305편을 매 빌드마다 다시 하이라이트하면 느립니다.
 * 본문 해시를 키로 디스크에 캐시합니다.
 */
const CACHE_DIR = 'node_modules/.cache/paldyn-markdown';

async function renderCached(body: string): Promise<RenderedMarkdown> {
  const key = createHash('sha256').update(body).digest('hex').slice(0, 32);
  const file = path.join(CACHE_DIR, `${key}.json`);

  try {
    return JSON.parse(await readFile(file, 'utf8')) as RenderedMarkdown;
  } catch {
    // 캐시 미스는 정상 경로입니다.
  }

  const rendered = await renderMarkdown(body);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(rendered), 'utf8');
  return rendered;
}

/**
 * .md 파일을 { frontmatter, html, headings, readingMinutes }를 내보내는 모듈로 바꿉니다.
 * 본문은 이 모듈에만 있고 목록 페이지는 virtual:article-index를 쓰므로,
 * 클라이언트 번들이 305편의 본문을 통째로 안고 가지 않습니다.
 */
export function markdownPlugin(): Plugin {
  return {
    name: 'paldyn:markdown',
    enforce: 'pre',

    async transform(code, id) {
      if (!id.endsWith('.md')) return null;

      const { data, content } = matter(code);
      const { html, headings, readingMinutes } = await renderCached(content);

      return {
        code: [
          `export const frontmatter = ${JSON.stringify(data)};`,
          `export const html = ${JSON.stringify(html)};`,
          `export const headings = ${JSON.stringify(headings)};`,
          `export const readingMinutes = ${readingMinutes};`,
          'export default { frontmatter, html, headings, readingMinutes };',
        ].join('\n'),
        map: null,
      };
    },
  };
}
