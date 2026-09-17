import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/**
 * **`var(--없는-이름)`은 오류가 아니라 침묵이다.** 브라우저가 그 선언을 통째로
 * 버리고 상속값으로 돌아가므로 화면에 아무 표시도 안 남는다.
 *
 * 2026-09-16에 `--font-mono`가 그랬다 — AI 가이드가 **열여섯 곳에서 부르는데 정의가
 * 0곳**이었고, 그래서 이 서랍만 사이트에서 모노 라벨이 없는 화면이었다. 집은 같은
 * 스택을 리터럴로 일흔다섯 곳에 적고 있었으니 「다른 데서 쓰니까 있겠지」로 지나간
 * 자리다. 반년을 그렇게 나가 있었고 `npm test` 1,855건이 전부 초록이었다.
 */
function declaredNames(): Set<string> {
  return new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

/** 폴백이 없는 호출만 모은다 — `var(--x, 12px)`는 없어도 값이 서므로 구멍이 아니다. */
function calledWithoutFallback(): Set<string> {
  const names = new Set<string>();
  for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/g)) {
    if (m[2] === ')') names.add(m[1]);
  }
  return names;
}

/**
 * 인라인 `style`로 대입하는 것들. 컴포넌트가 제품 색·로고 마스크처럼 **값마다 다른
 * 것**을 넘기는 자리라 스타일시트에 있을 수가 없다.
 *
 * **이름이 있는지가 아니라 대입 문법이 있는지를 본다.** 처음에는 파일에 그 이름이
 * 적혀 있기만 하면 통과시켰는데, 그러면 **이 파일의 주석이 자기 검사를 무력화한다** —
 * 아래 예시로 `--font-mono`를 적어 두었더니 정의를 지워도 초록이었다. 실제 대입은
 * 언제나 객체 키라 따옴표가 붙는다(`{ '--guide-accent': product.accent }`).
 */
function assignedInSource(): string {
  const root = new URL('..', import.meta.url).pathname;
  const files = globSync('{src/**/*.{ts,tsx},plugins/**/*.ts,index.html}', { cwd: root });
  return files
    .filter((file) => !/\.test\.tsx?$/.test(file))
    .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
    .join('\n');
}

/**
 * shiki가 하이라이트한 HTML에 직접 박아 넣는 값. 저장소 소스에는 한 글자도 없고
 * 빌드 산출물에만 있어서, 이 넷만 예외로 둔다. 늘리지 않는다 — 늘리는 순간
 * 이 검사가 하는 일이 없어진다.
 */
const INJECTED_AT_BUILD = ['--shiki-dark', '--shiki-dark-bg', '--shiki-light', '--shiki-light-bg'];

describe('스타일시트', () => {
  it('폴백 없이 부르는 커스텀 프로퍼티가 어딘가에서 실제로 대입된다', () => {
    const declared = declaredNames();
    const source = assignedInSource();

    const orphans = [...calledWithoutFallback()]
      .filter((name) => !declared.has(name))
      .filter((name) => !INJECTED_AT_BUILD.includes(name))
      .filter((name) => !source.includes(`'${name}'`) && !source.includes(`"${name}"`))
      .sort();

    expect(orphans).toEqual([]);
  });

  /*
    **등급은 셋인데 화면이 둘만 알면 조용히 샙니다.** 오늘 `ours` 팁이 0건이라
    거르개에 실측 칸이 안 서고, 그래서 규칙을 빠뜨려도 아무 화면에서도 안 드러납니다.
    실측 팁이 하나 생기는 날 그 줄은 「공식」에서도 「체감」에서도 사라지는데,
    타입 검사도 렌더 검사도 그걸 못 잡습니다 — CSS에 안 적힌 것이기 때문입니다.
  */
  it('근거 등급 셋이 팁 거르개와 줄 클래스에 다 적혀 있다', () => {
    const missing = ['vendor', 'ours', 'field'].filter(
      (tier) =>
        !css.includes(`.guide-tip-radio[value='${tier}']:checked`) ||
        !css.includes(`.guide-tip:not(.is-${tier})`),
    );
    expect(missing).toEqual([]);
  });

  it('빌드 때 주입되는 예외 넷이 실제로 스타일시트에서 불린다', () => {
    // 예외 목록이 쓸모를 잃고도 남아 있지 않게 한다.
    for (const name of INJECTED_AT_BUILD) {
      expect(css).toContain(`var(${name})`);
    }
  });
});
