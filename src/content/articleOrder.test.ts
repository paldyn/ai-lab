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
