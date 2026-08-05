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
  ['본선', mathCurriculum, /^math-(?!basics-|adv-)[a-z0-9-]+$/],
  ['기초', mathFoundation, /^math-basics-[a-z0-9-]+$/],
  ['심화', mathAdvanced, /^math-adv-[a-z0-9-]+$/],
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

  /**
   * 2026-08-05에 본선 → 기초에서 뒤집었습니다. 본선부터 쓰면 첫 배치가 전부
   * `level: 중급`이라 '기초부터'라는 약속과 어긋납니다. 링크는 '아직 쓰지 않은 글을
   * 본문에서 링크하지 않는다'는 규칙으로 풀고, 대응은 curriculum.ts 데이터가 그립니다.
   *
   * 배열 deep-equal 대신 불변식으로 둡니다 — 사본이 아니라 결정을 검사해야 합니다.
   */
  describe('쓰기 순서는 기초 → 본선 → 심화다', () => {
    const DIAGNOSIS = 'math-basics-self-diagnosis';
    const foundationFirst = mathFoundation.filter((slug) => slug !== DIAGNOSIS);

    it('세 배열의 슬러그를 하나도 빠뜨리지 않는다', () => {
      const all = [...mathCurriculum, ...mathFoundation, ...mathAdvanced];
      expect([...mathWritingOrder].sort()).toEqual([...all].sort());
    });

    it('자가진단을 뺀 기초가 맨 앞 블록이다', () => {
      expect(mathWritingOrder.slice(0, foundationFirst.length)).toEqual(foundationFirst);
    });

    it('자가진단은 본선을 전부 쓴 뒤에 온다', () => {
      // 30문항의 처방이 본선 여러 편으로 이동하는 글이라 맨 마지막입니다.
      const diagnosis = mathWritingOrder.indexOf(DIAGNOSIS);
      for (const slug of mathCurriculum) {
        expect(mathWritingOrder.indexOf(slug), slug).toBeLessThan(diagnosis);
      }
    });

    it('심화가 맨 뒤 블록이다', () => {
      expect(mathWritingOrder.slice(-mathAdvanced.length)).toEqual(mathAdvanced);
    });
  });

  /**
   * 본선 첫 글의 order는 0입니다. `articles.ts`가 한때 `...(order ? { order } : {})`로
   * 걸러 0을 falsy로 버렸고, 그러면 1번 글만 order 없이 목록 맨 뒤로 밀립니다.
   * 화면에서는 순서가 이상해 보일 뿐 오류가 나지 않아 눈에 띄지 않습니다.
   */
  it('본선 첫 글의 순서는 0이며 undefined가 아니다', () => {
    expect(curriculumOrder(mathCurriculum[0])).toBe(0);
    expect(curriculumOrder(mathCurriculum[0])).not.toBeUndefined();
  });

  it('본선이 맨 앞, 기초와 심화가 그 뒤로 간다', () => {
    const lastMain = curriculumOrder(mathCurriculum[mathCurriculum.length - 1])!;
    const firstFoundation = curriculumOrder(mathFoundation[0])!;
    const firstAdvanced = curriculumOrder(mathAdvanced[0])!;

    expect(lastMain).toBeLessThan(firstFoundation);
    expect(firstFoundation).toBeLessThan(firstAdvanced);
  });

  it('본선은 목록 인덱스를 그대로 순서로 쓴다', () => {
    mathCurriculum.forEach((slug, index) => {
      expect(curriculumOrder(slug), slug).toBe(index);
    });
  });

  it('목록에 없는 슬러그는 undefined를 준다', () => {
    expect(curriculumOrder('math-not-in-any-track')).toBeUndefined();
  });

  /**
   * 기초·심화 원고는 아직 없는 본선을 본문에서 링크할 수 없어 번호와 제목만 적습니다.
   * 눌러서 이동하는 길은 이 대응 데이터가 유일하게 냅니다 — 여기가 어긋나면
   * 화면에서 조용히 엉뚱한 글로 가거나 배지가 통째로 사라집니다.
   */
  describe('기초·심화 ↔ 본선 대응', () => {
    const supportSlugs = Object.keys(mathSupport);

    it('키는 전부 기초 아니면 심화다', () => {
      const known = new Set([...mathFoundation, ...mathAdvanced]);
      for (const slug of supportSlugs) {
        expect(known.has(slug), slug).toBe(true);
      }
    });

    it('값은 전부 본선 번호(1~80) 안이다', () => {
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

    it('기초는 22편 전부 대응을 갖는다', () => {
      // 기초는 "본선 N번에서 막혔을 때 꺼내 보는 것"이라 대응 없는 편이 있으면 안 됩니다.
      for (const slug of mathFoundation) {
        expect(mathSupport[slug], slug).toBeDefined();
      }
    });

    it('기초·심화 글은 자기가 받치는 본선을 슬러그로 되돌려 준다', () => {
      const links = curriculumLinks('math-basics-quadratic-and-parabola');
      expect(links.mainTrack[0]).toBe('math-eigenvalues');
      expect(mainTrackNumber(links.mainTrack[0])).toBe(12);
      expect(links.foundation).toEqual([]);
      expect(links.advanced).toEqual([]);
    });

    it('본선 글은 자기를 받치는 기초와 심화를 되돌려 준다', () => {
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
