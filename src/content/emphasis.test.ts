import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../plugins/markdown';

/**
 * 강조가 열렸는데 안 닫혀 `**`가 화면에 그대로 남는 것을 잡습니다.
 *
 * CommonMark에서 닫는 `**`는 **right-flanking**이어야 합니다 — 바로 앞이 문장부호이면
 * 바로 뒤가 공백이나 문장부호여야 합니다. 한국어는 조사가 곧바로 붙으므로 이 조건이
 * 자주 깨집니다.
 *
 * ```
 * **오염(contamination)**이라고   →  앞이 `)`, 뒤가 `이`  →  안 닫힘
 * **"양변에 … 그대로"**라는        →  앞이 `"`, 뒤가 `라`  →  안 닫힘
 * **0.39%**다                     →  앞이 `%`, 뒤가 `다`  →  안 닫힘
 * ```
 *
 * 고치는 법은 하나입니다 — **문장부호를 강조 밖으로 뺍니다.**
 * `**오염**(contamination)이라고`, `"**양변에 … 그대로**"라는`, `**0.39**%다`.
 *
 * 눈으로는 못 잡습니다. 2026-08-11에 이 검사를 붙이고 나서야 여덟 자리를 찾았고,
 * 그중 넷은 반년 가까이 그대로 나가 있었습니다.
 */
const ARTICLES = path.join(process.cwd(), 'src/content/articles');

/** 코드와 수식 원본은 뺍니다 — 파이썬의 `**kwargs`나 glob 패턴은 강조가 아닙니다. */
function prose(html: string): string {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/g, '')
    .replace(/<code[\s\S]*?<\/code>/g, '')
    .replace(/<annotation[\s\S]*?<\/annotation>/g, '');
}

const files = readdirSync(ARTICLES).filter((name) => name.endsWith('.md'));

describe('강조 표기', () => {
  it('글이 있다 — 목록을 못 읽으면 이 검사가 조용히 통과한다', () => {
    expect(files.length).toBeGreaterThan(300);
  });

  it.each(files)('%s — 닫히지 않은 강조가 없다', async (name) => {
    const { content } = matter(readFileSync(path.join(ARTICLES, name), 'utf8'));
    const { html } = await renderMarkdown(content);
    const left = prose(html).match(/.{0,40}\*\*.{0,40}/s);

    expect(left?.[0], `${name}: 강조가 안 닫혔습니다`).toBeUndefined();
  });
});

/**
 * 홑 `$`로 적은 수식을 잡습니다.
 *
 * 이 저장소는 `$$...$$`만 수식으로 렌더합니다(`plugins/markdown.ts`가
 * `singleDollarTextMath: false`로 넘깁니다). 그래서 `$r_w$`라고 적으면 수식이 아니라
 * **달러 기호와 글자가 화면에 그대로** 나옵니다. 2026-09-09에 26편에서 174곳을 찾았고,
 * 「강조가 안 닫혔다」와 달리 화면에 `**` 같은 표시가 안 남아 눈으로 지나치기 쉽습니다.
 *
 * **돈 표기는 잡지 않습니다.** `$3 / 1M 토큰`처럼 값싼 이야기를 하다 보면 한 줄에 `$`가
 * 둘 생겨 짝처럼 보입니다. 그래서 **안이 수식으로 보일 때만** 잡습니다 — 역슬래시 명령,
 * 아래첨자·위첨자, 홀로 선 알파벳·그리스 문자, `이름 = 숫자` 꼴입니다. 이 조건으로
 * 205곳을 훑었을 때 돈 표기가 하나도 안 걸렸습니다.
 */
const SINGLE_DOLLAR = /(?<!\$)\$(?!\$)([^$\n]{1,80})\$(?!\$)/g;

function looksLikeMath(inner: string): boolean {
  if (/[가-힣`|]/.test(inner)) return false;
  if (/^[A-Za-zͰ-Ͽ]{1,2}$/.test(inner)) return true;
  if (/[\\_^]/.test(inner)) return true;
  if (/^[A-Za-z][A-Za-z0-9]*\s*=\s*-?[\d.]+$/.test(inner)) return true;
  if (/^[A-Za-z]\([^)]*\)$/.test(inner)) return true;
  return false;
}

/** 코드 펜스와 제대로 적은 `$$...$$`는 뺍니다. */
function outsideMath(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/\$\$[\s\S]*?\$\$/g, '');
}

describe('수식 표기', () => {
  it.each(files)('%s — 홑 $로 적은 수식이 없다', (name) => {
    const { content } = matter(readFileSync(path.join(ARTICLES, name), 'utf8'));
    const found = [...outsideMath(content).matchAll(SINGLE_DOLLAR)]
      .map((m) => m[1])
      .filter(looksLikeMath);

    expect(found, `${name}: $${found[0]}$ 는 화면에 글자 그대로 나옵니다 — $$로 감싸세요`).toEqual(
      [],
    );
  });
});
