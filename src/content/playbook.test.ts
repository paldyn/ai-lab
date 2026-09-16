import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../plugins/markdown';
import { playbookClaims } from '../data/playbookClaims';
import { playbookToolIds } from '../data/playbookTools';
import { collapsedLines } from './collapsedLines';

/**
 * 가이드 노트가 지켜야 하는 것.
 *
 * **글(`src/content/articles`)과 다른 서랍입니다.** 사슬도 카테고리도 태그도 없고
 * 6,000자 하한·채우기 큐에 안 걸립니다. 대신 이 서랍만의 규칙이 하나 있습니다 —
 * **본문에 썩는 값을 적지 않는다.** 요금·한도·모델 id는 데이터에만 있고 본문은
 * `:claim[...]`으로 부릅니다. 데이터 한 파일만 늙고 노트는 안 늙게 하는 것이
 * 이 서랍의 존재 이유입니다.
 */
const DIR = path.join(process.cwd(), 'src/content/playbook');
const FILE_NAME = /^(\d{2})-([a-z0-9-]+)\.md$/;

interface Note {
  toolId: string;
  file: string;
  data: Record<string, unknown>;
  content: string;
}

function readNotes(): Note[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dir) =>
      readdirSync(path.join(DIR, dir.name))
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
          const parsed = matter(readFileSync(path.join(DIR, dir.name, file), 'utf8'));
          return { toolId: dir.name, file, data: parsed.data, content: parsed.content };
        }),
    );
}

const notes = readNotes();

