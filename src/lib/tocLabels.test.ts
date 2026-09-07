import { describe, expect, it } from 'vitest';
import { tocLabels } from './tocLabels';

const items = [
  { title: '개요' },
  { title: '과목' },
  { title: '시험 정보' },
  { title: '치르는 방식', sub: true },
  { title: '응시 조건', sub: true },
  { title: '시험 일정' },
  { title: '연도별', sub: true },
];

describe('tocLabels', () => {
  it('위 단계는 점, 아래 단계는 닫는 괄호를 쓴다', () => {
    expect(tocLabels(items).map((label) => label.mark)).toEqual([
      '1.',
      '2.',
      '3.',
      '1)',
      '2)',
      '4.',
      '1)',
    ]);
  });

  /* 예전에는 `index + 1`이라 하위 항목이 낀 만큼 절 번호가 건너뛰었습니다. */
  it('하위 항목이 절 번호를 건너뛰게 하지 않는다', () => {
    expect(tocLabels(items)[5].mark).toBe('4.');
  });

  /* 띠에서는 자리를 번호가 말합니다 — 위 절 이름까지 적으면 한 줄이 넘칩니다. */
  it('띠에 적는 말은 하위일 때 번호로 자리를 알린다', () => {
    const labels = tocLabels(items);

    expect(labels[2].caption).toBe('3. 시험 정보');
    expect(labels[4].caption).toBe('3-2. 응시 조건');
    expect(labels[6].caption).toBe('4-1. 연도별');
  });

  it('하위가 먼저 오면 그것을 절로 센다', () => {
    expect(tocLabels([{ title: '머리', sub: true }, { title: '갈래', sub: true }])).toEqual([
      { mark: '1.', caption: '1. 머리' },
      { mark: '1)', caption: '1-1. 갈래' },
    ]);
  });

  it('빈 목차에는 번호가 없다', () => {
    expect(tocLabels([])).toEqual([]);
  });
});
