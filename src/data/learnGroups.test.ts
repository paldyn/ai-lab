import { describe, expect, it } from 'vitest';
import { categories, categoryIdsIn } from './categories';
import {
  learnGroupIds,
  learnGroups,
  learnGroupById,
  learnGroupsWithHead,
  learnTabById,
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
    묶음은 주소를 안 갖지만 옛 주소로 들어온 조각을 `learnTabPathOfGroup`이 받습니다.
    묶음 id가 카테고리·자격증 주소와 겹치면 그 주소가 먼저 잡혀 넘기는 자리가 묻히고,
    id가 주소 조각과 뒤섞입니다. 자격증도 같은 자리를 씁니다(/learn/certs).
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
    **묶음은 갈 곳이 아니라 레일의 머리글입니다.** 예전에는 카테고리가 둘 이상인
    묶음마다 `/learn/ai-principles` 같은 페이지를 세웠는데, 그러면 AI 갈래만 레일에
    층이 하나 더 생겨 수학·언어와 모양이 달라졌습니다. 주소를 되살리면 그 비대칭이
    같이 돌아오므로 여기서 막습니다.
  */
  it('머리글로 서는 묶음 id로 가는 주소가 없다', () => {
    /*
      수학·언어는 탭과 묶음이 같은 개념이라 id가 같고 `/learn/lang`은 실제로 있지만,
      그것은 **갈래의 주소**이지 묶음 페이지가 아닙니다. 그 둘은 머리글이 안 서므로
      이 목록에 없습니다.
    */
    const paths = new Set(staticRoutes);
    expect(
      learnGroupsWithHead.filter((group) => paths.has(`/learn/${group.id}`)).map((g) => g.id),
    ).toEqual([]);
  });

  it('묶음 이름이 비어 있지 않다', () => {
    for (const group of learnGroups) {
      expect(group.name.length).toBeGreaterThan(0);
    }
  });

  /*
    AI 갈래의 카테고리는 묶음에서 파생됩니다. 손으로 적은 사본으로 되돌리면 묶음에
    카테고리를 더했을 때 목록의 범위와 레일이 어긋나고, 그 카테고리 페이지에서 레일이
    통째로 사라지는데 오류는 안 납니다.
  */
  it('AI 갈래가 담는 카테고리가 그 갈래의 묶음이 든 것과 같다', () => {
    const fromGroups = learnTabById.ai.groupIds.flatMap((id) => learnGroupById[id].categoryIds);
    expect([...learnTabById.ai.categoryIds].sort()).toEqual([...fromGroups].sort());
  });

  /*
    머리글로 서는 묶음의 이름은 그 아래 줄들과 갈려야 합니다 — 바로 밑에 나란히
    서므로 같으면 같은 말이 두 번 선 것으로 읽힙니다. 칸이 하나뿐인 묶음(수학·언어)은
    머리글을 안 달아 이 검사에 안 걸립니다.
  */
  it('머리글로 서는 묶음 이름이 카테고리 이름과 겹치지 않는다', () => {
    const names = new Set(categories.map((category) => category.name));
    expect(learnGroupsWithHead.filter((group) => names.has(group.name)).map((g) => g.name)).toEqual(
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
      `/learn/:id` 한 칸을 카테고리와 자격증이 나눠 씁니다. 탭 id는 그 자리에 직접
      안 서지만 `learnTabOf()`가 같은 조각을 받아 갈래를 고르므로, 겹치면 그 주소가
      엉뚱한 탭으로 빨려 갑니다.

      **묶음 id와는 견주지 않습니다.** 묶음은 이제 주소를 안 가지고, 수학·언어는
      탭과 묶음이 같은 개념이라 이름이 같은 것이 맞습니다.
    */
    const taken = new Set<string>([
      ...categories.map((category) => category.id),
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
