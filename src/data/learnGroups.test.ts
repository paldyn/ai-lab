import { describe, expect, it } from 'vitest';
import { categories, categoryIdsIn } from './categories';
import {
  learnGroupIds,
  learnGroups,
  learnGroupsWithPage,
  learnTabs,
  ungroupedLearnCategories,
} from './learnGroups';
import { certs } from './certs';
import { staticRoutes } from '../routes';

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

/*
  탭은 갈래를 가르는 가장 바깥 층이라 늘리기 전에 값을 치러야 합니다. 지금까지는
  묶음 id만 검사하고 탭은 아무것도 안 봤습니다 — 탭을 하나 더 세울 때 무엇이
  깨지는지가 코드 어디에도 안 적혀 있었습니다.
*/
describe('학습 갈래', () => {
  it('탭 id가 주소를 가진 칸과 겹치지 않는다', () => {
    /*
      `/learn/:id` 한 칸을 카테고리·페이지를 갖는 묶음·자격증이 나눠 씁니다. 탭 id는
      그 자리에 직접 안 서지만 `learnTabOf()`가 같은 조각을 받아 갈래를 고르므로,
      겹치면 그 주소가 엉뚱한 탭으로 빨려 갑니다.

      **묶음 id 전부와 견주지는 않습니다.** 수학·언어는 탭과 묶음이 같은 개념이라
      이름이 같은 것이 맞고, 그 둘은 카테고리가 하나뿐이라 주소를 안 가집니다 —
      겹쳐서 다투는 자리가 없습니다. 카테고리가 둘 이상이 되어 페이지가 생기는
      순간부터 이 검사가 걸립니다.
    */
    const taken = new Set<string>([
      ...categories.map((category) => category.id),
      ...learnGroupsWithPage.map((group) => group.id),
      'certs',
      ...certs.map((cert) => cert.id),
    ]);
    expect(learnTabs.map((tab) => tab.id).filter((id) => id !== 'all' && taken.has(id))).toEqual([]);
  });

  it('탭이 가는 곳이 모두 실제로 있는 주소다', () => {
    // 여기서 걸리면 프리렌더도 sitemap도 없는 곳으로 칩이 보내는 중입니다.
    const routes = new Set(staticRoutes);
    expect(learnTabs.filter((tab) => !routes.has(tab.to)).map((tab) => tab.to)).toEqual([]);
  });

  it('탭 이름이 겹치지 않는다', () => {
    const names = learnTabs.map((tab) => tab.name);
    expect(names.length).toBe(new Set(names).size);
  });
});
