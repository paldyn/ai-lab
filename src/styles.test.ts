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
    **등급 셋이 화면에서 모양으로 갈리는가.**

    한때 이 검사는 팁 거르개(등급으로 거르는 라디오)를 봤습니다. 2026-09-17에 그
    거르개를 걷어냈고 — 축이 질문으로 바뀌면서 거르개만 옛 축에 남아 있었습니다 —
    그러면서 **등급을 화면에 세우는 것이 배지 하나가 됐습니다.**

    그래서 보는 것도 그리로 옮깁니다. 배지는 **색이 아니라 모양**으로 갈려야 하고
    (채움·실선·점선), 셋 중 하나라도 규칙이 없으면 그 등급은 화면에서 나머지와
    구별되지 않습니다. 실측 팁이 아직 0건이라 `ours`는 아무 화면에도 안 보이는데,
    그래서 빠뜨려도 눈으로는 안 드러납니다.
  */
  it('근거 등급 셋이 배지 모양으로 갈린다', () => {
    const missing = ['vendor', 'ours', 'field'].filter(
      (tier) => !css.includes(`.evidence-badge-${tier}`),
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
