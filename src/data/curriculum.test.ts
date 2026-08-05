import { describe, expect, it } from 'vitest';
import {
  curriculumLinks,
  curriculumOrder,
  mainTrackNumber,
  mathAdvanced,
  mathCurriculum,
  mathFoundation,
  mathSupport,
  mathWritingOrder,
} from './curriculum';

const TRACKS = [
  ['중급', mathCurriculum, /^math-(?!basics-|adv-)[a-z0-9-]+$/],
  ['초급', mathFoundation, /^math-basics-[a-z0-9-]+$/],
  ['고급', mathAdvanced, /^math-adv-[a-z0-9-]+$/],
] as const;

describe('수학 커리큘럼', () => {
  it('트랙마다 슬러그 접두사가 일관된다', () => {
    for (const [name, slugs, pattern] of TRACKS) {
      for (const slug of slugs) {
        expect(slug, `${name} 트랙의 '${slug}'`).toMatch(pattern);
      }
    }
  });

  it('세 트랙을 통틀어 슬러그가 중복되지 않는다', () => {
    expect(new Set(mathWritingOrder).size).toBe(mathWritingOrder.length);
  });

  it('편수는 초급 48 · 중급 80 · 고급 63이다', () => {
    // 계획 문서가 편수로 일정을 세우므로 여기가 어긋나면 계획이 먼저 틀립니다.
    expect(mathFoundation).toHaveLength(48);
    expect(mathCurriculum).toHaveLength(80);
    expect(mathAdvanced).toHaveLength(63);
  });

  /**
   * 2026-08-05에 중급 → 초급에서 뒤집었습니다. 중급부터 쓰면 첫 배치가 전부
   * `level: 중급`이라 '초급부터'라는 약속과 어긋납니다. 링크는 '아직 쓰지 않은 글을
   * 본문에서 링크하지 않는다'는 규칙으로 풀고, 대응은 curriculum.ts 데이터가 그립니다.
   *
   * 배열 deep-equal 대신 불변식으로 둡니다 — 사본이 아니라 결정을 검사해야 합니다.
   */
  describe('쓰기 순서는 초급 → 중급 → 고급이다', () => {
    it('세 배열의 슬러그를 하나도 빠뜨리지 않는다', () => {
      const all = [...mathCurriculum, ...mathFoundation, ...mathAdvanced];
      expect([...mathWritingOrder].sort()).toEqual([...all].sort());
    });

    it('초급 48편이 맨 앞 블록이다', () => {
      expect(mathWritingOrder.slice(0, mathFoundation.length)).toEqual(mathFoundation);
    });

    it('고급이 맨 뒤 블록이다', () => {
      expect(mathWritingOrder.slice(-mathAdvanced.length)).toEqual(mathAdvanced);
    });
  });

  /**
   * 목록은 order 오름차순이고 최신 글이 맨 위입니다. 수학은 같은 날 여러 편이 나가
   * `pubDate`로는 하루 안의 순서가 잡히지 않으므로 쓰는 순서를 뒤집어 씁니다.
   */
  describe('화면 순서는 쓰는 순서의 역순이다', () => {
    it('마지막에 쓰는 글이 0이고 첫 글이 맨 뒤다', () => {
      const last = mathWritingOrder[mathWritingOrder.length - 1];
      expect(curriculumOrder(last)).toBe(0);
      // 0은 유효한 순서입니다. `articles.ts`가 한때 `...(order ? { order } : {})`로
      // 걸러 0을 falsy로 버렸고, 그러면 그 글만 order 없이 목록 맨 뒤로 밀립니다.
      // 화면에서는 순서가 이상해 보일 뿐 오류가 나지 않아 눈에 띄지 않습니다.
      expect(curriculumOrder(last)).not.toBeUndefined();
      expect(curriculumOrder(mathWritingOrder[0])).toBe(mathWritingOrder.length - 1);
    });

    it('쓰는 순서가 뒤인 글일수록 order가 작다', () => {
      const orders = mathWritingOrder.map((slug) => curriculumOrder(slug)!);
      for (let i = 1; i < orders.length; i += 1) {
        expect(orders[i], mathWritingOrder[i]).toBeLessThan(orders[i - 1]);
      }
    });

    it('고급이 맨 앞, 그다음 중급, 초급 1번이 맨 아래다', () => {
      const lastAdvanced = curriculumOrder(mathAdvanced[mathAdvanced.length - 1])!;
      const firstAdvanced = curriculumOrder(mathAdvanced[0])!;
      const lastMain = curriculumOrder(mathCurriculum[mathCurriculum.length - 1])!;
      const firstFoundation = curriculumOrder(mathFoundation[0])!;

      expect(lastAdvanced).toBeLessThan(firstAdvanced);
      expect(firstAdvanced).toBeLessThan(lastMain);
      expect(lastMain).toBeLessThan(firstFoundation);
      expect(firstFoundation).toBe(mathWritingOrder.length - 1);
    });

    it('목록에 없는 슬러그는 undefined를 준다', () => {
      expect(curriculumOrder('math-not-in-any-track')).toBeUndefined();
    });
  });

  /**
   * 초급·고급 원고는 아직 없는 중급을 본문에서 링크할 수 없어 번호와 제목만 적습니다.
   * 눌러서 이동하는 길은 이 대응 데이터가 유일하게 냅니다 — 여기가 어긋나면
   * 화면에서 조용히 엉뚱한 글로 가거나 배지가 통째로 사라집니다.
   */
  describe('초급·고급 ↔ 중급 대응', () => {
    const supportSlugs = Object.keys(mathSupport);

    it('키는 전부 초급 아니면 고급이다', () => {
      const known = new Set([...mathFoundation, ...mathAdvanced]);
      for (const slug of supportSlugs) {
        expect(known.has(slug), slug).toBe(true);
      }
    });

    it('값은 전부 중급 번호(1~80) 안이다', () => {
      for (const [slug, numbers] of Object.entries(mathSupport)) {
        expect(numbers.length, slug).toBeGreaterThan(0);
        for (const number of numbers) {
          expect(Number.isInteger(number), `${slug} -> ${number}`).toBe(true);
          expect(number, `${slug} -> ${number}`).toBeGreaterThanOrEqual(1);
          expect(number, `${slug} -> ${number}`).toBeLessThanOrEqual(mathCurriculum.length);
        }
        expect(new Set(numbers).size, `${slug}에 같은 번호가 두 번`).toBe(numbers.length);
      }
    });

    it('초급은 48편 전부 대응을 갖는다', () => {
      // 초급 글의 존재 이유가 중급 어딘가를 받치는 것이라 빈 편이 있으면 안 됩니다.
      for (const slug of mathFoundation) {
        expect(mathSupport[slug], slug).toBeDefined();
      }
    });

    it('초급·고급 글은 자기가 받치는 중급을 슬러그로 되돌려 준다', () => {
      const links = curriculumLinks('math-basics-quadratic-and-parabola');
      expect(links.mainTrack[0]).toBe('math-eigenvalues');
      expect(mainTrackNumber(links.mainTrack[0])).toBe(12);
      expect(links.foundation).toEqual([]);
      expect(links.advanced).toEqual([]);
    });

    it('중급 글은 자기를 받치는 초급과 고급을 되돌려 준다', () => {
      const links = curriculumLinks('math-eigenvalues');
      expect(links.foundation).toContain('math-basics-quadratic-and-parabola');
      expect(links.foundation).toContain('math-basics-determinant-and-inverse');
      expect(links.advanced).toContain('math-adv-spectral-graph-theory');
      expect(links.mainTrack).toEqual([]);
    });

    it('대응은 양방향이 맞물린다', () => {
      for (const [slug, numbers] of Object.entries(mathSupport)) {
        const side = slug.startsWith('math-adv-') ? 'advanced' : 'foundation';
        for (const number of numbers) {
          const main = mathCurriculum[number - 1];
          expect(curriculumLinks(main)[side], `${main} <- ${slug}`).toContain(slug);
        }
      }
    });

    it('커리큘럼 밖의 슬러그는 빈 대응을 준다', () => {
      expect(curriculumLinks('transformer-attention-from-first-principles')).toEqual({
        foundation: [],
        advanced: [],
        mainTrack: [],
      });
    });
  });
});