describe('가이드 노트', () => {
  it('폴더 이름이 실제 도구 id다', () => {
    const dirs = existsSync(DIR)
      ? readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
      : [];
    expect(dirs.filter((name) => !playbookToolIds.includes(name as never))).toEqual([]);
  });

  it('파일 이름이 NN-슬러그.md 꼴이다', () => {
    const bad = notes.filter((note) => !FILE_NAME.test(note.file));
    expect(bad.map((n) => `${n.toolId}/${n.file}`)).toEqual([]);
  });

  it('frontmatter 다섯 칸이 채워져 있다', () => {
    const bad = notes.filter((note) =>
      ['title', 'description', 'kind', 'pubDate'].some((key) => !note.data[key]),
    );
    expect(bad.map((n) => `${n.toolId}/${n.file}`)).toEqual([]);
  });

  it('description이 30~160자다', () => {
    const bad = notes.filter((note) => {
      const value = String(note.data.description ?? '');
      return value.length < 30 || value.length > 160;
    });
    expect(bad.map((n) => `${n.toolId}/${n.file}`)).toEqual([]);
  });

  it('kind가 다섯 중 하나다', () => {
    const kinds = ['설정', '기법', '한도', '비교', '대질'];
    const bad = notes.filter((note) => !kinds.includes(String(note.data.kind)));
    expect(bad.map((n) => `${n.toolId}/${n.file} — ${String(n.data.kind)}`)).toEqual([]);
  });

  it('claims에 적은 주장이 실재한다', () => {
    const ids = new Set(playbookClaims.map((c) => c.id));
    const orphan = notes.flatMap((note) => {
      const claims = Array.isArray(note.data.claims) ? note.data.claims.map(String) : [];
      return claims.filter((id) => !ids.has(id)).map((id) => `${note.toolId}/${note.file} → ${id}`);
    });
    expect(orphan).toEqual([]);
  });

  /*
    **본문에 썩는 값을 적지 않습니다.** 적는 순간 그 노트가 데이터와 같은 속도로 늙고,
    고칠 자리가 둘이 되며, 둘이 어긋나도 아무도 모릅니다.

    검사 범위를 좁게 잡습니다 — 넓은 정규식은 오탐을 내고, 오탐을 내는 검사는
    내용을 검사에 맞춰 비틀게 만듭니다. 통화 기호가 붙은 수, 「N 토큰」, 소문자
    하이픈 모델 id 셋만 봅니다. 예외는 여기 허용 목록에 이름으로 적습니다.

    **`:claim[...]` 자리는 먼저 걷어냅니다.** 주장 id는 도구 이름으로 시작하므로
    (`claude-max-usage`·`gemini-tiers-are-multipliers`) 모델 id 정규식에 그대로
    걸립니다. 그런데 그 자리는 값을 본문에 박은 곳이 아니라 **데이터에서 부르고 있는
    곳**, 곧 이 검사가 권하는 바로 그 모양입니다. 안 걷어내면 규칙을 지킬수록 검사가
    더 많이 서고, 그러면 사람은 부르기를 줄이게 됩니다.
  */
  const ALLOWED = ['claude-code', 'gemini-api', 'openai-api'];

  it('본문에 요금·토큰 수·모델 id를 적지 않는다', () => {
    const hits = notes.flatMap((note) => {
      const body = note.content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/:claim\[[a-z0-9-]+\]/g, '');
      const found: string[] = [];
      for (const m of body.matchAll(/[$₩]\s?[\d,]+/g)) found.push(m[0]);
      for (const m of body.matchAll(/\d[\d,]*\s*[KM]?\s*토큰/g)) found.push(m[0]);
      for (const m of body.matchAll(/\b(?:gpt|claude|gemini|o\d)-[a-z0-9.-]+\b/gi)) {
        if (!ALLOWED.includes(m[0].toLowerCase())) found.push(m[0]);
      }
      return found.map((text) => `${note.toolId}/${note.file} — 「${text}」는 데이터에 두고 :claim으로 부른다`);
    });
    expect(hits).toEqual([]);
  });

  /*
    아래 둘은 `articles/`에서 이미 도는 검사를 이 서랍에도 겁니다. **원고 검사는
    서랍마다 따로 붙습니다** — `emphasis.test.ts`는 `src/content/articles`만 훑고
    `certPrep.test.ts`가 시험 노트를 따로 맡습니다. 여기를 안 걸면 새 서랍만 무방비로
    열립니다. 둘 다 **원고만 보고는 눈으로 못 잡는** 자리라 특히 그렇습니다.
  */
  it('닫히지 않은 강조가 없다', async () => {
    const left: string[] = [];
    for (const note of notes) {
      const { html } = await renderMarkdown(note.content);
      const prose = html
        .replace(/<pre[\s\S]*?<\/pre>/g, '')
        .replace(/<code[\s\S]*?<\/code>/g, '');
      const found = prose.match(/.{0,40}\*\*.{0,40}/s);
      if (found) left.push(`${note.toolId}/${note.file} — ${found[0]}`);
    }
    expect(left).toEqual([]);
  });

  it('나란히 놓을 줄이 한 줄로 붙지 않는다', () => {
    const found = notes.flatMap((note) =>
      collapsedLines(note.content).map(
        (line) => `${note.toolId}/${note.file}:${line.line} — ${line.text}`,
      ),
    );
    expect(found).toEqual([]);
  });

  /*
    **본문이 부르는 아이디와 frontmatter의 `claims`는 같은 집합이어야 합니다.**
    지금까지 검사는 frontmatter만 봤는데, 정작 화면에 나가는 것은 본문의
    `:claim[...]`입니다 — 오타가 나면 값 대신 아이디가 덩그러니 찍히고, 그건
    `fillClaimRefs`가 일부러 안 지우는 자리라(구멍을 숨기지 않으려고) 여기서 잡아야 합니다.

    반대 방향도 봅니다. frontmatter에만 적고 본문에서 안 부르면, 주장 하나가 만료됐을 때
    「어느 노트가 흔들리는가」를 되짚는 실이 실제보다 굵어집니다.
  */
  it('본문이 부르는 주장이 실재하고 frontmatter와 맞는다', () => {
    const ids = new Set(playbookClaims.map((c) => c.id));
    const problems: string[] = [];

    for (const note of notes) {
      const where = `${note.toolId}/${note.file}`;
      const inBody = new Set(
        [...note.content.matchAll(/:claim\[([a-z0-9][a-z0-9-]*)\]/g)].map((m) => m[1]),
      );
      const declared = new Set(
        Array.isArray(note.data.claims) ? note.data.claims.map(String) : [],
      );

      for (const id of inBody) {
        if (!ids.has(id)) problems.push(`${where} — 본문의 :claim[${id}]가 없는 주장이다`);
        else if (!declared.has(id)) problems.push(`${where} — :claim[${id}]를 부르는데 claims에 없다`);
      }
      for (const id of declared) {
        if (!inBody.has(id)) problems.push(`${where} — claims의 ${id}를 본문에서 안 부른다`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('내부 링크가 실제로 있는 곳을 가리킨다', () => {
    const paths = new Set(notes.map((n) => `/playbook/${n.toolId}/${n.file.replace(/\.md$/, '')}`));
    const broken = notes.flatMap((note) =>
      [...note.content.matchAll(/\]\((\/playbook\/[^)]+)\)/g)]
        .map((m) => m[1])
        .filter((target) => !paths.has(target))
        .map((target) => `${note.toolId}/${note.file} → ${target}`),
    );
    expect(broken).toEqual([]);
  });
});
