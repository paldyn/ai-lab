import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { orderArticles } from '../../plugins/article-index';

/**
 * 카드 왼쪽 위 번호는 **본문의 「지난 글」 사슬**이 정합니다. 그 사슬이 성립하는지
 * 여기서 지킵니다.
 *
 * 순서를 사슬에서 뽑는 이유는 `pubDate`만으로는 안 잡히기 때문입니다 — 대량 이관 탓에
 * 하루에 열 편씩 몰려 있어서, 사슬 간선의 89%가 같은 날짜입니다. 날짜는 방향만 확인해
 * 주고 실제로 줄을 세우는 것은 사슬입니다.
 *
 * 그래서 사슬이 조용히 깨지면 번호가 통째로 뒤엉킵니다. 사슬은 frontmatter가 아니라
 * **본문 문단 안의 링크**라 도입부를 손보다 링크가 빠져도 아무 데서도 안 걸립니다.
 * 세 가지를 못 박습니다 — 갈래 없음, 날짜 역행 없음, 카테고리마다 빈틈없는 1..N.
 */
const DIR = path.join(process.cwd(), 'src/content/articles');

const PREV_LINK =
  /\[(?:지난|앞) 글\]\(\/articles\/([a-z0-9-]+)\)|(?:지난|앞) 글:\*\*\s*\[[^\]]*\]\(\/articles\/([a-z0-9-]+)\)/;

interface Raw {
  slug: string;
  categoryId: string;
  publishedAt: string;
  prev?: string;
}

const raw: Raw[] = readdirSync(DIR)
  .filter((file) => file.endsWith('.md'))
  .map((file) => {
    const { data, content } = matter(readFileSync(path.join(DIR, file), 'utf8'));
    const found = content.match(PREV_LINK);
    return {
      slug: path.basename(file, '.md'),
      categoryId: String(data.category),
      publishedAt: String(data.pubDate).slice(0, 10),
      draft: data.draft === true,
      ...(found ? { prev: found[1] ?? found[2] } : {}),
    };
  })
  .filter((entry) => !entry.draft);

// orderArticles가 실제로 보는 모양으로 채웁니다. 순서에 안 쓰는 값은 빈 채로 둡니다.
const entries = raw.map((entry) => ({
  ...entry,
  title: entry.slug,
  summary: '',
  tags: [],
  author: '',
  readTime: 1,
  level: '중급',
  featured: false,
}));

const ordered = orderArticles(entries);

describe('「지난 글」 사슬', () => {
  it('선행 글을 가리키는 링크가 실제로 있는 글을 가리킨다', () => {
    const known = new Set(raw.map((entry) => entry.slug));
    const dangling = raw.filter((entry) => entry.prev && !known.has(entry.prev));
    expect(dangling.map((entry) => `${entry.slug} → ${entry.prev}`)).toEqual([]);
  });

  it('한 글을 둘 이상이 지난 글로 가리키지 않는다', () => {
    const claimed = new Map<string, string[]>();
    for (const entry of raw) {
      if (!entry.prev) continue;
      claimed.set(entry.prev, [...(claimed.get(entry.prev) ?? []), entry.slug]);
    }
    const forked = [...claimed].filter(([, who]) => who.length > 1);
    expect(forked.map(([prev, who]) => `${prev} ← ${who.join(', ')}`)).toEqual([]);
  });

  it('사슬을 따라가면 발행일이 뒤로 가지 않는다', () => {
    const bySlug = new Map(raw.map((entry) => [entry.slug, entry]));
    const backwards = raw.filter((entry) => {
      const prev = entry.prev ? bySlug.get(entry.prev) : undefined;
      return prev !== undefined && prev.publishedAt > entry.publishedAt;
    });
    expect(backwards.map((entry) => `${entry.prev} → ${entry.slug}`)).toEqual([]);
  });
});

/**
 * 글 맨 아래의 이동 칸. 원고에 적는 것은 두 줄뿐이고
 * `plugins/markdown.ts`의 `rehypeEndNav`가 그것을 두 칸짜리 링크로 바꿉니다.
 *
 * **다음 글은 앞 글을 고쳐야 생깁니다.** 새 글이 나가면 그 앞 글에 한 줄을 더해야
 * 하는데, 루틴이 그 일을 빠뜨려도 화면에는 아무 표시가 안 납니다 — 예전에 38편이
 * 그렇게 비어 있었습니다. 사슬과 대조해 여기서 잡습니다.
 */
