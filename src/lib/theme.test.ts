import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AA_NORMAL_TEXT, contrastRatio, parseHex } from './contrast';
import { guideProducts } from '../data/guideProducts';

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

/**
 * `color-mix(in srgb, a p%, b)` — 감마 인코딩된 sRGB 값을 그대로 섞습니다(브라우저와 같은 식).
 */
function mixHex(a: string, b: string, p: number): string {
  const [ca, cb] = [parseHex(a), parseHex(b)];
  return `#${ca
    .map((v, i) => Math.round(v * p + cb[i] * (1 - p)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/*
  **제품색 글자가 제품색 판 위에 선다**(AI 가이드 원장의 행동 문장 속 코드, 2026-09-28).
  판은 `color-mix(in srgb, accent 8%, --bg)`라 첫 :root만 읽는 위 검사에 안 걸립니다 —
  배경이 조금만 짙어지거나 제품색이 조금만 옅어져도 조용히 AA 밑으로 내려가므로 따로 잽니다.
  가장 낮은 것이 라이트 Anthropic(4.7:1 안팎)입니다. 비율은 styles.css의
  `.gl-tip-do .guide-tip-code`와 같아야 합니다.
*/
describe('제품색 판 위의 제품색 글자', () => {
  const TINT = 0.08;
  const accents = [
    ...new Set(
      guideProducts.map((p) => /^var\((--[a-z0-9-]+)\)$/.exec(p.accent)?.[1] ?? p.accent),
    ),
  ];

  it('판의 비율이 styles.css와 같다', () => {
    expect(css).toMatch(
      /\.gl-tip-do \.guide-tip-code \{[^}]*background: color-mix\(in srgb, var\(--guide-accent\) 8%, var\(--bg\)\);/,
    );
  });

  for (const { name, tokens } of themes) {
    for (const token of accents) {
      it(`${name} · ${token}이 제 판 위에서 AA를 넘는다`, () => {
        const ink = tokens[token];
        expect(ink, `${token}이 ${name} 테마에 없습니다`).toMatch(/^#[0-9a-f]{3,6}$/i);
        const plate = mixHex(ink, tokens['--bg'], TINT);
        const ratio = contrastRatio(ink, plate);
        expect(ratio, `${token}(${ink}) on ${plate} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
          AA_NORMAL_TEXT,
        );
      });
    }
  }
});
