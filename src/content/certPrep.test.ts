import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { certs } from '../data/certs';
import { articles } from '../data/articles';
import { collapsedLines } from './collapsedLines';

/**
 * 자격증 시험 노트가 지켜야 하는 것.
 *
 * 시험 노트는 글(`src/content/articles`)과 다른 서랍에 살고 다른 규칙을 씁니다 —
 * 카테고리도 사슬도 없고, **폴더 이름이 자격증 id이며 파일 이름 앞 숫자가 차례**입니다.
 * 그 둘이 어긋나면 글이 아무 목록에도 안 나오거나 순서가 뒤엉키는데, 화면에는
 * 아무 표시도 안 납니다. 여기서 잡습니다.
 */
const DIR = path.join(process.cwd(), 'src/content/certs');
const FILE_NAME = /^(\d{2})-([a-z0-9-]+)\.md$/;

interface Note {
  certId: string;
  file: string;
  order: number;
  slug: string;
  data: Record<string, unknown>;
  content: string;
}

function readNotes(): Note[] {
  if (!existsSync(DIR)) return [];

  const notes: Note[] = [];
  for (const certId of readdirSync(DIR)) {
    const dir = path.join(DIR, certId);
    if (!statSync(dir).isDirectory()) continue;

    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const matched = FILE_NAME.exec(file);
      const { data, content } = matter(readFileSync(path.join(dir, file), 'utf8'));
      notes.push({
        certId,
        file,
        order: matched ? Number(matched[1]) : Number.NaN,
        slug: matched ? `${matched[1]}-${matched[2]}` : file.replace(/\.md$/, ''),
        data,
        content,
      });
    }
  }
  return notes;
}

const notes = readNotes();
const certIds = new Set(certs.map((cert) => cert.id));