const FOOTER = (label: string) => new RegExp(`^\\*\\*${label}:\\*\\* \\[[^\\]]*\\]\\(/articles/([a-z0-9-]+)\\)$`, 'm');

describe('글 아래 이동 칸', () => {
  const footerOf = (slug: string, label: string): string | undefined => {
    const body = readFileSync(path.join(DIR, `${slug}.md`), 'utf8');
    const tail = body.slice(body.lastIndexOf('\n---\n'));
    return tail.match(FOOTER(label))?.[1];
  };

  const nextOf = new Map<string, string>();
  for (const entry of raw) {
    if (!entry.prev || nextOf.has(entry.prev)) continue;
    nextOf.set(entry.prev, entry.slug);
  }

  it('앞 글이 있으면 맨 아래에서 그 글을 가리킨다', () => {
    const wrong = raw
      .filter((entry) => entry.prev)
      .filter((entry) => footerOf(entry.slug, '지난 글') !== entry.prev)
      .map((entry) => `${entry.slug}: 사슬은 ${entry.prev}, 맨 아래는 ${footerOf(entry.slug, '지난 글') ?? '없음'}`);
    expect(wrong).toEqual([]);
  });

  /**
   * 순서도 못 박습니다 — 구분선, 감사 문구, 지난 글, 다음 글.
   * 링크가 인사말 위에 있으면 `rehypeEndNav`가 마지막 두 문단을 못 찾아 이동 칸이
   * 아예 안 생깁니다. 그래도 링크 자체는 멀쩡하니 다른 검사에는 안 걸립니다.
   */
  it('이동 링크가 마무리 블록의 맨 끝에 온다', () => {
    const wrong = raw
      .filter((entry) => entry.prev || nextOf.has(entry.slug))
      .filter((entry) => {
        const lines = readFileSync(path.join(DIR, `${entry.slug}.md`), 'utf8').trimEnd().split('\n');
        return !/^\*\*(지난|다음) 글:\*\*/.test(lines[lines.length - 1]);
      })
      .map((entry) => entry.slug);
    expect(wrong).toEqual([]);
  });

  it('뒤 글이 있으면 맨 아래에서 그 글을 가리킨다', () => {
    const wrong = [...nextOf]
      .filter(([slug, next]) => footerOf(slug, '다음 글') !== next)
      .map(([slug, next]) => `${slug}: 사슬은 ${next}, 맨 아래는 ${footerOf(slug, '다음 글') ?? '없음'}`);
    expect(wrong).toEqual([]);
  });
});

describe('카테고리 안 번호', () => {
  it('카테고리마다 1..N을 빈틈없이 한 번씩 쓴다', () => {
    const byCategory = new Map<string, number[]>();
    for (const entry of ordered) {
      byCategory.set(entry.categoryId, [...(byCategory.get(entry.categoryId) ?? []), entry.seq]);
    }

    for (const [category, numbers] of byCategory) {
      const expected = Array.from({ length: numbers.length }, (_, i) => i + 1);
      expect([category, [...numbers].sort((a, b) => a - b)]).toEqual([category, expected]);
    }
  });

  /**
   * 이것이 번호를 붙일 수 있는 조건입니다. 목록은 최신순인데 번호는 오래된 쪽이
   * 1번이므로, 같은 카테고리 안에서는 위에서 아래로 번호가 줄어야 합니다.
   * 예전 정렬(같은 날은 제목 가나다)에서는 321쌍 중 131쌍이 이 규칙을 어겼습니다.
   */
  it('목록을 위에서 아래로 읽으면 번호가 줄어든다', () => {
    const last = new Map<string, number>();
    const wrong: string[] = [];
    for (const entry of ordered) {
      const above = last.get(entry.categoryId);
      if (above !== undefined && above < entry.seq) {
        wrong.push(`${entry.categoryId}: ${above} 다음에 ${entry.seq}(${entry.slug})`);
      }
      last.set(entry.categoryId, entry.seq);
    }
    expect(wrong).toEqual([]);
  });

  it('번호가 커질수록 발행일이 늦거나 같다', () => {
    const bySeq = new Map<string, { seq: number; publishedAt: string }[]>();
    for (const entry of ordered) {
      bySeq.set(entry.categoryId, [...(bySeq.get(entry.categoryId) ?? []), entry]);
    }
    for (const [, list] of bySeq) {
      const sorted = [...list].sort((a, b) => a.seq - b.seq);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i - 1].publishedAt <= sorted[i].publishedAt).toBe(true);
      }
    }
  });
});
