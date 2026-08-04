import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AA_NORMAL_TEXT, contrastRatio } from './contrast';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function readTokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`${selector} 블록을 찾지 못했습니다.`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);

  const tokens: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

const themes = [
  { name: 'light', tokens: readTokens(':root {') },
  { name: 'dark', tokens: readTokens("[data-theme='dark'] {") },
];

/** 글자색으로 쓰이는 토큰. 이름에 -text가 붙거나 본문 계열이면 대비를 검사합니다. */
const isTextToken = (name: string) => name.endsWith('-text') || /^--text(-|$)/.test(name);

describe('테마 팔레트', () => {
  it('두 테마가 같은 토큰 집합을 정의한다', () => {
    const [light, dark] = themes;
    expect(Object.keys(dark.tokens).sort()).toEqual(Object.keys(light.tokens).sort());
  });

  for (const { name, tokens } of themes) {
    describe(`${name} 테마`, () => {
      const background = tokens['--bg'];

      it('배경색이 hex로 정의돼 있다', () => {
        expect(background).toMatch(/^#[0-9a-f]{3,6}$/i);
      });

      const textTokens = Object.entries(tokens).filter(([token]) => isTextToken(token));

      it('검사할 글자색 토큰이 존재한다', () => {
        expect(textTokens.length).toBeGreaterThan(5);
      });

      for (const [token, value] of textTokens) {
        it(`${token}이 배경 대비 WCAG AA를 넘는다`, () => {
          const ratio = contrastRatio(value, background);
          expect(
            ratio,
            `${token}(${value}) on ${background} = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        });
      }
    });
  }
});
