import { describe, expect, it } from 'vitest';
import { sameEdges, toBands } from './inlineSelection';

/** DOMRect 대신 필요한 네 값만 든 가짜. toBands는 이 넷만 봅니다. */
function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height } as DOMRect;
}

describe('toBands', () => {
  it('같은 줄의 사각형을 하나로 합쳐 틈을 없앤다', () => {
    // KaTeX가 내는 모양입니다 — 글자와 글자 사이가 여백만큼 벌어져 있습니다.
    const bands = toBands([rect(0, 100, 10, 20), rect(14, 100, 10, 20), rect(28, 100, 10, 20)]);

    expect(bands).toHaveLength(1);
    expect(bands[0]).toEqual({ left: 0, right: 38, top: 100, bottom: 120 });
  });

  it('높이가 다른 조각도 한 띠로 묶는다', () => {
    // 숫자는 KaTeX_Main(19.5px), 문자는 KaTeX_Math(15.5px)라 상자가 갈립니다.
    const bands = toBands([rect(0, 100, 10, 19.5), rect(12, 102, 8, 15.5)]);

    expect(bands).toHaveLength(1);
    expect(bands[0].top).toBe(100);
    expect(bands[0].bottom).toBe(119.5);
  });

  it('분수의 분자와 분모는 한 덩어리로 본다', () => {
    const bands = toBands([rect(0, 100, 12, 14), rect(0, 118, 12, 14)]);

    expect(bands).toHaveLength(1);
    expect(bands[0]).toEqual({ left: 0, right: 12, top: 100, bottom: 132 });
  });

  it('줄이 바뀌면 따로 잡는다', () => {
    const bands = toBands([rect(0, 100, 40, 20), rect(0, 140, 30, 20)]);

    expect(bands).toHaveLength(2);
    expect(bands.map((band) => band.top)).toEqual([100, 140]);
  });

  it('들어온 순서와 상관없이 같은 답을 낸다', () => {
    const rects = [rect(0, 140, 30, 20), rect(20, 100, 10, 20), rect(0, 100, 10, 20)];

    expect(toBands(rects)).toEqual(toBands([...rects].reverse()));
  });

  it('빈 입력에는 아무 띠도 만들지 않는다', () => {
    expect(toBands([])).toEqual([]);
  });
});

describe('sameEdges', () => {
  const node = { nodeName: '#text' } as unknown as Node;
  const other = { nodeName: '#text' } as unknown as Node;

  it('양끝이 그대로면 같다고 본다 — 다시 그리지 않기 위한 판정이다', () => {
    expect(sameEdges([[node, 0, node, 3]], [[node, 0, node, 3]])).toBe(true);
  });

  it('오프셋이 하나라도 달라지면 다시 그린다', () => {
    expect(sameEdges([[node, 0, node, 3]], [[node, 0, node, 4]])).toBe(false);
  });

  it('노드가 바뀌면 다시 그린다', () => {
    expect(sameEdges([[node, 0, node, 3]], [[node, 0, other, 3]])).toBe(false);
  });

  it('선택이 풀린 것(빈 배열)과 잡힌 것을 가른다', () => {
    expect(sameEdges([], [[node, 0, node, 3]])).toBe(false);
    expect(sameEdges([], [])).toBe(true);
  });
});
