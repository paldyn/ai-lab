import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { guideProducts } from './guideProducts';
import { guideVendorIds, guideVendors } from './guideVendors';

/**
 * 기업과 제품 데이터가 지켜야 하는 것.
 *
 * 자격증 마크 검사와 같은 자리입니다 — 표에 없는 시행처가 들어오면 글자 두 개짜리
 * 대체 마크가 **조용히** 서던 그 문제를, 여기서는 로고 파일이 없으면 깨진 이미지가
 * 조용히 서는 모양으로 만납니다.
 */
const ASSETS = path.join(process.cwd(), 'public');

describe('AI 가이드 — 기업과 제품', () => {
  it('제품의 기업이 실재한다', () => {
    const orphan = guideProducts.filter((p) => !guideVendorIds.includes(p.vendorId));
    expect(orphan.map((p) => `${p.id} → ${p.vendorId}`)).toEqual([]);
  });

  /*
    **id가 겹치면 주소가 무너집니다.** 주소가 `/playbook/<기업>/<제품>`이라 기업 id와
    제품 id가 같으면 어느 층인지 못 가립니다. 학습에서 묶음 id가 카테고리·자격증
    주소와 겹치면 안 되는 것과 같은 자리입니다.
  */
  it('기업 id와 제품 id가 서로 안 겹친다', () => {
    const clash = guideProducts.filter((p) => guideVendorIds.includes(p.id as never));
    expect(clash.map((p) => p.id)).toEqual([]);
  });

  /*
    **대표 제품은 그 회사 것이어야 합니다.** 옛 기업 주소가 이 제품으로 넘어가므로,
    남의 회사 제품을 적으면 `/playbook/openai`가 Claude를 열고 레일에서는 OpenAI
    머리글이 꺼집니다. 없는 id를 적으면 넘김이 없는 주소로 가서 한 번 더 튕깁니다.
  */
  it('기업마다 대표 제품이 실재하고 그 회사 것이다', () => {
    const wrong = guideVendors.filter((v) => {
      const home = guideProducts.find((p) => p.id === v.homeProductId);
      return !home || home.vendorId !== v.id;
    });
    expect(wrong.map((v) => `${v.id} → ${v.homeProductId}`)).toEqual([]);
  });

  it('id가 kebab이고 겹치지 않는다', () => {
    const ids = [...guideVendorIds, ...guideProducts.map((p) => p.id)];
    expect(ids.filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toEqual([]);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('갈래가 셋 중 하나다', () => {
    const roles = ['챗', '업무', '코딩'];
    const bad = guideProducts.filter((p) => !roles.includes(p.role));
    expect(bad.map((p) => `${p.id} — ${p.role}`)).toEqual([]);
  });

  /*
    로고 파일이 없으면 화면에 깨진 이미지가 **조용히** 섭니다. 자격증이 로고 파일
    존재를 검사하는 것과 같은 이유입니다.
  */
  it('로고 파일이 실제로 있다', () => {
    const missing = [...guideVendors, ...guideProducts]
      .map((x) => x.logo)
      .filter((logo, i, all) => all.indexOf(logo) === i)
      .filter((logo) => !existsSync(path.join(ASSETS, logo)));
    expect(missing).toEqual([]);
  });

  /*
    **같은 파일이 한 곳에서는 단색, 다른 곳에서는 아니면 한쪽이 틀린 것입니다.**
    `monochrome`은 그 로고에 색을 입혀도 되는가인데, 기업 데이터와 제품 데이터가
    같은 파일을 따로 들고 있어 갈릴 수 있습니다.
  */
  it('같은 로고 파일의 단색 여부가 두 데이터에서 같다', () => {
    const seen = new Map<string, boolean>();
    const clash: string[] = [];
    for (const x of [...guideVendors, ...guideProducts]) {
      const known = seen.get(x.logo);
      if (known === undefined) seen.set(x.logo, x.monochrome);
      else if (known !== x.monochrome) clash.push(`${x.logo} — ${x.id}`);
    }
    expect(clash).toEqual([]);
  });

  /*
    포인트 색은 **제품에만** 있습니다. 기업 로고는 회사를 고르는 자리라 브랜드색을
    칠하면 칩 넷이 서로 다른 색으로 튀어 「무엇이 켜져 있나」가 오히려 안 보입니다.
  */
  it('제품의 포인트 색이 대비를 검사받는 -text 토큰이다', () => {
    const bad = guideProducts.filter((p) => !/^var\(--[a-z-]+-text\)$/.test(p.accent));
    expect(bad.map((p) => `${p.id} — ${p.accent}`)).toEqual([]);
  });

  it('공식 주소가 https다', () => {
    const urls = [
      ...guideVendors.map((v) => v.officialUrl),
      ...guideProducts.flatMap((p) => [p.officialUrl, p.docsUrl]),
    ].filter((u): u is string => Boolean(u));
    expect(urls.filter((u) => !u.startsWith('https://'))).toEqual([]);
  });

  /*
    **둘째 단추는 `docsUrl`이 있어야 선다.** 이름만 있고 주소가 없으면 누를 곳 없는
    단추가 서거나 조용히 사라진다 — 어느 쪽이 될지는 화면 코드가 정하므로 데이터에서 막는다.
  */
  it('docsUrl이 없으면 docsLabel도 없다', () => {
    const bad = guideProducts.filter((p) => p.docsUrl === null && p.docsLabel !== null);
    expect(bad.map((p) => `${p.id} — ${p.docsLabel}`)).toEqual([]);
  });

  /*
    **API 팁은 API를 부를 수 있는 제품에만 선다.** `apiTips`를 켠 제품에 SDK 표면이
    없으면 그 화면의 독자가 할 수 없는 행동을 권하게 된다 — `audience`를 둔 이유가
    통째로 거꾸로 선다.
  */
  it('API 팁을 세우는 제품에는 SDK 표면이 있다', () => {
    const bad = guideProducts.filter((p) => p.apiTips && !p.surfaces.includes('SDK'));
    expect(bad.map((p) => `${p.id} — ${p.surfaces.join('·')}`)).toEqual([]);
  });

  /*
    **소개 한 줄은 그 제품이 하는 일이다.** 「기본 자리」·「나란히 선다」 같은 레일
    배치 이야기, 「표면」 같은 작업 용어, 「가장 많이 쓰는」 같은 출처 없는 판단,
    「돌리다」·「굴리다」 같은 구어가 한 번씩 들어가 있었다(2026-09-28). 회사 이름은
    레일 머리글과 검색 설명이 지므로 넣지 않는다 — Gemini app의 「Google 앱」만은
    제품이 하는 일 자체라 예외다. 공식 소개가 「You can choose which Google apps to
    connect」로 적는 그 말이고, 앱 이름도 그 페이지가 드는 것(Gmail·Photos·Search·
    YouTube)에서만 고른다.

    구어는 활용형까지 본다 — 「돌려」·「돈다」·「굴려」도 같은 말이다. 「되돌리다」와
    「정도는」은 다른 말이라 뒤보기로 뺀다.
  */
  it('oneLine에 작업 말투와 회사 이름이 없다', () => {
    const allowed: Record<string, string[]> = { 'gemini-app': ['Google 앱'] };
    const banned =
      /자리|표면|가장 많이|(?<!되)돌[리려]|돈다|(?<!정)도는|굴[리려]|Anthropic|OpenAI|Google|앤트로픽|오픈AI|구글/;
    const bad = guideProducts.filter((p) => {
      const text = (allowed[p.id] ?? []).reduce((t, ok) => t.replaceAll(ok, ''), p.oneLine);
      return banned.test(text);
    });
    expect(bad.map((p) => `${p.id}: ${p.oneLine}`)).toEqual([]);
  });
});
