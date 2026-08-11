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

/**
 * KaTeX 폰트에서 공백 한 칸의 전진폭. 직접 재서 얻은 값입니다(Main·Math 모두 0.25em).
 * 여백을 공백 한 칸으로 바꿀 때 모자라거나 남는 만큼을 이 값으로 계산합니다.
 */
const KATEX_SPACE_ADVANCE_EM = 0.25;

/**
 * 수식의 여백을 드래그로 잡히게 만듭니다.
 *
 * KaTeX는 항 사이 간격을 **글자가 없는 빈 `<span class="mspace">`의 `margin-right`**로
 * 냅니다. `::selection`은 글자의 전진폭만 칠하므로 그 자리는 선택해도 색이 안 들어가고,
 * 수식을 끌면 주황 블록이 잘게 끊겨 보입니다. 실제로 재 보면 한 수식에서 폭 270px 중
 * 59px(틈 14개)이 빈 자리였습니다.
 *
 * CSS로는 못 막습니다 — 직접 확인한 것들입니다.
 * - `display: inline-block`, `user-select: all` 둘 다 칠하는 방식을 바꾸지 못합니다.
 * - margin을 padding으로 옮겨도 **Chrome은 인라인 padding을 선택 색으로 칠하지 않습니다.**
 * - 폭 0 문자에 `letter-spacing`을 주면 틈은 사라지지만 그 여백이 레이아웃에서 빠집니다.
 *
 * 그래서 여백 자체를 **글자**로 바꿉니다. 공백 한 칸의 전진폭이 제 font-size의
 * 0.25배이므로, X em짜리 여백은 `letter-spacing: (X − 0.25)em`을 준 공백 한 칸과
 * 폭이 같습니다. X가 0.25보다 작으면 음수가 되는데 그대로 동작합니다.
 *
 * **font-size는 절대 건드리지 않습니다.** 한 번 `font-size: 4X em`인 공백으로
 * 폭을 맞춰 봤는데, 선택 상자의 높이는 그 조각의 폰트 지표를 따르므로 그 공백만
 * 위아래로 튀어 **선택 영역이 성벽처럼 울퉁불퉁해졌습니다**(높이 종류 2 → 4,
 * 윗변 편차 3px → 4.5px). `letter-spacing`은 폭만 늘리므로 높이가 그대로입니다.
 *
 * 줄바꿈 없는 공백(U+00A0)을 씁니다. 보통 공백은 HTML에서 접혀 폭이 사라집니다 —
 * 실제로 그렇게 해 보고 270px가 211px로 줄었습니다.
 *
 * 음수 여백(`-0.1667em`)은 건너뜁니다. 글자로는 흉내 낼 수 없습니다.
 *
 * 복사 결과도 좋아집니다: `2(x+4)+1=2x+9` → `2(x + 4) + 1 = 2x + 9`. **지금 이
 * 변환이 남아 있는 이유는 그쪽입니다.** 화면에 보이는 선택 영역은 여백을 메우는
 * 것만으로는 못 고칩니다 — 조각마다 폰트가 달라 상자 높이가 갈리기 때문이고,
 * 그건 src/lib/inlineSelection.ts가 띠를 직접 그려 해결합니다.
 */
function rehypeSelectableMathSpace() {
  const MARGIN_ONLY = /^margin-right:\s*([0-9.]+)em;?$/;

  return (tree: unknown) => {
    const walk = (node: Record<string, unknown>) => {
      const children = node.children as Array<Record<string, unknown>> | undefined;
      if (!children) return;

      for (const child of children) {
        if (child.type === 'element' && child.tagName === 'span') {
          const props = (child.properties ?? {}) as Record<string, unknown>;
          const classes = props.className;
          const isSpace = Array.isArray(classes) && classes.includes('mspace');
          const match = isSpace ? MARGIN_ONLY.exec(String(props.style ?? '').trim()) : null;
          const em = match ? Number(match[1]) : NaN;

          if (Number.isFinite(em) && em > 0) {
            props.style = `letter-spacing:${+(em - KATEX_SPACE_ADVANCE_EM).toFixed(4)}em`;
            child.properties = props;
            child.children = [{ type: 'text', value: ' ' }];
            continue;
          }
        }
        walk(child);
      }
    };

    walk(tree as Record<string, unknown>);
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
    .use(rehypeSelectableMathSpace)
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

/**
 * 캐시 키에 함께 넣는 렌더러 판. **파이프라인을 고치면 이 값을 올립니다.**
 *
 * 본문 해시만 키로 쓰면 원고가 안 바뀐 글은 옛 HTML이 그대로 나옵니다. 수식 여백을
 * 선택 가능하게 바꾸고도 화면이 그대로여서 한 번 헤맸습니다 — 캐시가 예전 결과를
 * 돌려주고 있었습니다.
 */
const RENDERER_VERSION = '2026-08-11-katex-space-2';

async function renderCached(body: string): Promise<RenderedMarkdown> {
  const key = createHash('sha256').update(RENDERER_VERSION).update(body).digest('hex').slice(0, 32);
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
