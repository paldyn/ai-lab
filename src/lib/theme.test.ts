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

/*
  **제품색을 섞은 면 위의 글자**(AI 가이드 타임라인 원장, 2026-09-28). 순간 띠 · 머리 카드 ·
  다크의 모델 칸 · 요금 줄 · 탭 세그먼트가 전부 `color-mix`라 첫 `:root`만 읽는 위 검사에 안 걸린다.
  OpenAI 라이트의 켜진 띠(12%) 위 `--text-dim`이 4.45:1로 AA를 못 넘은 적이 있다.

  비율은 styles.css의 `.gl-ledger` · `[data-theme='dark'] .gl-ledger` 블록과 같아야 한다 —
  아래 첫 검사가 그 줄을 못 박는다.
*/
describe('제품색을 섞은 면 위의 글자', () => {
  const accents = [
    ...new Set(
      guideProducts.map((p) => /^var\((--[a-z0-9-]+)\)$/.exec(p.accent)?.[1] ?? p.accent),
    ),
  ];
  /* [면 이름, 섞는 비율(라이트, 다크), 바탕 토큰, 그 위에 서는 글자 토큰] */
  const surfaces: Array<[string, [number, number], string, string[]]> = [
    ['순간 띠 · 절 머리 띠', [0.07, 0.1], '--bg', ['--text-strong', '--text-dim']],
    ['켜진 순간 띠', [0.12, 0.17], '--bg', ['--text-strong', '--text']],
    ['머리 카드', [0.04, 0.04], '--bg', ['--text-strong', '--prose-text', '--text-dim']],
    ['머리 카드 모서리', [0.14, 0.14], '--bg', ['--text-strong', '--prose-text']],
  ];

  it('섞는 비율이 styles.css와 같다', () => {
    const light = /\.gl-ledger \{[^}]*\}/.exec(css)?.[0] ?? '';
    const dark = /\[data-theme='dark'\] \.gl-ledger \{[^}]*\}/.exec(css)?.[0] ?? '';
    const mix = (block: string, token: string, pct: number, base: string) =>
      block.includes(`${token}: color-mix(in srgb, var(--guide-accent) ${pct}%, var(${base}));`);
    expect(mix(light, '--gl-a04', 4, '--bg')).toBe(true);
    expect(mix(light, '--gl-a07', 7, '--bg')).toBe(true);
    expect(mix(light, '--gl-a12', 12, '--bg')).toBe(true);
    expect(mix(light, '--gl-a14', 14, '--bg')).toBe(true);
    expect(mix(dark, '--gl-a07', 10, '--bg')).toBe(true);
    expect(mix(dark, '--gl-a12', 17, '--bg')).toBe(true);
    expect(mix(dark, '--gl-card', 6, '--surface')).toBe(true);
  });

  for (const [i, { name, tokens }] of themes.entries()) {
    for (const token of accents) {
      for (const [surface, pct, base, inks] of surfaces) {
        for (const ink of inks) {
          it(`${name} · ${token} · ${surface} 위 ${ink}`, () => {
            const plate = mixHex(tokens[token], tokens[base], pct[i]);
            const ratio = contrastRatio(tokens[ink], plate);
            expect(ratio, `${ink}(${tokens[ink]}) on ${plate} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
              AA_NORMAL_TEXT,
            );
          });
        }
      }
    }
  }

  /* 다크의 모델 칸 · 요금 줄(`--gl-card`)은 `--surface`에 제품색 6%를 섞는다. 라이트는 `--bg`라 위 검사가 덮는다. */
  const dark = themes[1].tokens;
  for (const token of accents) {
    for (const ink of ['--text-strong', '--text-dim', '--text-muted']) {
      it(`dark · ${token} · 모델 칸·요금 줄 위 ${ink}`, () => {
        const plate = mixHex(dark[token], dark['--surface'], 0.06);
        const ratio = contrastRatio(dark[ink], plate);
        expect(ratio, `${ink} on ${plate} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }

  /* 탭 세그먼트 — 무채색 `--surface` 위의 안 고른 탭 이름, `--guide-rule` 위의 수. */
  for (const { name, tokens } of themes) {
    it(`${name} · 탭 세그먼트 위 이름과 수`, () => {
      expect(contrastRatio(tokens['--text-dim'], tokens['--surface'])).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      expect(contrastRatio(tokens['--text'], tokens['--guide-rule'])).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  }
});
