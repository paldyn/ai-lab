import { describe, expect, it } from 'vitest';
import { categories, categoryIdsIn } from './categories';
import {
  learnGroupIds,
  learnGroups,
  learnGroupsWithPage,
  ungroupedLearnCategories,
} from './learnGroups';
import { certs } from './certs';

describe('학습 묶음', () => {
  it('학습 카테고리가 빠짐없이 한 묶음에 담긴다', () => {
    expect(ungroupedLearnCategories()).toEqual([]);
  });

  it('한 카테고리가 두 묶음에 들어가지 않는다', () => {
    const all = learnGroups.flatMap((group) => group.categoryIds);
    expect(all.length).toBe(new Set(all).size);
  });

  it('묶음에 학습 밖 카테고리가 섞이지 않는다', () => {
    const learn = new Set<string>(categoryIdsIn('learn'));
    const outside = learnGroups.flatMap((group) => group.categoryIds.filter((id) => !learn.has(id)));
    expect(outside).toEqual([]);
  });

  /*
    주소 한 칸(/learn/:categoryId)이 묶음과 카테고리를 함께 받습니다. 겹치면 조용히
    카테고리가 이기고 묶음 페이지가 사라지므로 여기서 막습니다. 자격증도 같은 자리를
    씁니다(/learn/certs).
  */
  it('묶음 id가 카테고리·자격증 주소와 겹치지 않는다', () => {
    const taken = new Set<string>([
      ...categories.map((category) => category.id),
      'certs',
      ...certs.map((cert) => cert.id),
    ]);
    expect(learnGroupIds.filter((id) => taken.has(id))).toEqual([]);
  });

  /*
    카테고리가 하나뿐인 묶음은 페이지를 갖지 않습니다 — 목록이 그 카테고리 페이지와
    글자 하나까지 같아 같은 내용이 주소 둘로 색인됩니다.
  */
  it('페이지를 갖는 묶음은 카테고리가 둘 이상이다', () => {
    expect(learnGroupsWithPage.every((group) => group.categoryIds.length >= 2)).toBe(true);
  });

  it('묶음 이름과 설명이 비어 있지 않다', () => {
    for (const group of learnGroups) {
      expect(group.name.length).toBeGreaterThan(0);
      expect(group.description.length).toBeGreaterThanOrEqual(20);
    }
  });

  /*
    페이지를 갖는 묶음의 이름은 카테고리 이름과 갈려야 합니다 — 레일 밖(검색 결과·
    공유 링크)에서는 둘이 나란히 안 서서 어느 쪽인지 알 수 없습니다. 카테고리가
    하나뿐인 묶음(수학)은 그 카테고리 자신이라 같은 이름이 맞습니다.
  */
  it('페이지를 갖는 묶음 이름이 카테고리 이름과 겹치지 않는다', () => {
    const names = new Set(categories.map((category) => category.name));
    expect(learnGroupsWithPage.filter((group) => names.has(group.name)).map((g) => g.name)).toEqual(
      [],
    );
  });
});
