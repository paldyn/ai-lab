import { describe, expect, it } from 'vitest';
import { certs } from './certs';
import { articles } from './articles';

/**
 * 자격증 데이터가 지켜야 하는 것.
 *
 * 뉴스와 같은 이유로 검사합니다 — 사람이 손으로 채우는 데이터라 조용히 어긋납니다.
 * 특히 **회차 날짜가 새어 들어오는 것**을 여기서 막습니다. 2026-08-25 조사에서
 * 열 건이 특정 연도 일정표에서 역산한 값을 주기 필드에 적었고, 그런 값은 다음 해에
 * 그대로 틀린 정보가 됩니다.
 */

/** 시행처 도메인. 여기 없는 곳을 공식 링크로 걸면 그건 시행처가 아닙니다. */
const OFFICIAL_HOSTS = [
  'www.dataq.or.kr',
  'www.q-net.or.kr',
  'aice.study',
  'aws.amazon.com',
  'learn.microsoft.com',
  'cloud.google.com',
  'www.nvidia.com',
  'www.databricks.com',
];

describe('자격증 데이터', () => {
  it('id가 겹치지 않는다', () => {
    const ids = certs.map((cert) => cert.id);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it('id는 주소에 그대로 쓰는 kebab-case다', () => {
    const odd = certs.filter((cert) => !/^[a-z0-9-]+$/.test(cert.id));
    expect(odd.map((cert) => cert.id)).toEqual([]);
  });

  it('공식 링크는 시행처 도메인이다', () => {
    const outside = certs.filter((cert) => {
      if (!cert.officialUrl.startsWith('https://')) return true;
      return !OFFICIAL_HOSTS.includes(new URL(cert.officialUrl).host);
    });
    expect(outside.map((cert) => `${cert.id} → ${cert.officialUrl}`)).toEqual([]);
  });

  it('확인한 날짜가 있고 미래가 아니다', () => {
    const today = new Date().toISOString().slice(0, 10);
    const bad = certs.filter((cert) => !/^\d{4}-\d{2}-\d{2}$/.test(cert.verifiedAt) || cert.verifiedAt > today);
    expect(bad.map((cert) => `${cert.id}: ${cert.verifiedAt}`)).toEqual([]);
  });

  /*
    주기 필드에 특정 날짜가 들어오면 그 자리는 해가 바뀌는 순간 거짓이 됩니다.
    「연 4회」·「상시」처럼 시행처가 규칙으로 적은 것만 남기고, 정확한 날짜는
    공식 페이지로 보냅니다. 「10:00」 같은 시각은 규칙이라 통과시킵니다.
  */
  it('시행 주기에 특정 회차 날짜가 없다', () => {
    const dateLike = /\d{4}년\s*\d{1,2}월|\d{1,2}월\s*\d{1,2}일|\d{4}-\d{2}-\d{2}/;
    const leaked = certs.filter((cert) => dateLike.test(cert.cadence));
    expect(leaked.map((cert) => cert.id)).toEqual([]);
  });

  it('과목이 비어 있지 않다', () => {
    expect(certs.filter((cert) => cert.subjects.length === 0).map((cert) => cert.id)).toEqual([]);
  });

  it('무엇을 재는 시험인지 적혀 있다', () => {
    const thin = certs.filter((cert) => cert.whatItMeasures.trim().length < 40);
    expect(thin.map((cert) => cert.id)).toEqual([]);
  });

  /*
    학습 경로는 두 사이트에 걸칩니다. 이쪽 글은 실제로 있는지 확인할 수 있지만
    techblog 글은 저장소가 달라 여기서 못 엽니다 — 형식만 봅니다.
  */
  it('학습 경로의 ai-lab 글이 실제로 있다', () => {
    const slugs = new Set(articles.map((article) => article.slug));
    const missing: string[] = [];
    for (const cert of certs) {
      for (const group of cert.studyPath) {
        for (const item of group.items) {
          if (item.site === 'ailab' && !slugs.has(item.slug)) missing.push(`${cert.id} → ${item.slug}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('학습 경로의 techblog 슬러그가 주소로 쓸 수 있는 꼴이다', () => {
    const odd: string[] = [];
    for (const cert of certs) {
      for (const group of cert.studyPath) {
        for (const item of group.items) {
          if (item.site === 'techblog' && !/^[a-z0-9-]+$/.test(item.slug)) odd.push(`${cert.id} → ${item.slug}`);
        }
      }
    }
    expect(odd).toEqual([]);
  });

  it('학습 경로의 과목 이름이 실제 과목과 맞는다', () => {
    const mismatched: string[] = [];
    for (const cert of certs) {
      const names = new Set(cert.subjects.map((subject) => subject.name));
      for (const group of cert.studyPath) {
        if (!names.has(group.subject)) mismatched.push(`${cert.id} → ${group.subject}`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});
