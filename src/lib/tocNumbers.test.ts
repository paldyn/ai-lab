import { describe, expect, it } from 'vitest';
import { tocNumbers } from './tocNumbers';

describe('tocNumbers', () => {
  it('위 단계는 두 자리에 점을 단다', () => {
    expect(tocNumbers([false, false, false])).toEqual(['01.', '02.', '03.']);
  });

  /*
    예전에는 목차가 `index + 1`을 찍어 하위 항목이 낀 만큼 절 번호가 건너뛰었습니다.
    자리를 세는 것이라 하위가 몇이든 다음 절은 바로 다음 번호입니다.
  */
  it('하위 항목은 절 번호를 건너뛰게 하지 않는다', () => {
    expect(tocNumbers([false, true, true, false])).toEqual(['01.', '01.1', '01.2', '02.']);
  });

  it('절이 바뀌면 하위 번호가 다시 1부터다', () => {
    expect(tocNumbers([false, true, false, true])).toEqual(['01.', '01.1', '02.', '02.1']);
  });

  /* 어느 절에도 안 붙는 「00.1」을 만들지 않습니다. */
  it('하위가 먼저 오면 그것을 절로 센다', () => {
    expect(tocNumbers([true, true])).toEqual(['01.', '01.1']);
  });

  it('빈 목차에는 번호가 없다', () => {
    expect(tocNumbers([])).toEqual([]);
  });
});
