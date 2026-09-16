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

  it('포인트 색이 대비를 검사받는 -text 토큰이다', () => {
    const bad = [...guideVendors, ...guideProducts].filter(
      (x) => !/^var\(--[a-z-]+-text\)$/.test(x.accent),
    );
    expect(bad.map((x) => `${x.id} — ${x.accent}`)).toEqual([]);
  });

  it('공식 주소가 https다', () => {
    const urls = [
      ...guideVendors.map((v) => v.officialUrl),
      ...guideProducts.flatMap((p) => [p.officialUrl, p.docsUrl]),
    ].filter((u): u is string => Boolean(u));
    expect(urls.filter((u) => !u.startsWith('https://'))).toEqual([]);
  });
});
