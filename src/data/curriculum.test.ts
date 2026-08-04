import { describe, expect, it } from 'vitest';
import {
  curriculumOrder,
  mathAdvanced,
  mathCurriculum,
  mathFoundation,
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

  it('쓰기 순서는 본선 → 기초 → 심화다', () => {
    // 기초·심화 글이 본문에서 본선을 링크하므로 본선이 먼저 있어야
    // npm test의 내부 링크 검사가 통과합니다.
    expect(mathWritingOrder).toEqual([...mathCurriculum, ...mathFoundation, ...mathAdvanced]);
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
});
