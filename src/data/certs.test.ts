import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { certMark, certs } from './certs';
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

  /*
    난이도는 우리가 매긴 값이라 시행처가 검사해 주지 않습니다. 최소한 `level`과
    거꾸로 가지는 않는지, 다섯 눈금을 실제로 쓰는지는 여기서 봅니다 — 전부 3에
    몰리면 별 다섯 개를 그리는 의미가 없습니다.
  */
  it('난이도가 1~5 사이의 반 칸 단위다', () => {
    const odd = certs.filter(
      (cert) => !Number.isInteger(cert.difficulty * 2) || cert.difficulty < 1 || cert.difficulty > 5,
    );
    expect(odd.map((cert) => `${cert.id}: ${cert.difficulty}`)).toEqual([]);
  });

  /*
    칸이 겹칩니다. 중급이 2까지 내려오는 자리가 실제로 있어서입니다 —
    NVIDIA NCA-GENL은 어소시에이트 등급이지만 선행 자격이 없고 객관식 1시간이라,
    실무 6개월을 권하는 같은 등급의 Databricks 시험과 무게가 다릅니다. 등급과
    난이도가 다른 것을 재기 때문에 생기는 차이고, 별을 두는 이유이기도 합니다.
    여기서 막으려는 것은 입문이 고급보다 세지는 뒤집힘입니다.
  */
  it('난이도가 등급과 어긋나지 않는다', () => {
    const band: Record<string, [number, number]> = { 입문: [1, 2], 중급: [2, 4], 고급: [4, 5] };
    const off = certs.filter((cert) => {
      const [min, max] = band[cert.level];
      return cert.difficulty < min || cert.difficulty > max;
    });
    expect(off.map((cert) => `${cert.id}: ${cert.level} / ${cert.difficulty}`)).toEqual([]);
  });

  /* 반 칸은 아래쪽 별에 붙여 셉니다 — 1.5는 별 하나가 온전히 찬 자리입니다. */
  it('다섯 눈금을 모두 쓴다', () => {
    const used = [...new Set(certs.map((cert) => Math.floor(cert.difficulty)))].sort((a, b) => a - b);
    expect(used).toEqual([1, 2, 3, 4, 5]);
  });

  it('난이도 근거가 한 줄로 적혀 있다', () => {
    const bad = certs.filter((cert) => cert.difficultyBasis.trim().length < 10 || cert.difficultyBasis.includes('\n'));
    expect(bad.map((cert) => cert.id)).toEqual([]);
  });

  it('취업 활용도가 1~5 사이의 반 칸 단위다', () => {
    const odd = certs.filter(
      (cert) => !Number.isInteger(cert.employment * 2) || cert.employment < 1 || cert.employment > 5,
    );
    expect(odd.map((cert) => `${cert.id}: ${cert.employment}`)).toEqual([]);
  });

  it('취업 활용도 근거가 한 줄로 적혀 있다', () => {
    const bad = certs.filter(
      (cert) => cert.employmentBasis.trim().length < 10 || cert.employmentBasis.includes('\n'),
    );
    expect(bad.map((cert) => cert.id)).toEqual([]);
  });

  /*
    취업 눈금은 법적 지위가 1차 근거이고 국가기술자격이 그 꼭대기입니다.
    지위가 낮은 자격증이 더 높은 별을 받으면 눈금이 뒤집힌 것입니다.
  */
  it('국가기술자격보다 높은 취업 별은 없다', () => {
    const top = certs.find((cert) => cert.id === 'bigdata-analysis-engineer');
    expect(top).toBeDefined();
    const over = certs.filter((cert) => cert.employment > top!.employment);
    expect(over.map((cert) => `${cert.id}: ${cert.employment}`)).toEqual([]);
  });

  /*
    근거에 채용 공고 건수 같은 수치를 적으면 확인한 날 하루만 맞는 값이 됩니다.
    「1,200건」처럼 세는 표현이 들어왔는지 봅니다.
  */
  it('취업 근거에 검색 건수가 없다', () => {
    const counted = certs.filter((cert) => /[\d,]+\s*(건|개)\b|[\d,]+\s*(건|개)의/.test(cert.employmentBasis));
    expect(counted.map((cert) => cert.id)).toEqual([]);
  });

  /*
    카드에서 시행처를 알려 주는 것이 마크뿐이라, 표에 없는 시행처가 들어오면
    글자 두 개짜리 대체 마크가 조용히 섭니다. 여기서 잡습니다.
  */
  it('시행처마다 마크가 있고 로고 파일이 실제로 있다', () => {
    const missing: string[] = [];
    for (const cert of certs) {
      const mark = certMark(cert.issuer);
      if (!mark.logo && !mark.text) missing.push(`${cert.id}: 마크 없음`);
      if (mark.logo && !existsSync(path.join(process.cwd(), 'public', mark.logo))) {
        missing.push(`${cert.id}: ${mark.logo} 파일 없음`);
      }
      if (mark.label !== cert.issuer && !mark.logo) continue;
    }
    expect(missing).toEqual([]);
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
