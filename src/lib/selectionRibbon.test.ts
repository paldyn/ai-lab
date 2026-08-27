import { describe, expect, it } from 'vitest';
import { bandOf, sameEdges, splitLines, type Span } from './selectionRibbon';

function span(left: number, top: number, width: number, height: number): Span {
  return { left, top, right: left + width, bottom: top + height };
}

describe('splitLines', () => {
  it('세로로 겹치면 같은 줄로 본다', () => {
    // 한 줄 안의 글자·수식·코드 칩은 같은 기준선에 놓여 반드시 겹칩니다.
    const lines = splitLines([span(20, 100, 60, 20), span(90, 102, 30, 16), span(130, 99, 50, 22)]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(3);
  });

  it('줄이 바뀌면 나눈다', () => {
    // 줄과 줄은 잉크 사이가 벌어져 안 겹칩니다.
    const lines = splitLines([span(20, 100, 60, 20), span(20, 130, 40, 20), span(20, 160, 30, 20)]);

    expect(lines).toHaveLength(3);
    expect(lines.map((line) => line[0].top)).toEqual([100, 130, 160]);
  });

  it('들어온 순서와 상관없이 같은 답을 낸다', () => {
    const rects = [span(20, 130, 40, 20), span(90, 102, 30, 16), span(20, 100, 60, 20)];
    const forward = splitLines(rects).map((line) => line.length);

    expect(splitLines([...rects].reverse()).map((line) => line.length)).toEqual(forward);
  });

  it('빈 입력에는 줄이 없다', () => {
    expect(splitLines([])).toEqual([]);
  });
});

describe('bandOf', () => {
  it('가장 넓은 사각형을 기준으로 줄 높이만큼 두께를 준다', () => {
    // 본문 글자(폭 60)가 기준이 되고, 그보다 작은 수식 상자는 기준이 되지 않습니다.
    const band = bandOf([span(20, 105, 60, 20), span(90, 107, 12, 16)], 30);

    expect(band).toEqual({ left: 20, right: 102, top: 100, bottom: 130 });
  });

  it('줄보다 큰 잉크가 있으면 그만큼 늘린다', () => {
    // 분수처럼 줄 밖으로 나가는 수식이 띠 밖에 남으면 흰 글자만 떠 보입니다.
    const band = bandOf([span(20, 105, 60, 20), span(90, 92, 30, 46)], 30);

    expect(band.top).toBe(92);
    expect(band.bottom).toBe(138);
  });

  it('줄 높이를 못 읽으면(0) 잉크 높이를 그대로 쓴다', () => {
    const band = bandOf([span(20, 105, 60, 20)], 0);

    expect(band).toEqual({ left: 20, right: 80, top: 105, bottom: 125 });
  });

  it('수식만 있는 줄에서는 수식이 기준이 된다', () => {
    const band = bandOf([span(40, 200, 120, 22)], 30);

    expect(band.top).toBe(196);
    expect(band.bottom).toBe(226);
  });

  it('위아래를 픽셀에 맞춰 이웃한 줄과 한 픽셀 겹치게 한다', () => {
    // 실제로 나온 값이다. 29.3과 29.29로 맞닿으면 그 픽셀 줄을 둘이 30%·70%만
    // 덮고 알파 합성이라 21%가 비어 검은 줄이 보였다.
    const first = bandOf([span(0, -0.3, 300, 20)], 29.6);
    const second = bandOf([span(0, 29.29, 300, 20)], 29.6);

    expect(first.bottom).toBeGreaterThan(second.top);
    expect([first.top, first.bottom, second.top, second.bottom]).toEqual([-6, 25, 24, 55]);
  });
});

describe('bandOf 좌우', () => {
  it('좌우를 픽셀에 맞춰 넓힌다', () => {
    // 실제로 나온 값이다. 486.1875에서 끝나면 마지막 픽셀 줄이 19%만 칠해져
    // 띠 끝이 옅어지고, 끌다가 만 것처럼 보인다.
    const band = bandOf([span(171.296875, 100, 314.890625, 20)], 30);

    expect(band.left).toBe(171);
    expect(band.right).toBe(487);
  });

  it('이미 정수면 그대로 둔다', () => {
    const band = bandOf([span(20, 100, 60, 20)], 30);

    expect([band.left, band.right]).toEqual([20, 80]);
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