describe('자격증 시험 노트', () => {
  it('폴더 이름이 실제 자격증 id다', () => {
    const orphans = notes.filter((note) => !certIds.has(note.certId));
    expect(orphans.map((note) => `${note.certId}/${note.file}`)).toEqual([]);
  });

  /*
    파일 이름이 곧 주소이고 앞 숫자가 차례입니다. frontmatter에 순서를 따로 두지
    않는 이유는 폴더를 열었을 때 순서가 보여야 하기 때문입니다.
  */
  it('파일 이름이 NN-슬러그.md 꼴이다', () => {
    const odd = notes.filter((note) => !FILE_NAME.test(note.file));
    expect(odd.map((note) => `${note.certId}/${note.file}`)).toEqual([]);
  });

  it('한 자격증 안에서 번호가 겹치지 않는다', () => {
    const seen = new Map<string, number>();
    const clashes: string[] = [];
    for (const note of notes) {
      const key = `${note.certId}/${note.order}`;
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count > 1) clashes.push(key);
    }
    expect(clashes).toEqual([]);
  });

  it('frontmatter 네 칸이 채워져 있다', () => {
    const missing: string[] = [];
    for (const note of notes) {
      for (const field of ['title', 'description', 'kind', 'pubDate']) {
        if (!note.data[field]) missing.push(`${note.certId}/${note.file}: ${field}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('kind가 개념 아니면 문제다', () => {
    const odd = notes.filter((note) => !['개념', '문제'].includes(String(note.data.kind)));
    expect(odd.map((note) => `${note.certId}/${note.file}: ${String(note.data.kind)}`)).toEqual([]);
  });

  /* 목록에 그대로 나가는 줄입니다. 너무 짧으면 고르는 데 못 쓰고 너무 길면 잘립니다. */
  it('description이 30~160자다', () => {
    const odd = notes.filter((note) => {
      const length = String(note.data.description).length;
      return length < 30 || length > 160;
    });
    expect(
      odd.map((note) => `${note.certId}/${note.file}: ${String(note.data.description).length}자`),
    ).toEqual([]);
  });

  /* 제목은 frontmatter가 들고 있습니다. 본문의 `#`은 제목이 둘이 되는 것입니다. */
  it('본문에 h1을 쓰지 않는다', () => {
    const odd = notes.filter((note) => /^# /m.test(note.content));
    expect(odd.map((note) => `${note.certId}/${note.file}`)).toEqual([]);
  });

  it('내부 링크가 실제로 있는 곳을 가리킨다', () => {
    const slugs = new Set(articles.map((article) => article.slug));
    const prepPaths = new Set(notes.map((note) => `/learn/certs/${note.certId}/${note.slug}`));
    const broken: string[] = [];

    for (const note of notes) {
      for (const match of note.content.matchAll(/\]\((\/[^)\s]+)\)/g)) {
        const href = match[1];
        if (href.startsWith('/articles/')) {
          if (!slugs.has(href.slice('/articles/'.length))) broken.push(`${note.file} → ${href}`);
        } else if (href.startsWith('/learn/certs/')) {
          const rest = href.slice('/learn/certs/'.length);
          const known = certIds.has(rest) || prepPaths.has(href);
          if (!known) broken.push(`${note.file} → ${href}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  /*
    **기출문제를 그대로 옮기지 않습니다.** 시행처 저작물이라 전재가 됩니다.
    출제 범위와 유형을 보고 직접 만든 문제만 싣고, 「N회 기출」 같은 표기도
    쓰지 않습니다 — 옮겨 온 것처럼 읽히는 순간 그 자체가 문제입니다.
  */
  it('기출 표기를 쓰지 않는다', () => {
    const flagged = notes.filter((note) => /\d+\s*회\s*기출|기출\s*문제\s*(복원|그대로)/.test(note.content));
    expect(flagged.map((note) => `${note.certId}/${note.file}`)).toEqual([]);
  });

  /*
    **출제 빈도를 단정하지 않습니다.** 기출을 옮기지 않으니 「자주 나온다」·「단골」을
    받칠 근거가 없습니다. 2026-10-10에 열세 폴더에서 이런 문장 삼백여 곳을 걷어냈습니다 —
    루틴 지시서가 「출제 경향은 절의 마지막 문단에 녹인다」고만 적어 두어 빈도 단정이
    그 자리를 채웠습니다. 시행처 문서로 확인되는 것(문항 수·배점·영역 비중·예시 문항)은
    빈도가 아니라 통과합니다.

    잡는 꼴은 시험 맥락이 분명한 것만입니다. 「cp949가 자주 나옵니다」나 「매번 다른 답이
    나옵니다」는 데이터·모델 이야기라 걸리면 안 되므로 「나온다」만으로는 잡지 않습니다.
  */
  it('출제 빈도를 단정하지 않는다', () => {
    const FREQUENCY =
      /단골|빈출|출제 빈도|(문항|문제|출제|시험)[^.\n]{0,20}(자주|잘 나오지|매번|매회|빈번)|(자주|매번|매회|빈번하게|가장 많이)[^.\n]{0,12}(출제|묻습니다|묻는다|물어|나오는 문항)/;
    const flagged = notes.flatMap((note) =>
      note.content
        .replace(/```[\s\S]*?```/g, '')
        .split('\n')
        .flatMap((line, index) => {
          const hit = FREQUENCY.exec(line);
          return hit ? [`${note.certId}/${note.file}:${index + 1} ${hit[0]}`] : [];
        }),
    );
    expect(flagged).toEqual([]);
  });

  /*
    개념 노트(01~79)의 뼈대는 **절 4~7, 절마다 소절 2~4**입니다(CERT-PREP-ROUTINE.md
    STEP 3). 마지막 「연습 문제」 절은 소절 없이 서므로 셈에서 뺍니다. 규칙(2026-09-07)
    전에 쓴 노트 34편이 절만 늘어놓은 평평한 목차로 남아 있었고 아무 검사도 그걸
    못 봤습니다(2026-10-10에 맞췄다). 총정리(80~89)와 모의고사(90~)는 꼴이 달라 뺍니다.
  */
  it('개념 노트의 뼈대가 절 4~7, 절마다 소절 2~4다', () => {
    const flagged = notes
      .filter((note) => note.order >= 1 && note.order <= 79)
      .flatMap((note) => {
        const body = note.content.replace(/```[\s\S]*?```/g, '');
        const sections = body
          .split(/^## /m)
          .slice(1)
          .filter((section) => !section.startsWith('연습 문제'));
        const subsections = sections.map((section) => (section.match(/^### /gm) ?? []).length);
        const ok =
          sections.length >= 4 && sections.length <= 7 && subsections.every((count) => count >= 2 && count <= 4);
        return ok ? [] : [`${note.certId}/${note.file}: 절 ${sections.length} · 소절 ${subsections.join(',')}`];
      });
    expect(flagged).toEqual([]);
  });

  /*
    문단 안의 홑 줄바꿈은 공백이 됩니다 — 객관식 보기를 역슬래시 없이 줄만 나눠 적으면
    네 보기가 한 줄로 이어 붙습니다. 원고에서는 네 줄로 보여 눈으로는 안 잡힙니다.
  */
  it('나란한 줄이 한 줄로 붙지 않는다', () => {
    const flagged = notes.flatMap((note) =>
      collapsedLines(note.content).map((hit) => `${note.certId}/${note.file}:${hit.line} ${hit.text.slice(0, 40)}`),
    );
    expect(flagged).toEqual([]);
  });
});
