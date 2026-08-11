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
